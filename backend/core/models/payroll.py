# backend/core/models/payroll.py

from django.db import models
from django.core.validators import MinValueValidator
from decimal import Decimal

# ============================================================================
# VARIABLES DE NÓMINA
# ============================================================================

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
        'hr.Usuario',
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
        'hr.Trabajador',
        on_delete=models.CASCADE,
        related_name='nominas'
    )
    quincena = models.ForeignKey(
        'labor.Quincena',
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
        'hr.Usuario',
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
        'labor.Labor',
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
