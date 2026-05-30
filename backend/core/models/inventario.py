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
    """
    Stock de un producto en una finca (o en bodega central si finca=None).
    Unique: (producto, finca) — aplicado a nivel de código para manejar el null.
    """
    producto     = models.ForeignKey(
        Producto, on_delete=models.PROTECT, related_name='stocks',
    )
    # finca=None → bodega central compartida por todas las fincas
    finca        = models.ForeignKey(
        'Finca', on_delete=models.PROTECT,
        related_name='stocks_inventario', null=True, blank=True,
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
        ordering = ['producto__categoria', 'producto__nombre', 'finca__nombre']
        verbose_name = 'Stock por Finca'
        verbose_name_plural = 'Stocks por Finca'

    def __str__(self):
        ubicacion = self.finca.nombre if self.finca else 'Bodega Central'
        return f'{self.producto.nombre} — {ubicacion}'

    @property
    def stock_bajo(self):
        return self.stock_minimo > 0 and self.stock_actual <= self.stock_minimo

    @property
    def finca_nombre(self):
        return self.finca.nombre if self.finca else 'Bodega Central'


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
