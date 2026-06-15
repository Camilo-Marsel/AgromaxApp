# backend/core/services/nomina_calculator.py

from decimal import Decimal
from django.db import transaction
from django.db.models import Sum
from django.utils import timezone
from core.models import (
    Trabajador, Quincena, RegistroLabor, Nomina, DetalleNomina,
    VariablesNomina, ListaPrecios, Prestamo, CuotaPrestamo, Labor,
    Contrato
)
from datetime import timedelta
from core.utils import get_colombian_holidays, is_colombian_holiday

class NominaCalculator:
    """Servicio para calcular nóminas con todas las reglas de negocio"""
    
    def __init__(self, quincena):
        self.quincena = quincena
        self.variables = self._get_variables_vigentes()
        
    def _get_variables_vigentes(self):
        """Obtener variables de nómina vigentes para la quincena"""
        variables = {}
        fecha_ref = self.quincena.fecha_inicio
        
        for nombre in [VariablesNomina.SALARIO_MINIMO, VariablesNomina.AUXILIO_TRANSPORTE,
                      VariablesNomina.PORCENTAJE_SALUD, VariablesNomina.PORCENTAJE_PENSION]:
            var = VariablesNomina.objects.filter(
                nombre=nombre,
                fecha_inicio_vigencia__lte=fecha_ref
            ).order_by('-fecha_inicio_vigencia').first()
            
            if var:
                variables[nombre] = var.valor
        
        return variables

    def _trabajador_recibe_auxilio(self, trabajador):
        """Verificar si el trabajador recibe auxilio de transporte.
        Chequea tanto el TipoContrato global como el contrato activo individual."""
        if not trabajador.tipo_contrato.aplica_auxilio_transporte:
            return False
        # Si tiene contrato activo, respetar la configuración del contrato
        contrato_activo = Contrato.objects.filter(
            trabajador=trabajador,
            estado=Contrato.ACTIVO
        ).first()
        if contrato_activo is not None:
            return contrato_activo.recibe_auxilio_transporte
        return True

    def calcular_quincena_completa(self, usuario):
        """Calcular nómina para todos los trabajadores que pueden trabajar (no retirados)"""
        from collections import defaultdict
        from django.db.models import Prefetch

        trabajadores = list(
            Trabajador.objects.exclude(estado=Trabajador.RETIRADO)
            .select_related('tipo_contrato', 'finca')
        )

        # 1 sola query para todos los registros de la quincena
        todos_registros = list(
            RegistroLabor.objects.filter(quincena=self.quincena)
            .select_related('labor', 'labor__unidad_medida')
        )
        self._registros_cache = defaultdict(list)
        for reg in todos_registros:
            self._registros_cache[reg.trabajador_id].append(reg)

        # Caché de préstamos: solo IDs por trabajador para saber cuáles existen.
        # Las cuotas y saldo se leen siempre desde DB para evitar datos obsoletos
        # cuando un trabajador anterior ya modificó el mismo préstamo en el mismo lote.
        todos_prestamos = list(
            Prestamo.objects.filter(estado='ACTIVO').only('id', 'trabajador_id')
        )
        self._prestamos_cache = defaultdict(list)
        for prestamo in todos_prestamos:
            self._prestamos_cache[prestamo.trabajador_id].append(prestamo)

        nominas_creadas = []
        for trabajador in trabajadores:
            nomina = self.calcular_trabajador(trabajador, usuario)
            if nomina:
                nominas_creadas.append(nomina)

        return nominas_creadas
    
    @transaction.atomic
    def calcular_trabajador(self, trabajador, usuario):
        """Calcular nómina para un trabajador específico"""

        # Verificar si ya existe nómina
        nomina, created = Nomina.objects.get_or_create(
            trabajador=trabajador,
            quincena=self.quincena,
            defaults={
                'estado': 'PENDIENTE',
                'created_by': usuario
            }
        )

        # Si ya existe y está aprobada, no recalcular automáticamente
        if not created and nomina.estado == 'APROBADA':
            return nomina

        # ===== FIX BUG ADELANTOS DUPLICADOS =====
        # ANTES de eliminar detalles, revertir cuotas de préstamo vinculadas a esta nómina
        self._revertir_cuotas_prestamo(nomina)

        # Limpiar detalles anteriores si es recálculo
        nomina.detalles.all().delete()

        # NUEVO: Verificar si es administrativo
        if trabajador.es_administrativo:
            return self._calcular_administrativo(nomina, trabajador)
        
        # Obtener registros (desde caché si estamos en cálculo masivo)
        if hasattr(self, '_registros_cache'):
            registros = self._registros_cache[trabajador.id]
        else:
            registros = list(
                RegistroLabor.objects.filter(trabajador=trabajador, quincena=self.quincena)
                .select_related('labor', 'labor__unidad_medida')
            )

        # Calcular devengos BASE (sin auxilio de transporte)
        base_deducible = Decimal('0.00')

        # 1. Calcular labores normales (incapacidad médica TAMBIÉN paga deducciones - Decreto 780/2016)
        labores_normal, labores_incapacidad = self._calcular_labores(nomina, registros)
        base_deducible += labores_normal + labores_incapacidad
        
        # 2. Calcular dominicales (solo con contrato)
        if trabajador.tipo_contrato.aplica_dominicales:
            base_deducible += self._calcular_dominicales(nomina, trabajador, registros)
        
        # 3. Calcular festivos (solo con contrato)
        if trabajador.tipo_contrato.nombre == 'CON_CONTRATO':
            base_deducible += self._calcular_festivos(nomina, registros)

        # 4. Ajuste Febrero (2 días básico extra en Q2 de febrero, solo con contrato)
        if trabajador.tipo_contrato.nombre == 'CON_CONTRATO':
            base_deducible += self._calcular_ajuste_febrero(nomina, trabajador)

        # 5. Auxilio de transporte
        auxilio_transporte = Decimal('0.00')
        if self._trabajador_recibe_auxilio(trabajador):
            auxilio_transporte = self._calcular_auxilio_transporte(nomina, registros)
        
        # 5. AJUSTES MANUALES - DEVENGOS ADICIONALES
        devengos_adicionales = nomina.devengos_adicionales or Decimal('0.00')
        if devengos_adicionales > 0 and nomina.descripcion_devengos_adicionales:
            DetalleNomina.objects.create(
                nomina=nomina,
                tipo='DEVENGO',
                concepto='DEVENGO_ADICIONAL',
                descripcion=nomina.descripcion_devengos_adicionales,
                valor_total=devengos_adicionales
            )
        
        # TOTAL DEVENGADO = base + auxilio + adicionales
        total_devengado = base_deducible + auxilio_transporte + devengos_adicionales
        
        # ========== DEDUCCIONES ==========
        total_deducciones = Decimal('0.00')
        
        # 6. Deducciones de ley (solo sobre base SIN auxilio ni adicionales)
        if trabajador.tipo_contrato.aplica_deducciones:
            total_deducciones += self._calcular_deducciones_ley(nomina, base_deducible)
        
        # 7. AJUSTES MANUALES - DEDUCCIONES ADICIONALES
        deducciones_adicionales = nomina.deducciones_adicionales or Decimal('0.00')
        if deducciones_adicionales > 0 and nomina.descripcion_deducciones_adicionales:
            DetalleNomina.objects.create(
                nomina=nomina,
                tipo='DEDUCCION',
                concepto='DEDUCCION_ADICIONAL',
                descripcion=nomina.descripcion_deducciones_adicionales,
                valor_total=deducciones_adicionales
            )
            total_deducciones += deducciones_adicionales
        
        # 8. ADELANTOS DE NÓMINA (AL FINAL)
        total_deducciones += self._calcular_prestamos(nomina, trabajador, total_devengado)
        
        # Calcular totales finales
        total_neto = total_devengado - total_deducciones
        
        # Actualizar nómina
        nomina.total_devengado = total_devengado
        nomina.total_deducciones = total_deducciones
        nomina.total_neto = total_neto
        nomina.estado = 'PENDIENTE'
        nomina.save()

        return nomina

    def _revertir_cuotas_prestamo(self, nomina):
        """
        Revertir cuotas de préstamo que fueron descontadas por esta nómina.
        Esto evita el bug de descuentos duplicados al recalcular.
        """
        # Buscar cuotas vinculadas a esta nómina
        cuotas_a_revertir = CuotaPrestamo.objects.filter(
            nomina=nomina,
            estado='DESCONTADA'
        ).select_related('prestamo')

        for cuota in cuotas_a_revertir:
            prestamo = cuota.prestamo

            # Revertir el saldo del préstamo
            prestamo.saldo_pendiente += cuota.valor_cuota

            # Si el préstamo estaba PAGADO, volver a ACTIVO
            if prestamo.estado == 'PAGADO':
                prestamo.estado = 'ACTIVO'

            prestamo.save()

            # Revertir la cuota a PENDIENTE
            cuota.estado = 'PENDIENTE'
            cuota.nomina = None
            cuota.quincena = None
            cuota.fecha_descuento = None
            cuota.save()

    def _calcular_labores(self, nomina, registros):
        """
        Calcular devengos por labores normales (excluyendo festivos que se calculan aparte).

        Retorna tupla (total_normal, total_incapacidad):
        - total_normal: suma a base_deducible (salud/pensión aplican)
        - total_incapacidad: exento de deducciones de ley (salud/pensión NO aplican)
        """
        total_normal = Decimal('0.00')
        total_incapacidad = Decimal('0.00')

        # Filtrar festivos porque se calculan en _calcular_festivos()
        registros_labores = [r for r in registros if r.labor.nombre != 'Festivo']

        # Agrupar registros por labor
        labores_dict = {}
        for registro in registros_labores:
            labor_id = registro.labor_id
            if labor_id not in labores_dict:
                labores_dict[labor_id] = {
                    'labor': registro.labor,
                    'cantidad': Decimal('0.00'),
                    'registros': []
                }
            labores_dict[labor_id]['cantidad'] += registro.cantidad
            labores_dict[labor_id]['registros'].append(registro)

        # Calcular valor de cada labor
        for labor_id, data in labores_dict.items():
            labor = data['labor']
            cantidad = data['cantidad']

            # Obtener precio vigente
            # Caso especial: Labores con precio dinámico desde "Día Básico"
            if labor.nombre in ('Horas Trabajadas', 'Domingo extra'):
                labor_dia_basico = self._get_labor_dia_basico()
                if labor_dia_basico:
                    precio_dia_basico = self._get_precio_vigente(labor_dia_basico)
                    if precio_dia_basico:
                        if labor.nombre == 'Horas Trabajadas':
                            # Precio por hora = precio_dia / 8 horas
                            precio = (precio_dia_basico / 8).quantize(Decimal('0.01'))
                        elif labor.nombre == 'Domingo extra':
                            # Recargo dominical: 180% del día básico (Ley 2466/2025, Ene-Jun 2026: 80%)
                            precio = (precio_dia_basico * Decimal('1.80')).quantize(Decimal('0.01'))
                    else:
                        precio = None
                else:
                    precio = None
            else:
                precio = self._get_precio_vigente(labor)

            if precio:
                valor_total = cantidad * precio

                # Todas las labores (incluyendo incapacidad) pagan deducciones de ley
                # Decreto 780/2016 Art. 3.2.1.10: durante incapacidad se aporta salud y pensión
                total_normal += valor_total

                # Crear detalle
                DetalleNomina.objects.create(
                    nomina=nomina,
                    tipo='DEVENGO',
                    concepto='LABOR',
                    descripcion=f"{labor.nombre}: {cantidad} {labor.unidad_medida.get_nombre_display()}",
                    labor=labor,
                    cantidad=cantidad,
                    valor_unitario=precio,
                    valor_total=valor_total
                )

        return total_normal, total_incapacidad
    
    def _calcular_administrativo(self, nomina, trabajador):
        """Calcular nómina para trabajador administrativo con salario fijo"""

        # Salario base quincenal
        salario_quincenal = trabajador.salario_quincenal or Decimal('0.00')

        if salario_quincenal <= 0:
            nomina.total_devengado = Decimal('0.00')
            nomina.total_deducciones = Decimal('0.00')
            nomina.total_neto = Decimal('0.00')
            nomina.estado = 'PENDIENTE'
            nomina.save()
            return nomina

        # 1. Devengo: Salario Base
        DetalleNomina.objects.create(
            nomina=nomina,
            tipo='DEVENGO',
            concepto='SALARIO',
            descripcion='Salario Administrativo Quincenal',
            cantidad=1,
            valor_unitario=salario_quincenal,
            valor_total=salario_quincenal
        )

        base_deducible = salario_quincenal

        # 1b. Labores adicionales (si el administrativo tiene registros de labor)
        if hasattr(self, '_registros_cache'):
            registros = self._registros_cache[trabajador.id]
        else:
            registros = list(
                RegistroLabor.objects.filter(trabajador=trabajador, quincena=self.quincena)
                .select_related('labor', 'labor__unidad_medida')
            )

        if registros:
            labores_normal, labores_incapacidad = self._calcular_labores(nomina, registros)
            base_deducible += labores_normal + labores_incapacidad

        # 2. Auxilio de transporte
        auxilio_transporte = Decimal('0.00')
        if self._trabajador_recibe_auxilio(trabajador):
            auxilio_quincenal = self.variables.get(VariablesNomina.AUXILIO_TRANSPORTE, Decimal('0.00'))
            
            if auxilio_quincenal > 0:
                DetalleNomina.objects.create(
                    nomina=nomina,
                    tipo='DEVENGO',
                    concepto='AUXILIO_TRANSPORTE',
                    descripcion='Auxilio de Transporte Quincenal',
                    cantidad=1,
                    valor_unitario=auxilio_quincenal,
                    valor_total=auxilio_quincenal
                )
                auxilio_transporte = auxilio_quincenal
        
        # 3. Ajustes manuales - devengos
        devengos_adicionales = nomina.devengos_adicionales or Decimal('0.00')
        if devengos_adicionales > 0 and nomina.descripcion_devengos_adicionales:
            DetalleNomina.objects.create(
                nomina=nomina,
                tipo='DEVENGO',
                concepto='DEVENGO_ADICIONAL',
                descripcion=nomina.descripcion_devengos_adicionales,
                valor_total=devengos_adicionales
            )
        
        # Calcular total devengado
        total_devengado = base_deducible + auxilio_transporte + devengos_adicionales

        # ========== DEDUCCIONES ==========
        total_deducciones = Decimal('0.00')

        # 4. Deducciones de ley (sobre base SIN auxilio)
        if trabajador.tipo_contrato.aplica_deducciones:
            total_deducciones += self._calcular_deducciones_ley(nomina, base_deducible)
        
        # 5. Ajustes manuales - deducciones
        deducciones_adicionales = nomina.deducciones_adicionales or Decimal('0.00')
        if deducciones_adicionales > 0 and nomina.descripcion_deducciones_adicionales:
            DetalleNomina.objects.create(
                nomina=nomina,
                tipo='DEDUCCION',
                concepto='DEDUCCION_ADICIONAL',
                descripcion=nomina.descripcion_deducciones_adicionales,
                valor_total=deducciones_adicionales
            )
            total_deducciones += deducciones_adicionales
        
        # 6. Adelantos de nómina (al final)
        total_deducciones += self._calcular_prestamos(nomina, trabajador, total_devengado)
        
        # Calcular totales finales
        total_neto = total_devengado - total_deducciones
        
        # Actualizar nómina
        nomina.total_devengado = total_devengado
        nomina.total_deducciones = total_deducciones
        nomina.total_neto = total_neto
        nomina.estado = 'PENDIENTE'
        nomina.save()

        return nomina

    def _calcular_dominicales(self, nomina, trabajador, registros):
        """Calcular dominicales (1 por semana trabajada completa sin ausencias)"""
        total = Decimal('0.00')

        # Obtener precio de día básico
        labor_dia_basico = self._get_labor_dia_basico()
        if not labor_dia_basico:
            return total

        precio_dia_basico = self._get_precio_vigente(labor_dia_basico)
        if not precio_dia_basico:
            return total

        # Obtener semanas de la quincena
        semanas = self._get_semanas_quincena()
        dominicales = 0

        # Obtener registros de la quincena ANTERIOR (para domingos al inicio)
        # Solo si el primer domingo tiene días laborables fuera de esta quincena
        registros_quincena_anterior = None
        if semanas:
            primera_semana = semanas[0]
            if primera_semana['inicio'] < self.quincena.fecha_inicio:
                # La semana del primer domingo empieza antes de la quincena
                # Necesitamos registros de la quincena anterior
                registros_quincena_anterior = RegistroLabor.objects.filter(
                    trabajador=trabajador,
                    fecha__gte=primera_semana['inicio'],
                    fecha__lt=self.quincena.fecha_inicio
                ).select_related('labor')

        for semana in semanas:
            # Verificar que el domingo esté DENTRO de la quincena
            if semana['domingo'] > self.quincena.fecha_fin:
                continue

            # Pasar registros de quincena anterior si la semana cruza quincenas
            regs_anteriores = registros_quincena_anterior if semana['inicio'] < self.quincena.fecha_inicio else None

            if self._tiene_semana_completa(trabajador, semana, registros, regs_anteriores):
                dominicales += 1
        
        if dominicales > 0:
            valor_total = precio_dia_basico * dominicales
            total += valor_total
            
            DetalleNomina.objects.create(
                nomina=nomina,
                tipo='DEVENGO',
                concepto='DOMINICAL',
                descripcion=f"Dominicales: {dominicales}",
                cantidad=dominicales,
                valor_unitario=precio_dia_basico,
                valor_total=valor_total
            )
        
        return total
    
    def _tiene_semana_completa(self, trabajador, semana, registros, registros_quincena_anterior=None):
        """
        Verificar si trabajó toda la semana (lunes a sábado) sin ausencias
        que hagan perder el dominical.

        REGLAS (Art. 173 CST):
        - Ausencia No Justificada: Pierde el dominical (sin justa causa)
        - Permiso No Remunerado: NO pierde el dominical (empleador lo autorizó = justa causa)
        - Incapacidad Médica: NO pierde el dominical (justa causa)
        """
        # Obtener días laborables de la semana (lunes a sábado)
        dias_laborables = []
        current = semana['inicio']

        # Recorrer hasta el sábado (fin de semana['fin'])
        while current <= semana['fin']:
            # 0=lunes, 5=sábado, 6=domingo
            if current.weekday() < 6 and not is_colombian_holiday(current):  # Lunes a sábado no festivos
                dias_laborables.append(current)
            current += timedelta(days=1)

        # Si no hay días laborables, no hay dominical
        if len(dias_laborables) == 0:
            return False

        # Construir diccionario de registros para esta semana
        # Combinar registros de la quincena actual y la anterior (si aplica)
        registros_dict = {}
        for registro in registros:
            if semana['inicio'] <= registro.fecha <= semana['fin']:
                if registro.fecha not in registros_dict:
                    registros_dict[registro.fecha] = []
                registros_dict[registro.fecha].append(registro)

        # Incluir registros de la quincena anterior (para domingos al inicio)
        if registros_quincena_anterior:
            for registro in registros_quincena_anterior:
                if semana['inicio'] <= registro.fecha <= semana['fin']:
                    if registro.fecha not in registros_dict:
                        registros_dict[registro.fecha] = []
                    registros_dict[registro.fecha].append(registro)

        # Verificar cada día laborable
        for dia in dias_laborables:
            if dia not in registros_dict:
                # No hay ningún registro ese día = AUSENCIA no justificada
                return False

            # Solo "Ausencia No Justificada" hace perder el dominical
            registros_del_dia = registros_dict[dia]
            for registro in registros_del_dia:
                if registro.labor.nombre == 'Ausencia No Justificada':
                    # Única labor que hace perder el dominical (sin justa causa)
                    return False

            # Permiso No Remunerado: NO pierde dominical (justa causa, Art. 173 CST)
            # Incapacidad Médica: NO pierde dominical (justa causa)

        return True
    
    def _get_semanas_quincena(self):
        """
        Dividir quincena en semanas (lunes a domingo).
        Solo cuenta semanas cuyo DOMINGO esté dentro de la quincena.
        """
        semanas = []
        current = self.quincena.fecha_inicio
        
        # Recorrer cada día de la quincena
        while current <= self.quincena.fecha_fin:
            # Si es un domingo, verificar si tiene una semana completa ANTES
            if current.weekday() == 6:  # 6 = domingo
                # Calcular el lunes de esa semana
                lunes = current - timedelta(days=6)
                sabado = current - timedelta(days=1)
                
                # Usar el lunes real (no recortar al inicio de quincena)
                # _tiene_semana_completa usará registros_quincena_anterior
                # para verificar días laborables fuera de esta quincena
                semanas.append({
                    'inicio': lunes,
                    'fin': sabado,  # Sábado (no incluir domingo en la verificación)
                    'domingo': current  # El domingo a pagar
                })
            
            current += timedelta(days=1)
        
        return semanas
    
    def _calcular_festivos(self, nomina, registros):
        """Calcular festivos de Colombia dentro de la quincena."""
        total = Decimal('0.00')

        labor_festivo = Labor.objects.filter(nombre='Festivo').first()
        if not labor_festivo:
            return total

        precio = self._get_precio_vigente(labor_festivo)
        if not precio:
            return total

        festivos_quincena = sorted(
            holiday_date
            for holiday_date in get_colombian_holidays(self.quincena.fecha_inicio.year)
            if self.quincena.fecha_inicio <= holiday_date <= self.quincena.fecha_fin
        )

        if not festivos_quincena and self.quincena.fecha_inicio.year != self.quincena.fecha_fin.year:
            festivos_quincena = sorted(
                holiday_date
                for year in {self.quincena.fecha_inicio.year, self.quincena.fecha_fin.year}
                for holiday_date in get_colombian_holidays(year)
                if self.quincena.fecha_inicio <= holiday_date <= self.quincena.fecha_fin
            )

        cantidad = Decimal(str(len(festivos_quincena)))
        if cantidad == 0:
            return total

        valor_total = cantidad * precio
        total += valor_total

        fechas_texto = ', '.join(fecha.strftime('%d/%m/%Y') for fecha in festivos_quincena)
        DetalleNomina.objects.create(
            nomina=nomina,
            tipo='DEVENGO',
            concepto='FESTIVO',
            descripcion=f"Festivos: {fechas_texto}",
            labor=labor_festivo,
            cantidad=cantidad,
            valor_unitario=precio,
            valor_total=valor_total
        )

        return total

    def _calcular_ajuste_febrero(self, nomina, trabajador):
        """
        Pagar 2 días básico extra en la segunda quincena de febrero.
        Solo aplica a trabajadores CON_CONTRATO no administrativos.
        """
        # Solo en Q2 de febrero
        if not (self.quincena.mes == 2 and self.quincena.numero == 2):
            return Decimal('0.00')

        # No aplica a administrativos con salario fijo
        if trabajador.es_administrativo:
            return Decimal('0.00')

        labor_dia_basico = self._get_labor_dia_basico()
        if not labor_dia_basico:
            return Decimal('0.00')

        precio_dia_basico = self._get_precio_vigente(labor_dia_basico)
        if not precio_dia_basico:
            return Decimal('0.00')

        valor_total = precio_dia_basico * 2

        DetalleNomina.objects.create(
            nomina=nomina,
            tipo='DEVENGO',
            concepto='DEVENGO_ADICIONAL',
            descripcion='Ajuste Febrero',
            cantidad=2,
            valor_unitario=precio_dia_basico,
            valor_total=valor_total
        )

        return valor_total

    def _calcular_auxilio_transporte(self, nomina, registros):
        """
        Calcular auxilio de transporte QUINCENAL proporcional a días LABORABLES trabajados.
        Base: $100,000 quincenal completo.

        REGLAS (OPCIÓN B - Proporcional a días laborables):
        - Base de cálculo: días laborables (total días - domingos)
        - Si trabajó todos los días laborables → auxilio completo
        - Si faltó algún día laborable → proporcional
        - Domingos NO cuentan en la base (no afectan el auxilio si no se trabajan)
        - Incapacidad Médica: Solo pierde auxilio de ese día
        - Ausencia No Justificada: Pierde auxilio de ese día + auxilio del domingo de esa semana
        - Permiso No Remunerado: NO pierde el auxilio del domingo (justa causa, Art. 173 CST)
        - Días sin ningún registro: No se cuentan como trabajados
        """
        from collections import defaultdict

        auxilio_quincenal = self.variables.get(VariablesNomina.AUXILIO_TRANSPORTE, Decimal('0.00'))

        if auxilio_quincenal <= 0:
            return Decimal('0.00')

        # Contar días TOTALES de la quincena (incluyendo domingos)
        dias_totales_quincena = (self.quincena.fecha_fin - self.quincena.fecha_inicio).days + 1

        # Contar domingos en la quincena
        domingos_en_quincena = self._contar_domingos_en_quincena()

        # Calcular días LABORABLES (sin domingos) - BASE para el auxilio
        dias_festivos = 0
        current = self.quincena.fecha_inicio
        while current <= self.quincena.fecha_fin:
            if current.weekday() < 6 and is_colombian_holiday(current):
                dias_festivos += 1
            current += timedelta(days=1)

        dias_laborables = dias_totales_quincena - domingos_en_quincena - dias_festivos

        # Agrupar registros por fecha en memoria (evita N+1 dentro del loop)
        registros_por_fecha = defaultdict(list)
        for reg in registros:
            registros_por_fecha[reg.fecha].append(reg)

        dias_con_registro = set(registros_por_fecha.keys())
        dias_incapacidad = {r.fecha for r in registros if r.labor.nombre == 'Incapacidad Médica'}
        dias_ausencia_permiso = {r.fecha for r in registros if r.labor.nombre == 'Ausencia No Justificada'}

        # Calcular días trabajados efectivos (puede ser fraccionario)
        dias_trabajados = Decimal('0.00')

        for fecha in dias_con_registro:
            registros_dia = registros_por_fecha[fecha]
            nombres = {r.labor.nombre for r in registros_dia}
            solo_horas = 'Horas Trabajadas' in nombres and len(nombres) == 1

            if solo_horas:
                total_horas = sum(r.cantidad for r in registros_dia if r.labor.nombre == 'Horas Trabajadas')
                fraccion_dia = min(total_horas / 8, Decimal('1'))
                dias_trabajados += fraccion_dia
            else:
                dias_trabajados += Decimal('1')

        # Redondear a 2 decimales para evitar problemas de precisión
        dias_trabajados = dias_trabajados.quantize(Decimal('0.01'))

        # Calcular días a descontar del auxilio
        dias_descuento = Decimal('0')
        domingos_perdidos = set()

        # 1. Descontar días de INCAPACIDAD (solo ese día)
        dias_descuento += Decimal(len(dias_incapacidad))

        # 2. Descontar días de AUSENCIA/PERMISO + sus domingos
        for fecha in dias_ausencia_permiso:
            # Descontar el día mismo
            dias_descuento += Decimal('1')

            # Encontrar el domingo de esa semana
            domingo = self._get_domingo_de_semana(fecha)

            # Si el domingo está en la quincena y no lo hemos contado
            if (self.quincena.fecha_inicio <= domingo <= self.quincena.fecha_fin
                and domingo not in domingos_perdidos):
                domingos_perdidos.add(domingo)
                dias_descuento += Decimal('1')

        # Calcular días a pagar: días trabajados - descuentos
        dias_a_pagar = dias_trabajados - dias_descuento

        # Si no hay días a pagar, retornar 0
        if dias_a_pagar <= 0:
            return Decimal('0.00')

        # OPCIÓN B: Calcular auxilio proporcional basado en días LABORABLES (sin domingos)
        # Si trabajó todos los días laborables, recibe auxilio completo
        # Si faltó algún día laborable, recibe proporcional
        valor_dia = auxilio_quincenal / dias_laborables
        auxilio_proporcional = (valor_dia * dias_a_pagar).quantize(Decimal('0.01'))

        # Preparar descripción detallada
        descuentos_texto = []
        if len(dias_incapacidad) > 0:
            descuentos_texto.append(f'{len(dias_incapacidad)} incapacidad(es)')
        if len(dias_ausencia_permiso) > 0:
            descuentos_texto.append(f'{len(dias_ausencia_permiso)} ausencia(s)')
        if len(domingos_perdidos) > 0:
            descuentos_texto.append(f'{len(domingos_perdidos)} domingo(s) perdido(s)')

        # TODO: Días mostrados tienen error de lógica - los domingos no se cuentan en dias_con_registro
        # pero sí se incluyen en dias_totales_quincena, lo que hace que siempre falten domingos.
        # Se oculta el conteo de días hasta corregir el cálculo.
        # descripcion = f'Auxilio de Transporte ({dias_a_pagar}/{dias_totales_quincena} días)'
        # if descuentos_texto:
        #     descripcion += f' - Desc: {", ".join(descuentos_texto)}'
        descripcion = 'Auxilio de Transporte'

        DetalleNomina.objects.create(
            nomina=nomina,
            tipo='DEVENGO',
            concepto='AUXILIO_TRANSPORTE',
            descripcion=descripcion,
            cantidad=dias_a_pagar,
            valor_unitario=valor_dia,
            valor_total=auxilio_proporcional
        )

        return auxilio_proporcional

    def _get_domingo_de_semana(self, fecha):
        """Obtener el domingo de la semana a la que pertenece una fecha"""
        dias_hasta_domingo = (6 - fecha.weekday()) % 7
        if dias_hasta_domingo == 0 and fecha.weekday() == 6:
            return fecha
        return fecha + timedelta(days=dias_hasta_domingo if dias_hasta_domingo > 0 else 0)
    
    def _calcular_deducciones_ley(self, nomina, total_devengado):
        """Calcular deducciones de salud y pensión"""
        total = Decimal('0.00')
        
        # Salud
        porcentaje_salud = self.variables.get(VariablesNomina.PORCENTAJE_SALUD, Decimal('4.00'))
        salud = (total_devengado * porcentaje_salud / Decimal('100.00')).quantize(Decimal('0.01'))
        
        if salud > 0:
            DetalleNomina.objects.create(
                nomina=nomina,
                tipo='DEDUCCION',
                concepto='SALUD',
                descripcion=f'Salud ({porcentaje_salud}%)',
                valor_total=salud
            )
            total += salud
        
        # Pensión
        porcentaje_pension = self.variables.get(VariablesNomina.PORCENTAJE_PENSION, Decimal('4.00'))
        pension = (total_devengado * porcentaje_pension / Decimal('100.00')).quantize(Decimal('0.01'))
        
        if pension > 0:
            DetalleNomina.objects.create(
                nomina=nomina,
                tipo='DEDUCCION',
                concepto='PENSION',
                descripcion=f'Pensión ({porcentaje_pension}%)',
                valor_total=pension
            )
            total += pension
        
        return total
    
    def _calcular_prestamos(self, nomina, trabajador, total_devengado_actual):
        """
        Calcular descuentos de adelantos de nómina pendientes.
        El descuento NO puede exceder el total devengado de la quincena.
        """
        total = Decimal('0.00')
        
        # Obtener préstamos activos (desde caché si estamos en cálculo masivo)
        if hasattr(self, '_prestamos_cache'):
            prestamos = self._prestamos_cache.get(trabajador.id, [])
        else:
            prestamos = list(
                Prestamo.objects.filter(trabajador=trabajador, estado='ACTIVO')
            )

        for prestamo in prestamos:
            if prestamo.tipo_pago == 'UNICO':
                # Para pago único siempre leer saldo real desde DB (evita corrupción por caché)
                saldo_real = Prestamo.objects.values_list('saldo_pendiente', flat=True).get(pk=prestamo.pk)
                valor_descuento = min(saldo_real, total_devengado_actual - total)

                if valor_descuento > 0:
                    DetalleNomina.objects.create(
                        nomina=nomina,
                        tipo='DEDUCCION',
                        concepto='PRESTAMO',
                        descripcion=f'Adelanto #{prestamo.id} (Pago Único)',
                        valor_total=valor_descuento
                    )
                    nuevo_saldo = saldo_real - valor_descuento
                    Prestamo.objects.filter(pk=prestamo.pk).update(
                        saldo_pendiente=nuevo_saldo,
                        estado='PAGADO' if nuevo_saldo <= 0 else 'ACTIVO',
                    )
                    total += valor_descuento

            else:  # CUOTAS
                # Siempre consultar la DB para obtener la cuota real pendiente,
                # ignorando el caché que puede estar desactualizado tras un recálculo.
                cuota = CuotaPrestamo.objects.filter(
                    prestamo=prestamo,
                    estado='PENDIENTE'
                ).order_by('numero_cuota').first()

                if cuota:
                    valor_descuento = min(cuota.valor_cuota, total_devengado_actual - total)

                    if valor_descuento > 0:
                        DetalleNomina.objects.create(
                            nomina=nomina,
                            tipo='DEDUCCION',
                            concepto='PRESTAMO',
                            descripcion=f'Adelanto #{prestamo.id} - Cuota {cuota.numero_cuota}/{prestamo.numero_cuotas}',
                            valor_total=valor_descuento
                        )

                        if valor_descuento >= cuota.valor_cuota:
                            # Cuota completa: marcarla y recalcular saldo desde cuotas reales
                            cuota.quincena = self.quincena
                            cuota.nomina = nomina
                            cuota.fecha_descuento = timezone.now().date()
                            cuota.estado = 'DESCONTADA'
                            cuota.save()

                            # saldo = suma de cuotas aún pendientes (excluye la que acabamos de cerrar)
                            saldo_real = CuotaPrestamo.objects.filter(
                                prestamo=prestamo,
                                estado='PENDIENTE'
                            ).aggregate(total=Sum('valor_cuota'))['total'] or Decimal('0')

                            Prestamo.objects.filter(pk=prestamo.pk).update(
                                saldo_pendiente=saldo_real,
                                estado='PAGADO' if saldo_real <= 0 else 'ACTIVO',
                            )
                        else:
                            # Abono parcial: reducir valor de cuota y recalcular saldo
                            cuota.valor_cuota -= valor_descuento
                            cuota.save()

                            saldo_real = CuotaPrestamo.objects.filter(
                                prestamo=prestamo,
                                estado='PENDIENTE'
                            ).aggregate(total=Sum('valor_cuota'))['total'] or Decimal('0')

                            Prestamo.objects.filter(pk=prestamo.pk).update(
                                saldo_pendiente=saldo_real,
                            )

                        total += valor_descuento

        return total
    
    def _get_precio_vigente(self, labor):
        """
        Obtener precio vigente de una labor para la quincena.

        Busca el precio donde:
        - La fecha de inicio sea <= fecha inicio de quincena
        - La fecha de fin sea NULL (abierto) O >= fecha inicio de quincena

        Retorna el más reciente que cumpla las condiciones.
        """
        from django.db.models import Q

        precio = ListaPrecios.objects.filter(
            Q(labor=labor) &
            Q(fecha_inicio_vigencia__lte=self.quincena.fecha_inicio) &
            (Q(fecha_fin_vigencia__isnull=True) | Q(fecha_fin_vigencia__gte=self.quincena.fecha_inicio))
        ).order_by('-fecha_inicio_vigencia').first()

        return precio.precio if precio else None
    
    def _get_labor_dia_basico(self):
        """Obtener labor de día básico"""
        return Labor.objects.filter(codigo='LAB001').first()

    def _contar_domingos_en_quincena(self):
        """Contar cuántos domingos hay en la quincena"""
        domingos = 0
        fecha_actual = self.quincena.fecha_inicio

        while fecha_actual <= self.quincena.fecha_fin:
            if fecha_actual.weekday() == 6:  # 6 = Domingo
                domingos += 1
            fecha_actual += timedelta(days=1)

        return domingos
