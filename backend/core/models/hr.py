# backend/core/models/hr.py

from django.contrib.auth.models import AbstractUser
from django.db import models
from django.core.validators import MinValueValidator
from django.core.exceptions import ValidationError
from decimal import Decimal
from datetime import date, timedelta

# ============================================================================
# USUARIOS Y ROLES
# ============================================================================

class Rol(models.Model):
    """Roles del sistema para control de permisos"""

    # Nuevos nombres de roles más descriptivos
    ADMINISTRADOR = 'ADMINISTRADOR'
    SUPERVISOR = 'SUPERVISOR'
    CONSULTA = 'CONSULTA'

    # Mantener los antiguos como alias para compatibilidad durante migración
    SUPER_ADMIN = 'ADMINISTRADOR'  # Alias para compatibilidad
    DIGITADOR = 'SUPERVISOR'        # Alias para compatibilidad
    SOLO_LECTURA = 'CONSULTA'       # Alias para compatibilidad

    ROLES_CHOICES = [
        (ADMINISTRADOR, 'Administrador'),
        (SUPERVISOR, 'Supervisor'),
        (CONSULTA, 'Consulta'),
    ]

    nombre = models.CharField(max_length=50, choices=ROLES_CHOICES, unique=True)
    descripcion = models.TextField(blank=True)
    permisos = models.JSONField(default=dict, help_text="Permisos específicos del rol")

    class Meta:
        verbose_name = "Rol"
        verbose_name_plural = "Roles"

    def __str__(self):
        return self.get_nombre_display()


class Usuario(AbstractUser):
    """Usuario personalizado del sistema"""

    rol = models.ForeignKey(
        Rol,
        on_delete=models.PROTECT,
        related_name='usuarios',
        null=True,
        blank=True
    )
    es_activo = models.BooleanField(default=True)
    ultimo_acceso = models.DateTimeField(null=True, blank=True)

    # Fincas asignadas al usuario (para filtrar datos)
    # Si está vacío y no es admin, no ve ninguna finca
    fincas_asignadas = models.ManyToManyField(
        'Finca',
        blank=True,
        related_name='usuarios_asignados',
        help_text='Fincas que este usuario puede ver. Admins ven todas.'
    )

    class Meta:
        verbose_name = "Usuario"
        verbose_name_plural = "Usuarios"

    def __str__(self):
        return f"{self.get_full_name() or self.username}"

    @property
    def es_administrador(self):
        """Verifica si el usuario es administrador"""
        return self.rol and self.rol.nombre == Rol.ADMINISTRADOR

    def get_fincas_visibles(self):
        """
        Retorna las fincas que el usuario puede ver.
        Admins ven todas, otros solo las asignadas.
        """
        if self.es_administrador:
            from .farm import Finca
            return Finca.objects.all()
        return self.fincas_asignadas.all()


# ============================================================================
# TRABAJADORES Y CONTRATOS
# ============================================================================

class TipoContrato(models.Model):
    """Define si el trabajador tiene contrato formal o no"""

    CON_CONTRATO = 'CON_CONTRATO'
    SIN_CONTRATO = 'SIN_CONTRATO'

    TIPO_CHOICES = [
        (CON_CONTRATO, 'Con Contrato'),
        (SIN_CONTRATO, 'Sin Contrato'),
    ]

    nombre = models.CharField(max_length=50, choices=TIPO_CHOICES, unique=True)
    descripcion = models.TextField(blank=True)
    aplica_deducciones = models.BooleanField(
        default=False,
        help_text="True para trabajadores con contrato"
    )
    aplica_dominicales = models.BooleanField(
        default=False,
        help_text="True para trabajadores con contrato"
    )
    aplica_auxilio_transporte = models.BooleanField(
        default=False,
        help_text="True para trabajadores con contrato"
    )

    class Meta:
        verbose_name = "Tipo de Contrato"
        verbose_name_plural = "Tipos de Contrato"

    def __str__(self):
        return self.get_nombre_display()


