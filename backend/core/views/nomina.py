# backend/core/views/nomina.py - v2 2026-05-30

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.filters import SearchFilter, OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend
from django.db import transaction
from django.http import FileResponse
from django.utils import timezone

from ..models import (
    VariablesNomina, Quincena, RegistroLabor, Nomina, Trabajador, AuditoriaLog,
)
from ..serializers import (
    VariablesNominaSerializer, QuincenaSerializer, RegistroLaborSerializer,
    RegistroLaborCreateUpdateSerializer, NominaSerializer, AuditoriaLogSerializer,
)
from ..permissions import CanModifyData, FincaFilterMixin, IsAdministrador
from ..filters import NominaFilter, RegistroLaborFilter
from ..services.nomina_calculator import NominaCalculator
from ..services.pdf_generator import generar_comprobante_pdf
from ..services.excel_generator import ExcelGenerator
IsSuperAdmin = IsAdministrador


class VariablesNominaViewSet(viewsets.ModelViewSet):
    """ViewSet para gestión de variables de nómina"""
    queryset = VariablesNomina.objects.all()
    serializer_class = VariablesNominaSerializer
    permission_classes = [CanModifyData]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['nombre']
    ordering = ['-fecha_inicio_vigencia']

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=False, methods=['get'])
    def vigentes(self, request):
        """Obtener todas las variables (vigentes o no) para la página de configuración"""
        hoy = timezone.now().date()

        NOMBRES_DISPLAY = {
            VariablesNomina.SALARIO_MINIMO: 'Salario Mínimo',
            VariablesNomina.AUXILIO_TRANSPORTE: 'Auxilio de Transporte',
            VariablesNomina.PORCENTAJE_SALUD: 'Porcentaje Salud',
            VariablesNomina.PORCENTAJE_PENSION: 'Porcentaje Pensión',
        }

        variables_resultado = {}
        for nombre_var in [
            VariablesNomina.SALARIO_MINIMO,
            VariablesNomina.AUXILIO_TRANSPORTE,
            VariablesNomina.PORCENTAJE_SALUD,
            VariablesNomina.PORCENTAJE_PENSION,
        ]:
            variable = VariablesNomina.objects.filter(
                nombre=nombre_var,
                fecha_inicio_vigencia__lte=hoy,
                fecha_fin_vigencia__isnull=True
            ).first()
            if variable:
                variables_resultado[nombre_var] = {
                    'id': variable.id,
                    'nombre': variable.get_nombre_display(),
                    'valor': str(variable.valor),
                    'fecha_inicio_vigencia': variable.fecha_inicio_vigencia,
                    'tiene_vigente': True,
                }
            else:
                variables_resultado[nombre_var] = {
                    'id': None,
                    'nombre': NOMBRES_DISPLAY.get(nombre_var, nombre_var),
                    'valor': None,
                    'fecha_inicio_vigencia': None,
                    'tiene_vigente': False,
                }
        return Response(variables_resultado)

    @action(detail=False, methods=['post'])
    def actualizar_variable(self, request):
        """Crear nueva versión de una variable (cierra la anterior)"""
        nombre = request.data.get('nombre')
        valor = request.data.get('valor')
        fecha_inicio = request.data.get('fecha_inicio_vigencia')
        descripcion = request.data.get('descripcion', '')

        if not all([nombre, valor, fecha_inicio]):
            return Response(
                {'error': 'Faltan campos requeridos'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            VariablesNomina.objects.filter(
                nombre=nombre,
                fecha_fin_vigencia__isnull=True
            ).update(fecha_fin_vigencia=fecha_inicio)

            nueva_variable = VariablesNomina.objects.create(
                nombre=nombre,
                valor=valor,
                fecha_inicio_vigencia=fecha_inicio,
                descripcion=descripcion,
                created_by=request.user
            )
            serializer = self.get_serializer(nueva_variable)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except Exception:
            import logging
            logging.getLogger(__name__).exception("Error en actualizar_variable")
            return Response(
                {'error': 'Error al actualizar la variable. Intente de nuevo.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class QuincenaViewSet(viewsets.ModelViewSet):
    """ViewSet para gestión de quincenas"""
    queryset = Quincena.objects.all()
    serializer_class = QuincenaSerializer
    permission_classes = [CanModifyData]
    filter_backends = [OrderingFilter]
    ordering = ['-año', '-mes', '-numero']

    @action(detail=False, methods=['post'])
    def crear_actual(self, request):
        """Crear quincena actual si no existe"""
        from datetime import timedelta

        hoy = timezone.now().date()
        año = hoy.year
        mes = hoy.month

        if hoy.day <= 15:
            numero = 1
            fecha_inicio = hoy.replace(day=1)
            fecha_fin = hoy.replace(day=15)
        else:
            numero = 2
            fecha_inicio = hoy.replace(day=16)
            if mes == 12:
                fecha_fin = hoy.replace(day=31)
            else:
                fecha_fin = (hoy.replace(month=mes + 1, day=1) - timedelta(days=1))

        fecha_cierre_registro = fecha_fin + timedelta(days=15)

        quincena, created = Quincena.objects.get_or_create(
            año=año, mes=mes, numero=numero,
            defaults={
                'fecha_inicio': fecha_inicio,
                'fecha_fin': fecha_fin,
                'fecha_cierre_registro': fecha_cierre_registro,
                'estado': 'ABIERTA'
            }
        )

        serializer = self.get_serializer(quincena)

        if created:
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        else:
            return Response(
                {'message': 'La quincena actual ya existe', 'data': serializer.data},
                status=status.HTTP_200_OK
            )

    @action(detail=True, methods=['post'])
    def cerrar(self, request, pk=None):
        """Cerrar quincena para preparar nómina"""
        quincena = self.get_object()
        quincena.estado = 'EN_CALCULO'
        quincena.save()
        serializer = self.get_serializer(quincena)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def estadisticas(self, request, pk=None):
        """Obtener estadísticas de registros de la quincena"""
        quincena = self.get_object()

        trabajadores_activos = Trabajador.objects.exclude(estado=Trabajador.RETIRADO).count()
        trabajadores_con_registros = RegistroLabor.objects.filter(
            quincena=quincena
        ).values('trabajador').distinct().count()
        total_registros = RegistroLabor.objects.filter(quincena=quincena).count()
        trabajadores_sin_registros = trabajadores_activos - trabajadores_con_registros

        return Response({
            'trabajadores_activos': trabajadores_activos,
            'trabajadores_con_registros': trabajadores_con_registros,
            'trabajadores_sin_registros': trabajadores_sin_registros,
            'total_registros': total_registros,
            'porcentaje_cobertura': round(
                (trabajadores_con_registros / trabajadores_activos * 100) if trabajadores_activos > 0 else 0,
                2
            )
        })


class RegistroLaborViewSet(FincaFilterMixin, viewsets.ModelViewSet):
    """ViewSet para gestión de registros de labores"""
    queryset = RegistroLabor.objects.all()
    permission_classes = [CanModifyData]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_class = RegistroLaborFilter
    ordering = ['-fecha', 'trabajador']
    finca_field = 'trabajador__finca'

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return RegistroLaborCreateUpdateSerializer
        return RegistroLaborSerializer

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)

    def perform_destroy(self, instance):
        from ..models import AuditoriaLog
        xff = self.request.META.get('HTTP_X_FORWARDED_FOR')
        ip = xff.split(',')[0].strip() if xff else self.request.META.get('REMOTE_ADDR', '0.0.0.0')
        AuditoriaLog.objects.create(
            usuario=self.request.user,
            accion='DELETE',
            tabla_afectada='RegistroLabor',
            registro_id=instance.id,
            datos_anteriores={
                'trabajador_id': instance.trabajador_id,
                'trabajador': str(instance.trabajador),
                'labor': instance.labor.nombre,
                'fecha': str(instance.fecha),
                'cantidad': str(instance.cantidad),
                'quincena': str(instance.quincena),
                'observaciones': instance.observaciones or '',
            },
            ip_address=ip,
        )
        instance.delete()

    @action(detail=False, methods=['get'])
    def resumen(self, request):
        """Resumen de registros de un trabajador en una quincena: total días y totales por labor."""
        from collections import defaultdict
        from decimal import Decimal

        trabajador_id = request.query_params.get('trabajador')
        quincena_id = request.query_params.get('quincena')

        if not trabajador_id or not quincena_id:
            return Response(
                {'error': 'Se requieren los parámetros trabajador y quincena'},
                status=status.HTTP_400_BAD_REQUEST
            )

        registros = RegistroLabor.objects.filter(
            trabajador_id=trabajador_id,
            quincena_id=quincena_id
        ).select_related('labor', 'labor__unidad_medida')

        por_labor = {}
        dias_con_registro = set()

        for r in registros:
            lid = r.labor_id
            if lid not in por_labor:
                por_labor[lid] = {
                    'labor': r.labor.nombre,
                    'cantidad': Decimal('0'),
                    'unidad': r.labor.unidad_medida.get_nombre_display() if r.labor.unidad_medida else '',
                }
            por_labor[lid]['cantidad'] += r.cantidad
            dias_con_registro.add(r.fecha)

        return Response({
            'total_dias': len(dias_con_registro),
            'total_registros': registros.count(),
            'por_labor': [
                {
                    'labor': d['labor'],
                    'cantidad': str(d['cantidad']),
                    'unidad': d['unidad'],
                }
                for d in por_labor.values()
            ],
        })

    @action(detail=False, methods=['post'])
    def crear_multiples(self, request):
        """Crear múltiples registros de labor para labores tipo DÍA con múltiples fechas.

        - Sin cantidad_total: cada registro tiene cantidad=1
        - Con cantidad_total: la cantidad se reparte equitativamente entre los días válidos
        """
        from datetime import datetime as dt
        from decimal import Decimal, ROUND_DOWN
        from ..models import Labor

        trabajador_id = request.data.get('trabajador')
        labor_id = request.data.get('labor')
        fechas = request.data.get('fechas', [])
        quincena_id = request.data.get('quincena')
        observaciones = request.data.get('observaciones', '')
        cantidad_total = request.data.get('cantidad_total')

        if not all([trabajador_id, labor_id, fechas, quincena_id]):
            return Response(
                {'error': 'Faltan campos requeridos'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            from ..models import Trabajador as TrabajadorModel, Labor as LaborModel, Quincena as QuincenaModel
            trabajador = TrabajadorModel.objects.get(id=trabajador_id)
            labor = LaborModel.objects.get(id=labor_id)
            quincena = QuincenaModel.objects.get(id=quincena_id)
        except Exception:
            return Response(
                {'error': 'Trabajador, Labor o Quincena no encontrados'},
                status=status.HTTP_404_NOT_FOUND
            )

        fechas_validas = []
        errores = []

        for fecha_str in fechas:
            fecha = dt.strptime(fecha_str, '%Y-%m-%d').date()

            if fecha.weekday() == 6:
                errores.append(f"{fecha_str}: No se puede registrar en domingo")
                continue

            if RegistroLabor.objects.filter(
                trabajador=trabajador, fecha=fecha, quincena=quincena
            ).exists():
                errores.append(f"{fecha_str}: Ya existe un registro para este día")
                continue

            fechas_validas.append(fecha)

        if not fechas_validas:
            return Response({
                'message': 'No se crearon registros',
                'registros': [],
                'errores': errores
            }, status=status.HTTP_400_BAD_REQUEST)

        if cantidad_total is not None:
            total = Decimal(str(cantidad_total))
            n = len(fechas_validas)
            cantidad_por_dia = (total / n).quantize(Decimal('0.0001'), rounding=ROUND_DOWN)
            residuo = total - (cantidad_por_dia * n)
        else:
            cantidad_por_dia = Decimal('1')
            residuo = Decimal('0')

        registros_creados = []
        for i, fecha in enumerate(fechas_validas):
            cantidad = cantidad_por_dia
            if i == len(fechas_validas) - 1:
                cantidad += residuo

            registro = RegistroLabor.objects.create(
                trabajador=trabajador,
                labor=labor,
                fecha=fecha,
                quincena=quincena,
                cantidad=cantidad,
                observaciones=observaciones,
                created_by=request.user
            )
            registros_creados.append(registro)

        serializer = self.get_serializer(registros_creados, many=True)

        return Response({
            'message': f'{len(registros_creados)} registros creados correctamente',
            'registros': serializer.data,
            'errores': errores
        }, status=status.HTTP_201_CREATED)


class NominaViewSet(FincaFilterMixin, viewsets.ModelViewSet):
    """ViewSet para gestión de nóminas"""
    queryset = Nomina.objects.all()
    serializer_class = NominaSerializer
    permission_classes = [CanModifyData]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_class = NominaFilter
    search_fields = ['trabajador__nombres', 'trabajador__apellidos', 'trabajador__numero_documento']
    ordering = ['-quincena', 'trabajador']
    finca_field = 'trabajador__finca'
    pagination_class = None

    def get_queryset(self):
        return super().get_queryset().exclude(
            trabajador__estado=Trabajador.RETIRADO
        )

    @action(detail=False, methods=['get'])
    def exportar_excel_quincena(self, request):
        """Exportar lista de pagos de una quincena a Excel"""
        quincena_id = request.query_params.get('quincena')

        if not quincena_id:
            return Response(
                {'error': 'Se requiere el parámetro quincena'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            quincena = Quincena.objects.get(id=quincena_id)
        except Quincena.DoesNotExist:
            return Response(
                {'error': 'Quincena no encontrada'},
                status=status.HTTP_404_NOT_FOUND
            )

        nominas = self.queryset.filter(
            quincena=quincena,
            estado__in=['PENDIENTE', 'APROBADA']
        ).exclude(
            trabajador__estado='RETIRADO'
        ).select_related('trabajador', 'quincena')

        fincas_param = request.query_params.get('fincas', '')
        finca_id = request.query_params.get('finca', '')

        if fincas_param:
            fincas_ids = [int(f) for f in fincas_param.split(',') if f.strip()]
            nominas = nominas.filter(trabajador__finca__id__in=fincas_ids)
        elif finca_id:
            nominas = nominas.filter(trabajador__finca__id=finca_id)

        nominas = nominas.order_by('trabajador__apellidos', 'trabajador__nombres')

        if not nominas.exists():
            return Response(
                {'error': 'No hay nóminas calculadas para esta quincena'},
                status=status.HTTP_400_BAD_REQUEST
            )

        generator = ExcelGenerator(nominas, quincena)
        return generator.generar_lista_pagos()

    @action(detail=False, methods=['get'], url_path='exportar-detallado')
    def exportar_detallado_quincena(self, request):
        """Exportar reporte detallado de nómina (uso interno) a Excel"""
        import logging
        import traceback
        logger = logging.getLogger(__name__)

        try:
            from ..services.nomina_detallado_excel import NominaDetalladoExcelGenerator

            quincena_id = request.query_params.get('quincena')

            if not quincena_id:
                return Response(
                    {'error': 'Se requiere el parámetro quincena'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            try:
                quincena = Quincena.objects.get(id=quincena_id)
            except Quincena.DoesNotExist:
                return Response(
                    {'error': 'Quincena no encontrada'},
                    status=status.HTTP_404_NOT_FOUND
                )

            nominas = self.queryset.filter(
                quincena=quincena,
                estado__in=['PENDIENTE', 'APROBADA']
            ).exclude(
                trabajador__estado='RETIRADO'
            ).select_related('trabajador', 'trabajador__finca', 'quincena')

            fincas_param = request.query_params.get('fincas', '')
            finca_id = request.query_params.get('finca', '')

            if fincas_param:
                fincas_ids = [int(f) for f in fincas_param.split(',') if f.strip()]
                nominas = nominas.filter(trabajador__finca__id__in=fincas_ids)
            elif finca_id:
                nominas = nominas.filter(trabajador__finca__id=finca_id)

            nominas = nominas.order_by('trabajador__apellidos', 'trabajador__nombres')

            if not nominas.exists():
                return Response(
                    {'error': 'No hay nóminas calculadas para esta quincena'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            generator = NominaDetalladoExcelGenerator(nominas, quincena)
            return generator.generar()

        except Exception as e:
            error_msg = f"Error en exportar_detallado_quincena: {str(e)}"
            error_trace = traceback.format_exc()
            logger.error(error_msg)
            logger.error(error_trace)

            print("=" * 80)
            print("ERROR EN EXPORTAR DETALLADO:")
            print(error_msg)
            print(error_trace)
            print("=" * 80)

            return Response(
                {'error': 'Error al generar reporte detallado'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['post'])
    def calcular_quincena(self, request):
        """Calcular nómina para toda la quincena"""
        quincena_id = request.data.get('quincena_id')

        if not quincena_id:
            return Response(
                {'error': 'quincena_id es requerido'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            quincena = Quincena.objects.get(id=quincena_id)
        except Quincena.DoesNotExist:
            return Response(
                {'error': 'Quincena no encontrada'},
                status=status.HTTP_404_NOT_FOUND
            )

        calculator = NominaCalculator(quincena)
        nominas = calculator.calcular_quincena_completa(request.user)

        serializer = self.get_serializer(nominas, many=True)

        return Response({
            'message': f'Nómina calculada para {len(nominas)} trabajadores',
            'nominas': serializer.data
        })

    @action(detail=True, methods=['post'])
    def recalcular(self, request, pk=None):
        """Recalcular nómina manteniendo ajustes manuales"""
        nomina = self.get_object()

        if nomina.estado != 'PENDIENTE':
            return Response(
                {'error': 'Solo se pueden recalcular nóminas en estado PENDIENTE'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            calculator = NominaCalculator(nomina.quincena)
            nomina_actualizada = calculator.calcular_trabajador(nomina.trabajador, request.user)

            serializer = self.get_serializer(nomina_actualizada)
            return Response(serializer.data)

        except Exception:
            import logging
            logging.getLogger(__name__).exception("Error en recalcular nómina %s", pk)
            return Response(
                {'error': 'Error al recalcular la nómina. Intente de nuevo.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['post'])
    def aprobar(self, request, pk=None):
        """Aprobar nómina pendiente"""
        nomina = self.get_object()

        if nomina.estado != 'PENDIENTE':
            return Response(
                {'error': 'Solo se pueden aprobar nóminas en estado PENDIENTE'},
                status=status.HTTP_400_BAD_REQUEST
            )

        nomina.estado = 'APROBADA'
        nomina.fecha_aprobacion = timezone.now()
        nomina.save()

        serializer = self.get_serializer(nomina)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def rechazar(self, request, pk=None):
        """Rechazar nómina aprobada (regresa a PENDIENTE)"""
        nomina = self.get_object()

        if nomina.estado != 'APROBADA':
            return Response(
                {'error': 'Solo se pueden rechazar nóminas en estado APROBADA'},
                status=status.HTTP_400_BAD_REQUEST
            )

        motivo = request.data.get('motivo', '')
        nomina.estado = 'PENDIENTE'
        nomina.fecha_aprobacion = None

        if motivo:
            fecha_hora = timezone.now().strftime('%Y-%m-%d %H:%M')
            nota = f"\n[{fecha_hora}] Nómina rechazada: {motivo}"
            nomina.observaciones = (nomina.observaciones or '') + nota

        nomina.save()

        serializer = self.get_serializer(nomina)
        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def aprobar_masivo(self, request):
        """Aprobar todas las nóminas PENDIENTES de una quincena (con filtro opcional de finca)"""
        quincena_id = request.data.get('quincena_id')
        finca_id = request.data.get('finca_id')

        if not quincena_id:
            return Response(
                {'error': 'El ID de quincena es requerido'},
                status=status.HTTP_400_BAD_REQUEST
            )

        nominas = Nomina.objects.filter(quincena_id=quincena_id, estado='PENDIENTE')

        if finca_id:
            nominas = nominas.filter(trabajador__finca_id=finca_id)

        nominas_list = list(nominas)
        count = len(nominas_list)

        if count == 0:
            return Response(
                {'error': 'No hay nóminas PENDIENTES para aprobar con los filtros aplicados'},
                status=status.HTTP_400_BAD_REQUEST
            )

        ahora = timezone.now()
        with transaction.atomic():
            for nomina in nominas_list:
                nomina.estado = 'APROBADA'
                nomina.fecha_aprobacion = ahora
                nomina.save()

        return Response({
            'message': f'{count} nómina(s) aprobada(s) correctamente',
            'count': count
        })

    @action(detail=False, methods=['post'])
    def rechazar_masivo(self, request):
        """Rechazar todas las nóminas APROBADAS de una quincena (regresa a PENDIENTE)"""
        quincena_id = request.data.get('quincena_id')
        finca_id = request.data.get('finca_id')
        motivo = request.data.get('motivo', '')

        if not quincena_id:
            return Response(
                {'error': 'El ID de quincena es requerido'},
                status=status.HTTP_400_BAD_REQUEST
            )

        nominas = Nomina.objects.filter(quincena_id=quincena_id, estado='APROBADA')

        if finca_id:
            nominas = nominas.filter(trabajador__finca_id=finca_id)

        nominas_list = list(nominas)
        count = len(nominas_list)

        if count == 0:
            return Response(
                {'error': 'No hay nóminas APROBADAS para rechazar con los filtros aplicados'},
                status=status.HTTP_400_BAD_REQUEST
            )

        fecha_hora = timezone.now().strftime('%Y-%m-%d %H:%M')
        with transaction.atomic():
            for nomina in nominas_list:
                nomina.estado = 'PENDIENTE'
                nomina.fecha_aprobacion = None
                if motivo:
                    nota = f"\n[{fecha_hora}] Rechazo masivo: {motivo}"
                    nomina.observaciones = (nomina.observaciones or '') + nota
                nomina.save()

        return Response({
            'message': f'{count} nómina(s) rechazada(s) correctamente',
            'count': count
        })

    @action(detail=True, methods=['get'])
    def descargar_pdf(self, request, pk=None):
        """Descargar comprobante de pago en PDF"""
        nomina = self.get_object()

        pdf_buffer = generar_comprobante_pdf(nomina)

        meses = {1: 'Enero', 2: 'Febrero', 3: 'Marzo', 4: 'Abril', 5: 'Mayo', 6: 'Junio',
                 7: 'Julio', 8: 'Agosto', 9: 'Septiembre', 10: 'Octubre', 11: 'Noviembre', 12: 'Diciembre'}
        nombre_limpio = nomina.trabajador.nombre_completo.replace(' ', '_')
        mes_nombre = meses.get(nomina.quincena.mes, f'Mes{nomina.quincena.mes}')
        filename = f"Colilla_{nombre_limpio}_{mes_nombre}_{nomina.quincena.año}_Q{nomina.quincena.numero}.pdf"

        response = FileResponse(pdf_buffer, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response

    @action(detail=False, methods=['get'])
    def descargar_colillas_consolidadas(self, request):
        """Descargar colillas consolidadas en un solo PDF.

        Query params:
        - quincena (required): ID de la quincena
        - finca (optional): ID de la finca
        - estados (optional): Estados separados por coma
        """
        from ..services.pdf_generator import generar_colillas_consolidadas
        from ..models import Finca

        quincena_id = request.query_params.get('quincena')
        finca_id = request.query_params.get('finca')
        estados_str = request.query_params.get('estados', '')

        if not quincena_id:
            return Response(
                {'error': 'El parámetro quincena es requerido'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            quincena = Quincena.objects.get(id=quincena_id)
        except Quincena.DoesNotExist:
            return Response(
                {'error': 'Quincena no encontrada'},
                status=status.HTTP_404_NOT_FOUND
            )

        filtros = {'quincena': quincena}

        if finca_id:
            filtros['trabajador__finca_id'] = finca_id

        if estados_str:
            estados = [e.strip() for e in estados_str.split(',') if e.strip()]
            if estados:
                filtros['estado__in'] = estados

        nominas = Nomina.objects.filter(**filtros).select_related(
            'trabajador', 'quincena', 'trabajador__finca', 'trabajador__tipo_contrato'
        ).order_by('trabajador__nombre_completo')

        if not nominas.exists():
            return Response(
                {'error': 'No se encontraron nóminas con los filtros especificados'},
                status=status.HTTP_404_NOT_FOUND
            )

        pdf_buffer = generar_colillas_consolidadas(nominas)

        finca_nombre = f"_{Finca.objects.get(id=finca_id).nombre}" if finca_id else ""
        filename = f"Colillas_Q{quincena.numero}_{quincena.año}{finca_nombre}.pdf"

        response = FileResponse(pdf_buffer, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response

    @action(detail=True, methods=['post'])
    def enviar_recibo(self, request, pk=None):
        """Enviar recibo de nómina por correo electrónico al trabajador"""
        nomina = self.get_object()

        if nomina.estado not in ['PENDIENTE', 'APROBADA']:
            return Response(
                {'error': 'Solo se pueden enviar recibos de nóminas pendientes o aprobadas'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not nomina.trabajador.correo:
            return Response(
                {'error': f'El trabajador {nomina.trabajador.nombre_completo} no tiene correo registrado'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            from ..services.email_service import enviar_recibo_nomina

            resultado = enviar_recibo_nomina(nomina)

            if resultado['success']:
                return Response({
                    'message': resultado['message'],
                    'correo': nomina.trabajador.correo
                })
            else:
                return Response(
                    {'error': resultado['message']},
                    status=status.HTTP_400_BAD_REQUEST
                )
        except Exception as e:
            return Response(
                {'error': f'Error al enviar correo: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['post'])
    def enviar_recibos_masivo(self, request):
        """Enviar recibos de nómina por correo a múltiples trabajadores.

        Body params:
        - quincena_id (required)
        - finca_id (optional)
        - estados (optional, default: ['APROBADA'])
        """
        quincena_id = request.data.get('quincena_id')
        finca_ids = request.data.get('finca_ids')
        estados = request.data.get('estados', ['APROBADA'])

        if not quincena_id:
            return Response(
                {'error': 'El ID de quincena es requerido'},
                status=status.HTTP_400_BAD_REQUEST
            )

        nominas = Nomina.objects.filter(
            quincena_id=quincena_id,
            estado__in=estados,
            trabajador__correo__isnull=False
        ).exclude(trabajador__correo='').select_related('trabajador', 'quincena')

        if finca_ids:
            if isinstance(finca_ids, list):
                nominas = nominas.filter(trabajador__finca_id__in=finca_ids)
            else:
                nominas = nominas.filter(trabajador__finca_id=finca_ids)

        if not nominas.exists():
            return Response({
                'message': 'No hay nóminas con correo registrado para enviar',
                'exitosos': 0,
                'fallidos': 0,
                'detalles': [],
            })

        try:
            from ..services.email_service import enviar_recibos_masivo

            resultado = enviar_recibos_masivo(nominas)

            return Response({
                'message': f'Proceso completado: {resultado["exitosos"]} enviados, {resultado["fallidos"]} fallidos',
                'exitosos': resultado['exitosos'],
                'fallidos': resultado['fallidos'],
                'detalles': resultado['detalles']
            })
        except Exception as e:
            return Response(
                {'error': f'Error en el envío masivo: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class AuditoriaLogViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet de solo lectura para logs de auditoría"""
    queryset = AuditoriaLog.objects.all()
    serializer_class = AuditoriaLogSerializer
    permission_classes = [IsSuperAdmin]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['accion', 'tabla_afectada', 'usuario']
    ordering = ['-created_at']
