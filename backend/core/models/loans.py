# backend/core/models/loans.py
# NOTA: Internamente se llama "Prestamo" pero se muestra como "Adelanto de Nómina"
# por requerimientos legales (no se pueden descontar préstamos del salario)

from django.db import models
from django.core.validators import MinValueValidator
from decimal import Decimal

# ============================================================================
# ADELANTOS DE NÓMINA (antes llamados "Préstamos")
# ============================================================================

class Prestamo(models.Model):
    """Registro de adelantos de nómina otorgados a trabajadores"""

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
        'Trabajador',
        on_delete=models.CASCADE,
        related_name='prestamos'  # Mantener por compatibilidad
    )
    monto_total = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))]
    )
    fecha_prestamo = models.DateField()  # Campo interno, se muestra como "Fecha del adelanto"
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
        'Usuario',
        on_delete=models.SET_NULL,
        null=True,
        related_name='prestamos_creados'
    )

    class Meta:
        verbose_name = "Adelanto de Nómina"
        verbose_name_plural = "Adelantos de Nómina"
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
        'Quincena',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='cuotas_descontadas'
    )
    nomina = models.ForeignKey(
        'Nomina',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='cuotas_descontadas'
    )
    fecha_descuento = models.DateField(null=True, blank=True)
    estado = models.CharField(max_length=20, choices=ESTADO_CHOICES, default='PENDIENTE')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Cuota de Adelanto"
        verbose_name_plural = "Cuotas de Adelantos"
        ordering = ['prestamo', 'numero_cuota']

    def __str__(self):
        return f"Adelanto {self.prestamo.id} - Cuota {self.numero_cuota}"
