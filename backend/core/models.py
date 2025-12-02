# backend/core/models.py

from django.contrib.auth.models import AbstractUser
from django.db import models
from django.core.validators import MinValueValidator
from decimal import Decimal

# ============================================================================
# USUARIOS Y ROLES
# ============================================================================

class Rol(models.Model):
    """Roles del sistema para control de permisos"""
    
    SUPER_ADMIN = 'SUPER_ADMIN'
    DIGITADOR = 'DIGITADOR'
    SOLO_LECTURA = 'SOLO_LECTURA'
    
    ROLES_CHOICES = [
        (SUPER_ADMIN, 'Super Administrador'),
        (DIGITADOR, 'Digitador'),
        (SOLO_LECTURA, 'Solo Lectura'),
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
    
    class Meta:
        verbose_name = "Usuario"
        verbose_name_plural = "Usuarios"
        
    def __str__(self):
        return f"{self.get_full_name() or self.username}"


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
    """Información personal y laboral de cada trabajador"""
    
    TIPO_DOCUMENTO_CHOICES = [
        ('CC', 'Cédula de Ciudadanía'),
        ('TI', 'Tarjeta de Identidad'),
        ('CE', 'Cédula de Extranjería'),
        ('PEP', 'Permiso Especial de Permanencia'),
    ]
    
    ESTADO_CHOICES = [
        ('ACTIVO', 'Activo'),
        ('INACTIVO', 'Inactivo'),
        ('RETIRADO', 'Retirado'),
    ]
    
    # Información Personal
    nombres = models.CharField(max_length=100)
    apellidos = models.CharField(max_length=100)
    tipo_documento = models.CharField(max_length=3, choices=TIPO_DOCUMENTO_CHOICES)
    numero_documento = models.CharField(max_length=20, unique=True)
    lugar_expedicion_documento = models.CharField(max_length=100, blank=True)
    fecha_nacimiento = models.DateField()
    
    # Contacto
    telefono = models.CharField(max_length=20, blank=True)
    direccion = models.TextField(blank=True)
    correo = models.EmailField(blank=True)
    
    # Información Laboral
    eps = models.CharField(max_length=100, blank=True, verbose_name="EPS")
    tipo_contrato = models.ForeignKey(
        TipoContrato,
        on_delete=models.PROTECT,
        related_name='trabajadores'
    )
    fecha_ingreso = models.DateField()
    fecha_retiro = models.DateField(null=True, blank=True)
    estado = models.CharField(max_length=20, choices=ESTADO_CHOICES, default='ACTIVO')
    
    # Información Bancaria (ENCRIPTADA en producción)
    numero_cuenta_bancaria = models.CharField(
        max_length=50, 
        blank=True,
        help_text="Debe estar encriptado en producción"
    )
    banco = models.CharField(max_length=100, blank=True)
    
    # Auditoría
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Trabajador"
        verbose_name_plural = "Trabajadores"
        ordering = ['apellidos', 'nombres']
        
    def __str__(self):
        return f"{self.apellidos} {self.nombres} - {self.numero_documento}"
    
    @property
    def nombre_completo(self):
        return f"{self.nombres} {self.apellidos}"
    
    @property
    def cuenta_oculta(self):
        """Retorna últimos 4 dígitos de la cuenta para digitadores"""
        if not self.numero_cuenta_bancaria:
            return "N/A"
        return f"****{self.numero_cuenta_bancaria[-4:]}"


# ============================================================================
# CATÁLOGOS DE LABORES
# ============================================================================

class UnidadMedida(models.Model):
    """Unidades de medida para labores"""
    
    DIA = 'DIA'
    UNIDAD = 'UNIDAD'
    HECTAREA = 'HECTAREA'
    METRO = 'METRO'
    
    UNIDAD_CHOICES = [
        (DIA, 'Día'),
        (UNIDAD, 'Unidad'),
        (HECTAREA, 'Hectárea'),
        (METRO, 'Metro'),
    ]
    
    nombre = models.CharField(max_length=20, choices=UNIDAD_CHOICES, unique=True)
    descripcion = models.TextField(blank=True)
    
    class Meta:
        verbose_name = "Unidad de Medida"
        verbose_name_plural = "Unidades de Medida"
        
    def __str__(self):
        return self.get_nombre_display()


class Labor(models.Model):
    """Catálogo de labores (84+)"""
    
    codigo = models.CharField(max_length=20, unique=True)
    nombre = models.CharField(max_length=100)
    descripcion = models.TextField(blank=True)
    unidad_medida = models.ForeignKey(
        UnidadMedida,
        on_delete=models.PROTECT,
        related_name='labores'
    )
    es_especial = models.BooleanField(
        default=False,
        help_text="True para: festivo, incapacidad, ausencia no justificada, dominical"
    )
    solo_con_contrato = models.BooleanField(
        default=False,
        help_text="True para festivos y dominicales"
    )
    activa = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = "Labor"
        verbose_name_plural = "Labores"
        ordering = ['nombre']
        
    def __str__(self):
        return f"{self.codigo} - {self.nombre}"


class ListaPrecios(models.Model):
    """Histórico de precios de cada labor con vigencias"""
    
    labor = models.ForeignKey(
        Labor,
        on_delete=models.CASCADE,
        related_name='precios'
    )
    precio = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    fecha_inicio_vigencia = models.DateField()
    fecha_fin_vigencia = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(
        Usuario,
        on_delete=models.SET_NULL,
        null=True,
        related_name='precios_creados'
    )
    
    class Meta:
        verbose_name = "Lista de Precio"
        verbose_name_plural = "Listas de Precios"
        ordering = ['-fecha_inicio_vigencia']
        constraints = [
            models.UniqueConstraint(
                fields=['labor', 'fecha_inicio_vigencia'],
                name='unique_labor_fecha_inicio'
            )
        ]
        
    def __str__(self):
        return f"{self.labor.nombre} - ${self.precio} ({self.fecha_inicio_vigencia})"
    
    @property
    def vigente(self):
        """Verifica si este precio está vigente actualmente"""
        from django.utils import timezone
        hoy = timezone.now().date()
        return (self.fecha_inicio_vigencia <= hoy and 
                (self.fecha_fin_vigencia is None or self.fecha_fin_vigencia >= hoy))


class VariablesNomina(models.Model):
    """Valores que cambian anualmente (salario mínimo, auxilio, porcentajes)"""
    
    SALARIO_MINIMO = 'SALARIO_MINIMO'
    AUXILIO_TRANSPORTE = 'AUXILIO_TRANSPORTE'
    PORCENTAJE_SALUD = 'PORCENTAJE_SALUD'
    PORCENTAJE_PENSION = 'PORCENTAJE_PENSION'
    
    NOMBRE_CHOICES = [
        (SALARIO_MINIMO, 'Salario Mínimo'),
        (AUXILIO_TRANSPORTE, 'Auxilio de Transporte'),
        (PORCENTAJE_SALUD, 'Porcentaje Salud'),
        (PORCENTAJE_PENSION, 'Porcentaje Pensión'),
    ]
    
    nombre = models.CharField(max_length=50, choices=NOMBRE_CHOICES)
    valor = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    fecha_inicio_vigencia = models.DateField()
    fecha_fin_vigencia = models.DateField(null=True, blank=True)
    descripcion = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(
        Usuario,
        on_delete=models.SET_NULL,
        null=True,
        related_name='variables_creadas'
    )
    
    class Meta:
        verbose_name = "Variable de Nómina"
        verbose_name_plural = "Variables de Nómina"
        ordering = ['-fecha_inicio_vigencia']
        
    def __str__(self):
        return f"{self.get_nombre_display()} - ${self.valor} ({self.fecha_inicio_vigencia})"
    
    @property
    def vigente(self):
        """Verifica si esta variable está vigente actualmente"""
        from django.utils import timezone
        hoy = timezone.now().date()
        return (self.fecha_inicio_vigencia <= hoy and 
                (self.fecha_fin_vigencia is None or self.fecha_fin_vigencia >= hoy))


# ============================================================================
# QUINCENAS Y REGISTROS
# ============================================================================

class Quincena(models.Model):
    """Períodos de nómina (1-15, 16-fin de mes)"""
    
    ESTADO_CHOICES = [
        ('ABIERTA', 'Abierta'),
        ('EN_CALCULO', 'En Cálculo'),
        ('CALCULADA', 'Calculada'),
        ('PAGADA', 'Pagada'),
    ]
    
    año = models.IntegerField()
    mes = models.IntegerField()  # 1-12
    numero = models.IntegerField()  # 1 o 2
    fecha_inicio = models.DateField()
    fecha_fin = models.DateField()
    fecha_cierre_registro = models.DateField(
        help_text="15 días después de fecha_fin para permitir correcciones"
    )
    estado = models.CharField(max_length=20, choices=ESTADO_CHOICES, default='ABIERTA')
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = "Quincena"
        verbose_name_plural = "Quincenas"
        ordering = ['-año', '-mes', '-numero']
        constraints = [
            models.UniqueConstraint(
                fields=['año', 'mes', 'numero'],
                name='unique_quincena'
            )
        ]
        
    def __str__(self):
        return f"{self.año}-{self.mes:02d} Quincena {self.numero}"
    
    @property
    def puede_registrar(self):
        """Verifica si se pueden registrar labores"""
        from django.utils import timezone
        hoy = timezone.now().date()
        return hoy <= self.fecha_cierre_registro


class RegistroLabor(models.Model):
    """Registro diario de labores realizadas por cada trabajador"""
    
    trabajador = models.ForeignKey(
        Trabajador,
        on_delete=models.CASCADE,
        related_name='registros_labor'
    )
    labor = models.ForeignKey(
        Labor,
        on_delete=models.PROTECT,
        related_name='registros'
    )
    quincena = models.ForeignKey(
        Quincena,
        on_delete=models.CASCADE,
        related_name='registros'
    )
    fecha = models.DateField()
    cantidad = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))],
        help_text="Cantidad según unidad de medida"
    )
    observaciones = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(
        Usuario,
        on_delete=models.SET_NULL,
        null=True,
        related_name='registros_creados'
    )
    updated_at = models.DateTimeField(auto_now=True)
    updated_by = models.ForeignKey(
        Usuario,
        on_delete=models.SET_NULL,
        null=True,
        related_name='registros_actualizados'
    )
    
    class Meta:
        verbose_name = "Registro de Labor"
        verbose_name_plural = "Registros de Labores"
        ordering = ['-fecha', 'trabajador']
        indexes = [
            models.Index(fields=['trabajador', 'quincena', 'fecha']),
        ]
        
    def __str__(self):
        return f"{self.trabajador.nombre_completo} - {self.labor.nombre} - {self.fecha}"