class Trabajador(models.Model):
    """Trabajadores de la finca"""

    # Tipos de documento
    TIPO_DOCUMENTO_CHOICES = [
        ('CC', 'Cédula de Ciudadanía'),
        ('TI', 'Tarjeta de Identidad'),
        ('CE', 'Cédula de Extranjería'),
        ('PEP', 'Permiso Especial de Permanencia'),
    ]

    # Estados del trabajador
    ESTADO_CHOICES = [
        ('ACTIVO', 'Activo'),
        ('INACTIVO', 'Inactivo'),
        ('RETIRADO', 'Retirado'),
    ]

    # NUEVO: Tipos de cuenta bancaria
    TIPO_CUENTA_CHOICES = [
        ('AHORRO', 'Cuenta de Ahorros'),
        ('CORRIENTE', 'Cuenta Corriente'),
        ('NEQUI', 'Nequi'),
        ('DAVIPLATA', 'Daviplata'),
    ]

    # Indica si el trabajador es administrativo (salario fijo) o de labores (pago por labor)
    es_administrativo = models.BooleanField(
        default=False,
        verbose_name='Es Administrativo',
        help_text='Si es True, se le paga salario fijo en lugar de por labores'
    )

    salario_quincenal = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name='Salario Quincenal',
        help_text='Salario fijo quincenal (solo para administrativos)'
    )

    # Información personal
    nombres = models.CharField(max_length=100)
    apellidos = models.CharField(max_length=100)
    tipo_documento = models.CharField(max_length=10, choices=TIPO_DOCUMENTO_CHOICES)
    numero_documento = models.CharField(max_length=20, unique=True)
    lugar_expedicion_documento = models.CharField(max_length=100, blank=True, null=True)
    fecha_nacimiento = models.DateField()
    nacionalidad = models.CharField(
        max_length=50,
        default='COLOMBIANA',
        verbose_name='Nacionalidad',
        help_text='Nacionalidad del trabajador'
    )

    # Contacto
    telefono = models.CharField(max_length=20, blank=True, null=True)
    direccion = models.CharField(max_length=200, blank=True, null=True)
    correo = models.EmailField(blank=True, null=True)

    # Información laboral
    eps = models.CharField(max_length=100, blank=True, null=True)
    arl = models.CharField(max_length=100, blank=True, null=True)  # NUEVO

    tipo_contrato = models.ForeignKey(
        TipoContrato,
        on_delete=models.PROTECT,
        related_name='trabajadores'
    )

    finca = models.ForeignKey(
        'Finca',
        on_delete=models.PROTECT,
        related_name='trabajadores',
        null=True  # Temporal para migración
    )

    fecha_ingreso = models.DateField()
    fecha_retiro = models.DateField(blank=True, null=True)
    estado = models.CharField(max_length=20, choices=ESTADO_CHOICES, default='ACTIVO')

    # Información bancaria
    numero_cuenta_bancaria = models.CharField(max_length=100, blank=True, null=True)
    banco = models.CharField(max_length=100, blank=True, null=True)
    tipo_cuenta_bancaria = models.CharField(
        max_length=20,
        choices=TIPO_CUENTA_CHOICES,
        blank=True,
        null=True
    )

    # Metadatos
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'trabajadores'
        verbose_name = 'Trabajador'
        verbose_name_plural = 'Trabajadores'
        ordering = ['apellidos', 'nombres']

    def __str__(self):
        return self.nombre_completo

    @property
    def nombre_completo(self):
        return f"{self.nombres} {self.apellidos}"

    @property
    def cuenta_oculta(self):
        """Retorna número de cuenta parcialmente oculto"""
        if not self.numero_cuenta_bancaria:
            return 'N/A'
        cuenta = str(self.numero_cuenta_bancaria)
        if len(cuenta) <= 4:
            return cuenta
        return f"***{cuenta[-4:]}"


# ============================================================================
# CONTRATOS LABORALES
# ============================================================================

