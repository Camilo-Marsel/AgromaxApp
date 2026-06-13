# backend/core/models/inventario.py

from decimal import Decimal
from django.db import models
from django.core.validators import MinValueValidator


class Producto(models.Model):
    """Catálogo global de productos/insumos. No contiene stock — eso vive en StockFinca."""

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

    nombre      = models.CharField(max_length=100)
    descripcion = models.TextField(blank=True)
    categoria   = models.CharField(max_length=20, choices=CATEGORIA_CHOICES, default='OTROS')
    unidad      = models.CharField(max_length=10, choices=UNIDAD_CHOICES, default='UNIDADES')
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


class StockFinca(models.Model):
    """Stock de un producto en una bodega. Unique: (producto, bodega)."""
    producto     = models.ForeignKey(
        Producto, on_delete=models.PROTECT, related_name='stocks',
    )
    bodega       = models.ForeignKey(
        'Bodega', on_delete=models.PROTECT,
        related_name='stocks', null=True, blank=True,
    )
    stock_actual = models.DecimalField(
        max_digits=12, decimal_places=2, default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00'))],
    )
    stock_minimo = models.DecimalField(
        max_digits=12, decimal_places=2, default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00'))],
    )
    activo       = models.BooleanField(default=True)
    created_by   = models.ForeignKey(
        'Usuario', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='stocks_creados',
    )
    created_at   = models.DateTimeField(auto_now_add=True)
    updated_at   = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['producto__categoria', 'producto__nombre', 'bodega__nombre']
        verbose_name = 'Stock por Bodega'
        verbose_name_plural = 'Stocks por Bodega'

    def __str__(self):
        ubicacion = self.bodega.nombre if self.bodega else '—'
        return f'{self.producto.nombre} — {ubicacion}'

    @property
    def stock_bajo(self):
        return self.stock_minimo > 0 and self.stock_actual <= self.stock_minimo

    @property
    def bodega_nombre(self):
        return self.bodega.nombre if self.bodega else '—'


class MovimientoInventario(models.Model):
    TIPO_CHOICES = [
        ('ENTRADA', 'Entrada'),
        ('SALIDA',  'Salida'),
        ('AJUSTE',  'Ajuste'),
    ]

    stock_finca    = models.ForeignKey(
        StockFinca, on_delete=models.PROTECT, related_name='movimientos',
    )
    tipo           = models.CharField(max_length=10, choices=TIPO_CHOICES)
    cantidad       = models.DecimalField(
        max_digits=12, decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))],
    )
    stock_antes    = models.DecimalField(max_digits=12, decimal_places=2)
    stock_despues  = models.DecimalField(max_digits=12, decimal_places=2)
    fecha          = models.DateField()
    fecha_consumo  = models.DateField(null=True, blank=True)
    lote           = models.ForeignKey(
        'Lote', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='movimientos_inventario',
    )
    trabajador     = models.ForeignKey(
        'Trabajador', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='movimientos_inventario',
    )
    observaciones  = models.TextField(blank=True)
    # Reservado para Fase 2: vincular con quincena al calcular consumo
    referencia_tipo = models.CharField(max_length=30, blank=True)
    referencia_id   = models.PositiveIntegerField(null=True, blank=True)
    created_by     = models.ForeignKey(
        'Usuario', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='movimientos_inventario',
    )
    created_at     = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-fecha', '-created_at']
        verbose_name = 'Movimiento de Inventario'
        verbose_name_plural = 'Movimientos de Inventario'

    def __str__(self):
        return (
            f'{self.get_tipo_display()} {self.cantidad} '
            f'{self.stock_finca.producto.get_unidad_display()} — '
            f'{self.stock_finca.producto.nombre}'
        )