# ============================================================================
# NÓMINA
# ============================================================================

class Nomina(models.Model):
    """Cálculo de nómina por trabajador por quincena"""
    
    ESTADO_CHOICES = [
        ('BORRADOR', 'Borrador'),
        ('CALCULADA', 'Calculada'),
        ('APROBADA', 'Aprobada'),
        ('PAGADA', 'Pagada'),
    ]
    
    trabajador = models.ForeignKey(
        Trabajador,
        on_delete=models.CASCADE,
        related_name='nominas'
    )
    quincena = models.ForeignKey(
        Quincena,
        on_delete=models.CASCADE,
        related_name='nominas'
    )
    total_devengado = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00')
    )
    total_deducciones = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00')
    )
    total_neto = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00')
    )
    estado = models.CharField(max_length=20, choices=ESTADO_CHOICES, default='BORRADOR')
    fecha_calculo = models.DateTimeField(auto_now_add=True)
    fecha_aprobacion = models.DateTimeField(null=True, blank=True)
    fecha_pago = models.DateTimeField(null=True, blank=True)
    observaciones = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(
        Usuario,
        on_delete=models.SET_NULL,
        null=True,
        related_name='nominas_creadas'
    )
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Nómina"
        verbose_name_plural = "Nóminas"
        ordering = ['-quincena', 'trabajador']
        constraints = [
            models.UniqueConstraint(
                fields=['trabajador', 'quincena'],
                name='unique_nomina_trabajador_quincena'
            )
        ]
        
    def __str__(self):
        return f"{self.trabajador.nombre_completo} - {self.quincena}"


