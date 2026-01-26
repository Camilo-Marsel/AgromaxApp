# backend/core/models/obligations.py
# Obligaciones Laborales: Seguridad Social (PILA) y Prestaciones Sociales

from django.db import models
from django.core.validators import MinValueValidator
from decimal import Decimal


# ============================================================================
# PILA - Planilla Integrada de Liquidación de Aportes (Seguridad Social)
# ============================================================================

class PILA(models.Model):
    """
    Registro mensual de aportes a seguridad social.
    Se calcula basado en el IBC (Ingreso Base de Cotización) de cada trabajador.

    Porcentajes empresa (exonerada de SENA e ICBF):
    - Salud: 8.5%
    - Pensión: 12%
    - ARL: 0.522% (nivel I)
    - Caja de Compensación: 4%
    """

    ESTADO_CHOICES = [
        ('BORRADOR', 'Borrador'),
        ('CALCULADA', 'Calculada'),
        ('PAGADA', 'Pagada'),
    ]

    # Periodo
    mes = models.IntegerField(validators=[MinValueValidator(1)])
    año = models.IntegerField(validators=[MinValueValidator(2020)])

    # Totales consolidados
    total_ibc = models.DecimalField(
        max_digits=15, decimal_places=2, default=Decimal('0'),
        help_text='Total IBC de todos los trabajadores'
    )
    total_salud = models.DecimalField(
        max_digits=15, decimal_places=2, default=Decimal('0'),
        help_text='Total aporte salud empleador (8.5%)'
    )
    total_pension = models.DecimalField(
        max_digits=15, decimal_places=2, default=Decimal('0'),
        help_text='Total aporte pensión empleador (12%)'
    )
    total_arl = models.DecimalField(
        max_digits=15, decimal_places=2, default=Decimal('0'),
        help_text='Total aporte ARL (0.522%)'
    )
    total_caja = models.DecimalField(
        max_digits=15, decimal_places=2, default=Decimal('0'),
        help_text='Total aporte Caja Compensación (4%)'
    )
    total_aportes = models.DecimalField(
        max_digits=15, decimal_places=2, default=Decimal('0'),
        help_text='Total aportes seguridad social'
    )

    # Estado y tracking
    estado = models.CharField(max_length=20, choices=ESTADO_CHOICES, default='BORRADOR')
    fecha_pago = models.DateField(null=True, blank=True)
    numero_planilla = models.CharField(max_length=50, blank=True, help_text='Número de planilla PILA')
    observaciones = models.TextField(blank=True)

    # Auditoría
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        'Usuario',
        on_delete=models.SET_NULL,
        null=True,
        related_name='pilas_creadas'
    )

    class Meta:
        verbose_name = 'PILA'
        verbose_name_plural = 'PILAs'
        ordering = ['-año', '-mes']
        constraints = [
            models.UniqueConstraint(
                fields=['mes', 'año'],
                name='unique_pila_periodo'
            )
        ]

    def __str__(self):
        return f"PILA {self.mes:02d}/{self.año}"

    @property
    def periodo_display(self):
        meses = ['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
        return f"{meses[self.mes]} {self.año}"


class DetallePILA(models.Model):
    """
    Detalle de aportes por trabajador para cada periodo de PILA.
    """

    pila = models.ForeignKey(
        PILA,
        on_delete=models.CASCADE,
        related_name='detalles'
    )
    trabajador = models.ForeignKey(
        'Trabajador',
        on_delete=models.CASCADE,
        related_name='aportes_pila'
    )

    # Base de cotización
    ibc = models.DecimalField(
        max_digits=12, decimal_places=2,
        help_text='Ingreso Base de Cotización del mes'
    )
    dias_cotizados = models.IntegerField(
        default=30,
        help_text='Días cotizados en el mes'
    )

    # Aportes empleador
    aporte_salud = models.DecimalField(
        max_digits=12, decimal_places=2,
        help_text='Aporte salud empleador 8.5%'
    )
    aporte_pension = models.DecimalField(
        max_digits=12, decimal_places=2,
        help_text='Aporte pensión empleador 12%'
    )
    aporte_arl = models.DecimalField(
        max_digits=12, decimal_places=2,
        help_text='Aporte ARL 0.522%'
    )
    aporte_caja = models.DecimalField(
        max_digits=12, decimal_places=2,
        help_text='Aporte Caja Compensación 4%'
    )
    total_aportes = models.DecimalField(
        max_digits=12, decimal_places=2,
        help_text='Total aportes del trabajador'
    )

    # Referencia a nómina (para trazabilidad)
    nomina = models.ForeignKey(
        'Nomina',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='aportes_pila'
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Detalle PILA'
        verbose_name_plural = 'Detalles PILA'
        ordering = ['pila', 'trabajador__apellidos']
        constraints = [
            models.UniqueConstraint(
                fields=['pila', 'trabajador'],
                name='unique_pila_trabajador'
            )
        ]

    def __str__(self):
        return f"{self.pila} - {self.trabajador.nombre_completo}"


# ============================================================================
# PRESTACIONES SOCIALES (Provisiones)
# ============================================================================

class ProvisionPrestaciones(models.Model):
    """
    Provisión mensual de prestaciones sociales por trabajador.
    Se calcula sobre el salario devengado de cada periodo.

    Porcentajes:
    - Cesantías: 8.33%
    - Intereses Cesantías: 1% (sobre cesantías acumuladas)
    - Prima: 8.33%
    - Vacaciones: 4.17%
    """

    # Periodo
    mes = models.IntegerField(validators=[MinValueValidator(1)])
    año = models.IntegerField(validators=[MinValueValidator(2020)])

    trabajador = models.ForeignKey(
        'Trabajador',
        on_delete=models.CASCADE,
        related_name='provisiones_prestaciones'
    )

    # Base de cálculo
    salario_base = models.DecimalField(
        max_digits=12, decimal_places=2,
        help_text='Salario devengado del mes'
    )

    # Provisiones del mes
    cesantias = models.DecimalField(
        max_digits=12, decimal_places=2,
        help_text='Provisión cesantías 8.33%'
    )
    intereses_cesantias = models.DecimalField(
        max_digits=12, decimal_places=2,
        help_text='Provisión intereses cesantías 1%'
    )
    prima = models.DecimalField(
        max_digits=12, decimal_places=2,
        help_text='Provisión prima 8.33%'
    )
    vacaciones = models.DecimalField(
        max_digits=12, decimal_places=2,
        help_text='Provisión vacaciones 4.17%'
    )
    total_provision = models.DecimalField(
        max_digits=12, decimal_places=2,
        help_text='Total provisión del mes'
    )

    # Referencia a nómina
    nomina = models.ForeignKey(
        'Nomina',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='provisiones'
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Provisión Prestaciones'
        verbose_name_plural = 'Provisiones Prestaciones'
        ordering = ['-año', '-mes', 'trabajador__apellidos']
        constraints = [
            models.UniqueConstraint(
                fields=['mes', 'año', 'trabajador'],
                name='unique_provision_periodo_trabajador'
            )
        ]

    def __str__(self):
        return f"{self.trabajador.nombre_completo} - {self.mes:02d}/{self.año}"


class ResumenPrestaciones(models.Model):
    """
    Resumen consolidado mensual de todas las provisiones.
    Permite ver el total a provisionar por la empresa cada mes.
    """

    # Periodo
    mes = models.IntegerField(validators=[MinValueValidator(1)])
    año = models.IntegerField(validators=[MinValueValidator(2020)])

    # Totales consolidados
    total_salario_base = models.DecimalField(
        max_digits=15, decimal_places=2, default=Decimal('0'),
        help_text='Total salarios devengados'
    )
    total_cesantias = models.DecimalField(
        max_digits=15, decimal_places=2, default=Decimal('0')
    )
    total_intereses_cesantias = models.DecimalField(
        max_digits=15, decimal_places=2, default=Decimal('0')
    )
    total_prima = models.DecimalField(
        max_digits=15, decimal_places=2, default=Decimal('0')
    )
    total_vacaciones = models.DecimalField(
        max_digits=15, decimal_places=2, default=Decimal('0')
    )
    total_provisiones = models.DecimalField(
        max_digits=15, decimal_places=2, default=Decimal('0')
    )

    # Número de trabajadores
    num_trabajadores = models.IntegerField(default=0)

    # Auditoría
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        'Usuario',
        on_delete=models.SET_NULL,
        null=True,
        related_name='resumenes_prestaciones_creados'
    )

    class Meta:
        verbose_name = 'Resumen Prestaciones'
        verbose_name_plural = 'Resúmenes Prestaciones'
        ordering = ['-año', '-mes']
        constraints = [
            models.UniqueConstraint(
                fields=['mes', 'año'],
                name='unique_resumen_prestaciones_periodo'
            )
        ]

    def __str__(self):
        return f"Prestaciones {self.mes:02d}/{self.año}"

    @property
    def periodo_display(self):
        meses = ['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
        return f"{meses[self.mes]} {self.año}"


# ============================================================================
# CONSTANTES DE CÁLCULO
# ============================================================================

# Porcentajes de Seguridad Social (empleador)
PORCENTAJE_SALUD_EMPLEADOR = Decimal('0.085')      # 8.5%
PORCENTAJE_PENSION_EMPLEADOR = Decimal('0.12')     # 12%
PORCENTAJE_ARL = Decimal('0.00522')                # 0.522% (Nivel I)
PORCENTAJE_CAJA_COMPENSACION = Decimal('0.04')     # 4%

# Porcentajes de Prestaciones Sociales
PORCENTAJE_CESANTIAS = Decimal('0.0833')           # 8.33%
PORCENTAJE_INTERESES_CESANTIAS = Decimal('0.01')   # 1% mensual sobre cesantías
PORCENTAJE_PRIMA = Decimal('0.0833')               # 8.33%
PORCENTAJE_VACACIONES = Decimal('0.0417')          # 4.17%