class Contrato(models.Model):
    """
    Contrato laboral formal de trabajadores CON_CONTRATO.
    Gestiona el ciclo de vida completo del contrato y sirve como base para
    el cálculo de prestaciones sociales.
    """

    # Tipos de contrato
    TERMINO_FIJO = 'TERMINO_FIJO'
    TERMINO_INDEFINIDO = 'TERMINO_INDEFINIDO'

    TIPO_CONTRATO_CHOICES = [
        (TERMINO_FIJO, 'Término Fijo'),
        (TERMINO_INDEFINIDO, 'Término Indefinido'),
    ]

    # Estados del contrato
    ACTIVO = 'ACTIVO'
    FINALIZADO = 'FINALIZADO'
    LIQUIDADO = 'LIQUIDADO'
    CANCELADO = 'CANCELADO'

    ESTADO_CHOICES = [
        (ACTIVO, 'Activo'),
        (FINALIZADO, 'Finalizado'),
        (LIQUIDADO, 'Liquidado'),
        (CANCELADO, 'Cancelado'),
    ]

    # Motivos de finalización
    VENCIMIENTO_TERMINO = 'VENCIMIENTO_TERMINO'
    RENUNCIA_TRABAJADOR = 'RENUNCIA_TRABAJADOR'
    DESPIDO_JUSTA_CAUSA = 'DESPIDO_JUSTA_CAUSA'
    DESPIDO_SIN_JUSTA_CAUSA = 'DESPIDO_SIN_JUSTA_CAUSA'
    MUTUO_ACUERDO = 'MUTUO_ACUERDO'
    OTRO = 'OTRO'

    MOTIVO_FINALIZACION_CHOICES = [
        (VENCIMIENTO_TERMINO, 'Vencimiento del Término'),
        (RENUNCIA_TRABAJADOR, 'Renuncia del Trabajador'),
        (DESPIDO_JUSTA_CAUSA, 'Despido con Justa Causa'),
        (DESPIDO_SIN_JUSTA_CAUSA, 'Despido sin Justa Causa'),
        (MUTUO_ACUERDO, 'Mutuo Acuerdo'),
        (OTRO, 'Otro'),
    ]

    # Información básica
    numero_contrato = models.CharField(
        max_length=20,
        unique=True,
        editable=False,
        verbose_name='Número de Contrato',
        help_text='Generado automáticamente: CTR-YYYY-NNNN'
    )

    trabajador = models.ForeignKey(
        Trabajador,
        on_delete=models.PROTECT,
        related_name='contratos',
        verbose_name='Trabajador'
    )

    tipo_contrato = models.CharField(
        max_length=20,
        choices=TIPO_CONTRATO_CHOICES,
        default=TERMINO_FIJO,
        verbose_name='Tipo de Contrato'
    )

    fecha_inicio = models.DateField(verbose_name='Fecha de Inicio')

    fecha_fin = models.DateField(
        null=True,
        blank=True,
        verbose_name='Fecha de Finalización',
        help_text='Requerido para contratos de término fijo'
    )

    cargo = models.CharField(
        max_length=100,
        verbose_name='Cargo',
        help_text='Cargo desempeñado según contrato'
    )

    salario_pactado = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))],
        verbose_name='Salario Pactado',
        help_text='Salario acordado en el contrato (mensual)'
    )

    # Estados
    estado = models.CharField(
        max_length=20,
        choices=ESTADO_CHOICES,
        default=ACTIVO,
        verbose_name='Estado'
    )

    fecha_liquidacion = models.DateField(
        null=True,
        blank=True,
        verbose_name='Fecha de Liquidación',
        help_text='Fecha en que se pagaron las prestaciones'
    )

    motivo_finalizacion = models.CharField(
        max_length=30,
        choices=MOTIVO_FINALIZACION_CHOICES,
        blank=True,
        null=True,
        verbose_name='Motivo de Finalización'
    )

    observaciones = models.TextField(
        blank=True,
        verbose_name='Observaciones'
    )

    # Auditoría
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Fecha de Creación')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Fecha de Actualización')
    created_by = models.ForeignKey(
        Usuario,
        on_delete=models.SET_NULL,
        null=True,
        related_name='contratos_creados',
        verbose_name='Creado por'
    )

    class Meta:
        verbose_name = "Contrato"
        verbose_name_plural = "Contratos"
        ordering = ['-fecha_inicio']
        indexes = [
            models.Index(fields=['trabajador', 'estado']),
            models.Index(fields=['estado', 'fecha_fin']),
        ]

    def __str__(self):
        return f"{self.numero_contrato} - {self.trabajador.nombre_completo}"

    def clean(self):
        """Validaciones del modelo"""
        errors = {}

        # Validación 1: Solo trabajadores CON_CONTRATO pueden tener contratos
        if self.trabajador and self.trabajador.tipo_contrato.nombre != TipoContrato.CON_CONTRATO:
            errors['trabajador'] = ValidationError(
                'Solo trabajadores con tipo de contrato "CON_CONTRATO" pueden tener contratos formales.'
            )

        # Validación 2: Contratos de término fijo DEBEN tener fecha_fin
        if self.tipo_contrato == self.TERMINO_FIJO and not self.fecha_fin:
            errors['fecha_fin'] = ValidationError(
                'Los contratos de término fijo deben tener una fecha de finalización.'
            )

        # Validación 3: fecha_fin debe ser posterior a fecha_inicio
        if self.fecha_fin and self.fecha_inicio and self.fecha_fin <= self.fecha_inicio:
            errors['fecha_fin'] = ValidationError(
                'La fecha de finalización debe ser posterior a la fecha de inicio.'
            )

        # Validación 4: Solo puede haber UN contrato ACTIVO por trabajador
        if self.estado == self.ACTIVO and self.trabajador:
            contratos_activos = Contrato.objects.filter(
                trabajador=self.trabajador,
                estado=self.ACTIVO
            )

            # Si estamos editando, excluir el contrato actual
            if self.pk:
                contratos_activos = contratos_activos.exclude(pk=self.pk)

            if contratos_activos.exists():
                errors['estado'] = ValidationError(
                    f'El trabajador {self.trabajador.nombre_completo} ya tiene un contrato activo. '
                    f'Debe finalizar el contrato actual antes de crear uno nuevo.'
                )

        # Validación 5: No solapar fechas entre contratos activos
        if self.trabajador and self.fecha_inicio:
            contratos_solapados = Contrato.objects.filter(
                trabajador=self.trabajador,
                estado=self.ACTIVO
            ).exclude(pk=self.pk if self.pk else None)

            for contrato in contratos_solapados:
                # Verificar solapamiento de fechas
                if contrato.fecha_fin:
                    if self.fecha_inicio <= contrato.fecha_fin:
                        if not self.fecha_fin or self.fecha_fin >= contrato.fecha_inicio:
                            errors['fecha_inicio'] = ValidationError(
                                f'Las fechas de este contrato se solapan con el contrato {contrato.numero_contrato} '
                                f'({contrato.fecha_inicio} - {contrato.fecha_fin}).'
                            )
                            break

        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        # Generar número de contrato si es nuevo
        if not self.numero_contrato:
            self.numero_contrato = self._generar_numero_contrato()

        # Ejecutar validaciones
        self.clean()

        super().save(*args, **kwargs)

    def _generar_numero_contrato(self):
        """Genera número de contrato único: CTR-YYYY-NNNN"""
        año_actual = date.today().year

        # Buscar el último contrato del año
        ultimo_contrato = Contrato.objects.filter(
            numero_contrato__startswith=f'CTR-{año_actual}-'
        ).order_by('-numero_contrato').first()

        if ultimo_contrato:
            # Extraer el número secuencial del último contrato
            ultimo_numero = int(ultimo_contrato.numero_contrato.split('-')[-1])
            nuevo_numero = ultimo_numero + 1
        else:
            nuevo_numero = 1

        return f'CTR-{año_actual}-{nuevo_numero:04d}'

    # ========================================================================
    # PROPERTIES CALCULADAS
    # ========================================================================

    @property
    def duracion_meses(self):
        """Calcula la duración del contrato en meses"""
        if not self.fecha_fin:
            return None

        diferencia = (self.fecha_fin.year - self.fecha_inicio.year) * 12
        diferencia += self.fecha_fin.month - self.fecha_inicio.month

        return diferencia

    @property
    def duracion_dias(self):
        """Calcula la duración del contrato en días"""
        if not self.fecha_fin:
            return None

        return (self.fecha_fin - self.fecha_inicio).days + 1  # +1 para incluir el último día

    @property
    def dias_restantes(self):
        """Calcula cuántos días faltan para que finalice el contrato (solo si ACTIVO)"""
        if self.estado != self.ACTIVO or not self.fecha_fin:
            return None

        hoy = date.today()
        if hoy > self.fecha_fin:
            return 0  # Ya venció

        return (self.fecha_fin - hoy).days

    @property
    def esta_por_vencer(self):
        """Verifica si el contrato está por vencer (≤15 días)"""
        dias = self.dias_restantes
        return dias is not None and 0 < dias <= 15

    @property
    def esta_vencido(self):
        """Verifica si el contrato ya venció"""
        if self.estado != self.ACTIVO or not self.fecha_fin:
            return False

        return date.today() > self.fecha_fin

    @property
    def progreso_contrato(self):
        """Calcula el porcentaje de avance del contrato (0-100)"""
        if not self.fecha_fin:
            return None

        hoy = date.today()
        duracion_total = (self.fecha_fin - self.fecha_inicio).days
        dias_transcurridos = (hoy - self.fecha_inicio).days

        if dias_transcurridos <= 0:
            return 0
        elif dias_transcurridos >= duracion_total:
            return 100
        else:
            return round((dias_transcurridos / duracion_total) * 100, 2)

    # ========================================================================
    # MÉTODOS DE NEGOCIO
    # ========================================================================

    def finalizar_contrato(self, motivo, observaciones='', usuario=None):
        """
        Finaliza el contrato (ACTIVO → FINALIZADO).

        Args:
            motivo: Motivo de finalización (constante MOTIVO_FINALIZACION_CHOICES)
            observaciones: Observaciones adicionales
            usuario: Usuario que realiza la acción
        """
        if self.estado != self.ACTIVO:
            raise ValidationError(f'Solo se pueden finalizar contratos en estado ACTIVO. Estado actual: {self.get_estado_display()}')

        self.estado = self.FINALIZADO
        self.motivo_finalizacion = motivo
        if observaciones:
            self.observaciones = f"{self.observaciones}\n{observaciones}" if self.observaciones else observaciones

        self.save()

        return True

    def liquidar_contrato(self, fecha_liquidacion=None, observaciones='', usuario=None):
        """
        Liquida el contrato (FINALIZADO → LIQUIDADO).

        Args:
            fecha_liquidacion: Fecha en que se liquida (default: hoy)
            observaciones: Observaciones adicionales
            usuario: Usuario que realiza la acción
        """
        if self.estado != self.FINALIZADO:
            raise ValidationError(f'Solo se pueden liquidar contratos en estado FINALIZADO. Estado actual: {self.get_estado_display()}')

        self.estado = self.LIQUIDADO
        self.fecha_liquidacion = fecha_liquidacion or date.today()
        if observaciones:
            self.observaciones = f"{self.observaciones}\n{observaciones}" if self.observaciones else observaciones

        self.save()

        return True

    def cancelar_contrato(self, motivo, observaciones='', usuario=None):
        """
        Cancela el contrato anticipadamente (ACTIVO → CANCELADO).

        Args:
            motivo: Motivo de cancelación
            observaciones: Observaciones adicionales
            usuario: Usuario que realiza la acción
        """
        if self.estado != self.ACTIVO:
            raise ValidationError(f'Solo se pueden cancelar contratos en estado ACTIVO. Estado actual: {self.get_estado_display()}')

        self.estado = self.CANCELADO
        self.motivo_finalizacion = motivo
        if observaciones:
            self.observaciones = f"{self.observaciones}\n{observaciones}" if self.observaciones else observaciones

        self.save()

        return True

    def reactivar_contrato(self, observaciones='', usuario=None):
        """
        Reactiva un contrato cancelado (CANCELADO → ACTIVO).
        Solo si no ha vencido.

        Args:
            observaciones: Observaciones adicionales
            usuario: Usuario que realiza la acción
        """
        if self.estado != self.CANCELADO:
            raise ValidationError(f'Solo se pueden reactivar contratos en estado CANCELADO. Estado actual: {self.get_estado_display()}')

        # Verificar que no haya vencido
        if self.fecha_fin and date.today() > self.fecha_fin:
            raise ValidationError('No se puede reactivar un contrato vencido.')

        # Verificar que no haya otro contrato activo
        contratos_activos = Contrato.objects.filter(
            trabajador=self.trabajador,
            estado=self.ACTIVO
        ).exclude(pk=self.pk)

        if contratos_activos.exists():
            raise ValidationError(
                f'El trabajador {self.trabajador.nombre_completo} ya tiene un contrato activo. '
                f'No se puede reactivar este contrato.'
            )

        self.estado = self.ACTIVO
        self.motivo_finalizacion = None
        if observaciones:
            self.observaciones = f"{self.observaciones}\n{observaciones}" if self.observaciones else observaciones

        self.save()

        return True

    def calcular_salario_promedio_periodo(self, fecha_inicio_periodo, fecha_fin_periodo):
        """
        Calcula el salario promedio del trabajador en un período específico.
        Útil para el cálculo de prestaciones sociales.

        Args:
            fecha_inicio_periodo: Fecha de inicio del período
            fecha_fin_periodo: Fecha de fin del período

        Returns:
            Decimal: Salario promedio del período
        """
        from core.models import Nomina  # Import local para evitar circular

        # Buscar todas las nóminas del trabajador en el período
        nominas = Nomina.objects.filter(
            trabajador=self.trabajador,
            quincena__fecha_inicio__gte=fecha_inicio_periodo,
            quincena__fecha_fin__lte=fecha_fin_periodo,
            estado__in=[Nomina.PAGADA, Nomina.APROBADA]
        )

        if not nominas.exists():
            return Decimal('0.00')

        # Sumar total devengado de todas las nóminas
        total_devengado = sum(n.total_devengado for n in nominas)

        # Calcular promedio
        return total_devengado / nominas.count()