class DetalleNomina(models.Model):
    """Desglose de cada concepto que suma o resta en la nómina"""
    
    TIPO_CHOICES = [
        ('DEVENGO', 'Devengo'),
        ('DEDUCCION', 'Deducción'),
    ]
    
    CONCEPTO_CHOICES = [
        ('LABOR', 'Labor'),
        ('DOMINICAL', 'Dominical'),
        ('FESTIVO', 'Festivo'),
        ('AUXILIO_TRANSPORTE', 'Auxilio de Transporte'),
        ('SALUD', 'Salud'),
        ('PENSION', 'Pensión'),
        ('PRESTAMO', 'Préstamo'),
        ('AJUSTE_MANUAL', 'Ajuste Manual'),
    ]
    
    nomina = models.ForeignKey(
        Nomina,
        on_delete=models.CASCADE,
        related_name='detalles'
    )
    tipo = models.CharField(max_length=20, choices=TIPO_CHOICES)
    concepto = models.CharField(max_length=50, choices=CONCEPTO_CHOICES)
    descripcion = models.TextField()
    labor = models.ForeignKey(
        Labor,
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    cantidad = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True
    )
    valor_unitario = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True
    )
    valor_total = models.DecimalField(
        max_digits=12,
        decimal_places=2
    )
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = "Detalle de Nómina"
        verbose_name_plural = "Detalles de Nómina"
        ordering = ['nomina', 'tipo', 'concepto']
        
    def __str__(self):
        return f"{self.nomina.trabajador.nombre_completo} - {self.get_concepto_display()}"


