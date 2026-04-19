# backend/core/models/inventario.py

from decimal import Decimal
from django.db import models
from django.core.validators import MinValueValidator


class Producto(models.Model):
    CATEGORIA_CHOICES = [
        ('AGROQUIMICOS',  'Agroquímicos'),
        ('MATERIALES',    'Materiales'),
        ('HERRAMIENTAS',  'Herramientas'),
        ('COMBUSTIBLES',  'Combustibles'),
        ('OTROS',         'Otros'),
    ]

    UNIDAD_CHOICES = [
        ('KG',       'Kilogramos'),
        ('LITROS',   'Litros'),
        ('UNIDADES', 'Unidades'),
        ('ROLLOS',   'Rollos'),
        ('METROS',   'Metros'),
        ('SACOS',    'Sacos'),
        ('CAJAS',    'Cajas'),
    ]

    nombre       = models.CharField(max_length=100)
    descripcion  = models.TextField(blank=True)
    categoria    = models.CharField(max_length=20, choices=CATEGORIA_CHOICES, default='OTROS')
    unidad       = models.CharField(max_length=10, choices=UNIDAD_CHOICES, default='UNIDADES')
    stock_actual = models.DecimalField(
        max_digits=12, decimal_places=2, default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00'))],
    )
    stock_minimo = models.DecimalField(
        max_digits=12, decimal_places=2, default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00'))],
    )
    finca   = models.ForeignKey(
        'Finca', on_delete=models.PROTECT,
        related_name='productos', null=True, blank=True,
    )
    activo      = models.BooleanField(default=True)
    created_by  = models.ForeignKey(
        'Usuario', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='productos_creados',
    )
    created_at  = models.DateTimeField(auto_now_add=True)
    updated_at  = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['categoria', 'nombre']
        verbose_name = 'Producto'
        verbose_name_plural = 'Productos'

    def __str__(self):
        return f'{self.nombre} ({self.get_unidad_display()})'

    @property
    def stock_bajo(self):
        return self.stock_actual <= self.stock_minimo and self.stock_minimo > 0

    @property
    def stock_disponible(self):
        return self.stock_actual


class MovimientoInventario(models.Model):
    TIPO_CHOICES = [
        ('ENTRADA', 'Entrada'),
        ('SALIDA',  'Salida'),
        ('AJUSTE',  'Ajuste'),
    ]

    producto           = models.ForeignKey(
        Producto, on_delete=models.PROTECT, related_name='movimientos',
    )
    tipo               = models.CharField(max_length=10, choices=TIPO_CHOICES)
    cantidad           = models.DecimalField(
        max_digits=12, decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))],
    )
    stock_antes        = models.DecimalField(max_digits=12, decimal_places=2)
    stock_despues      = models.DecimalField(max_digits=12, decimal_places=2)
    fecha              = models.DateField()
    observaciones      = models.TextField(blank=True)
    # Referencia para Fase 2: vincular con quincena/registro de labor
    referencia_tipo    = models.CharField(max_length=30, blank=True)
    referencia_id      = models.PositiveIntegerField(null=True, blank=True)
    created_by         = models.ForeignKey(
        'Usuario', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='movimientos_inventario',
    )
    created_at         = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-fecha', '-created_at']
        verbose_name = 'Movimiento de Inventario'
        verbose_name_plural = 'Movimientos de Inventario'

    def __str__(self):
        return f'{self.get_tipo_display()} {self.cantidad} {self.producto.unidad} — {self.producto.nombre}'