class DocumentoContrato(models.Model):
    """
    Documentos asociados a un contrato (PDF del contrato, anexos, otro sí, etc.)
    """

    # Tipos de documento
    CONTRATO = 'CONTRATO'
    ANEXO = 'ANEXO'
    OTRO_SI = 'OTRO_SI'
    TERMINACION = 'TERMINACION'
    OTRO = 'OTRO'

    TIPO_DOCUMENTO_CHOICES = [
        (CONTRATO, 'Contrato Original'),
        (ANEXO, 'Anexo'),
        (OTRO_SI, 'Otro Sí'),
        (TERMINACION, 'Acta de Terminación'),
        (OTRO, 'Otro'),
    ]

    contrato = models.ForeignKey(
        Contrato,
        on_delete=models.CASCADE,
        related_name='documentos',
        verbose_name='Contrato'
    )

    tipo_documento = models.CharField(
        max_length=20,
        choices=TIPO_DOCUMENTO_CHOICES,
        verbose_name='Tipo de Documento'
    )

    nombre = models.CharField(
        max_length=200,
        verbose_name='Nombre del Documento',
        help_text='Nombre descriptivo del documento'
    )

    archivo = models.FileField(
        upload_to='contratos/%Y/%m/',
        verbose_name='Archivo',
        help_text='Documento en PDF'
    )

    descripcion = models.TextField(
        blank=True,
        verbose_name='Descripción'
    )

    fecha_documento = models.DateField(
        default=date.today,
        verbose_name='Fecha del Documento'
    )

    # Auditoría
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Fecha de Carga')
    created_by = models.ForeignKey(
        Usuario,
        on_delete=models.SET_NULL,
        null=True,
        related_name='documentos_contratos_creados',
        verbose_name='Subido por'
    )

    class Meta:
        verbose_name = "Documento de Contrato"
        verbose_name_plural = "Documentos de Contratos"
        ordering = ['-fecha_documento']

    def __str__(self):
        return f"{self.contrato.numero_contrato} - {self.get_tipo_documento_display()}"