# ============================================================================
# PRÉSTAMOS
# ============================================================================

class Prestamo(models.Model):
    """Registro de préstamos otorgados a trabajadores"""
    
    TIPO_PAGO_CHOICES = [
        ('UNICO', 'Pago Único'),
        ('CUOTAS', 'Cuotas'),
    ]
    
    ESTADO_CHOICES = [
        ('ACTIVO', 'Activo'),
        ('PAGADO', 'Pagado'),
        ('CANCELADO', 'Cancelado'),
    ]
    
    trabajador = models.ForeignKey(
        Trabajador,
        on_delete=models.CASCADE,
        related_name='prestamos'
    )
    monto_total = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))]
    )
    fecha_prestamo = models.DateField()
    tipo_pago = models.CharField(max_length=20, choices=TIPO_PAGO_CHOICES)
    numero_cuotas = models.IntegerField(
        null=True,
        blank=True,
        validators=[MinValueValidator(1)]
    )
    valor_cuota = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True
    )
    saldo_pendiente = models.DecimalField(
        max_digits=12,
        decimal_places=2
    )
    estado = models.CharField(max_length=20, choices=ESTADO_CHOICES, default='ACTIVO')
    observaciones = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(
        Usuario,
        on_delete=models.SET_NULL,
        null=True,
        related_name='prestamos_creados'
    )
    
    class Meta:
        verbose_name = "Préstamo"
        verbose_name_plural = "Préstamos"
        ordering = ['-fecha_prestamo']
        
    def __str__(self):
        return f"{self.trabajador.nombre_completo} - ${self.monto_total} ({self.fecha_prestamo})"


class CuotaPrestamo(models.Model):
    """Cuotas de cada préstamo"""
    
    ESTADO_CHOICES = [
        ('PENDIENTE', 'Pendiente'),
        ('DESCONTADA', 'Descontada'),
        ('CANCELADA', 'Cancelada'),
    ]
    
    prestamo = models.ForeignKey(
        Prestamo,
        on_delete=models.CASCADE,
        related_name='cuotas'
    )
    numero_cuota = models.IntegerField()
    valor_cuota = models.DecimalField(
        max_digits=12,
        decimal_places=2
    )
    quincena = models.ForeignKey(
        Quincena,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='cuotas_descontadas'
    )
    nomina = models.ForeignKey(
        Nomina,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='cuotas_descontadas'
    )
    fecha_descuento = models.DateField(null=True, blank=True)
    estado = models.CharField(max_length=20, choices=ESTADO_CHOICES, default='PENDIENTE')
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = "Cuota de Préstamo"
        verbose_name_plural = "Cuotas de Préstamos"
        ordering = ['prestamo', 'numero_cuota']
        
    def __str__(self):
        return f"Préstamo {self.prestamo.id} - Cuota {self.numero_cuota}"


# ============================================================================
# AUDITORÍA
# ============================================================================

class AuditoriaLog(models.Model):
    """Registro de todas las acciones importantes en el sistema"""
    
    ACCION_CHOICES = [
        ('CREATE', 'Crear'),
        ('UPDATE', 'Actualizar'),
        ('DELETE', 'Eliminar'),
        ('VIEW_SENSITIVE', 'Ver Información Sensible'),
    ]
    
    usuario = models.ForeignKey(
        Usuario,
        on_delete=models.SET_NULL,
        null=True,
        related_name='acciones_auditoria'
    )
    accion = models.CharField(max_length=20, choices=ACCION_CHOICES)
    tabla_afectada = models.CharField(max_length=100)
    registro_id = models.IntegerField()
    datos_anteriores = models.JSONField(null=True, blank=True)
    datos_nuevos = models.JSONField(null=True, blank=True)
    ip_address = models.GenericIPAddressField()
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = "Log de Auditoría"
        verbose_name_plural = "Logs de Auditoría"
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['tabla_afectada', 'registro_id']),
            models.Index(fields=['-created_at']),
        ]
        
    def __str__(self):
        return f"{self.usuario} - {self.get_accion_display()} - {self.tabla_afectada} ({self.created_at})"