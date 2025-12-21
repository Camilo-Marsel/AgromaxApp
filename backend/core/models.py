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


class Finca(models.Model):
    """Fincas donde trabajan los empleados"""
    nombre = models.CharField(max_length=100, unique=True)
    ubicacion = models.CharField(max_length=200, blank=True, null=True)
    activa = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'fincas'
        verbose_name = 'Finca'
        verbose_name_plural = 'Fincas'
        ordering = ['nombre']
    
    def __str__(self):
        return self.nombre


class Lote(models.Model):
    """Lotes que pertenecen a una finca"""
    UNIDAD_MEDIDA_CHOICES = [
        ('HECTAREA', 'Hectárea'),
        ('METRO_CUADRADO', 'Metro Cuadrado'),
    ]
    
    finca = models.ForeignKey(
        Finca,
        on_delete=models.CASCADE,
        related_name='lotes'
    )
    nombre = models.CharField(max_length=100)
    medida = models.DecimalField(max_digits=10, decimal_places=2)
    unidad_medida = models.CharField(
        max_length=20,
        choices=UNIDAD_MEDIDA_CHOICES,
        default='HECTAREA'
    )
    activo = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'lotes'
        verbose_name = 'Lote'
        verbose_name_plural = 'Lotes'
        ordering = ['finca', 'nombre']
        unique_together = [['finca', 'nombre']]
    
    def __str__(self):
        return f"{self.finca.nombre} - {self.nombre}"


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
    
    finca = models.ForeignKey(  # NUEVO
        Finca,
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
    tipo_cuenta_bancaria = models.CharField(  # NUEVO
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
        db_table = 'registros_labor'
        verbose_name = 'Registro de Labor'
        verbose_name_plural = 'Registros de Labor'
        ordering = ['-fecha', 'trabajador']
        # REMOVER: unique_together = [['trabajador', 'fecha', 'quincena']]
        # Ya no hay restricción única, la validación será en clean()
    
    def __str__(self):
        return f"{self.trabajador.nombre_completo} - {self.labor.nombre} - {self.fecha}"
    
    def clean(self):
        """Validaciones personalizadas"""
        from django.core.exceptions import ValidationError
        
        # Validar que no sea domingo
        if self.fecha.weekday() == 6:  # 6 = domingo
            raise ValidationError('No se pueden registrar labores en domingo')
        
        # Validar que la fecha esté dentro de la quincena
        if not (self.quincena.fecha_inicio <= self.fecha <= self.quincena.fecha_fin):
            raise ValidationError('La fecha debe estar dentro de la quincena')
        
        # Validar duplicados: NO permitir múltiples labores el mismo día
        # EXCEPCIÓN: "Control" SÍ puede coexistir con otras labores
        registros_mismo_dia = RegistroLabor.objects.filter(
            trabajador=self.trabajador,
            fecha=self.fecha,
            quincena=self.quincena
        )
        
        # Si estamos editando, excluir el registro actual
        if self.pk:
            registros_mismo_dia = registros_mismo_dia.exclude(pk=self.pk)
        
        if registros_mismo_dia.exists():
            # Obtener las labores existentes ese día
            labores_existentes = registros_mismo_dia.values_list('labor__nombre', flat=True)
            labor_actual = self.labor.nombre
            
            # Caso 1: Si ya existe "Control", solo permitir agregar otra "Control"
            if 'Control' in labores_existentes and labor_actual != 'Control':
                raise ValidationError(
                    'Ya existe un registro de Control para este día. '
                    'Solo puede agregar más registros de Control.'
                )
            
            # Caso 2: Si existe otra labor (no Control), solo permitir agregar "Control"
            otras_labores = [l for l in labores_existentes if l != 'Control']
            if otras_labores and labor_actual != 'Control':
                raise ValidationError(
                    f'Ya existe un registro de {otras_labores[0]} para este día. '
                    f'Solo puede agregar Control como labor adicional.'
                )
            
            # Caso 3: Si estamos agregando Control, está permitido siempre
            # (no se lanza error)
    
    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)


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

    # Ajustes manuales
    devengos_adicionales = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        verbose_name='Devengos Adicionales',
        help_text='Bonos, horas extra, etc.'
    )
    
    descripcion_devengos_adicionales = models.TextField(
        blank=True,
        null=True,
        verbose_name='Descripción de Devengos Adicionales'
    )
    
    deducciones_adicionales = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        verbose_name='Deducciones Adicionales',
        help_text='Sanciones, descuentos varios, etc.'
    )
    
    descripcion_deducciones_adicionales = models.TextField(
        blank=True,
        null=True,
        verbose_name='Descripción de Deducciones Adicionales'
    )
    
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
    updated_at = models.DateTimeField(auto_now=True)
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