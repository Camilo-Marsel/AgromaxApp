# backend/core/migrations/0021_inventario_stock_por_finca.py
#
# Rehace el módulo de inventario desde cero:
#   - Producto queda como catálogo puro (sin stock ni finca)
#   - Nuevo modelo StockFinca: (producto, finca) con stock_actual / stock_minimo
#   - MovimientoInventario apunta a StockFinca en lugar de a Producto
#
# No hay datos reales en estas tablas todavía, así que borramos y recreamos.

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import django.core.validators
from decimal import Decimal


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0020_add_inventario_models'),
    ]

    operations = [
        # ── 1. Borrar tablas anteriores ──────────────────────────────────────
        migrations.DeleteModel(name='MovimientoInventario'),
        migrations.DeleteModel(name='Producto'),

        # ── 2. Producto (catálogo) ────────────────────────────────────────────
        migrations.CreateModel(
            name='Producto',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('nombre',      models.CharField(max_length=100)),
                ('descripcion', models.TextField(blank=True)),
                ('categoria',   models.CharField(
                    choices=[
                        ('AGROQUIMICOS', 'Agroquímicos'),
                        ('MATERIALES',   'Materiales'),
                        ('HERRAMIENTAS', 'Herramientas'),
                        ('COMBUSTIBLES', 'Combustibles'),
                        ('OTROS',        'Otros'),
                    ],
                    default='OTROS', max_length=20,
                )),
                ('unidad', models.CharField(
                    choices=[
                        ('KG',       'Kilogramos'),
                        ('LITROS',   'Litros'),
                        ('UNIDADES', 'Unidades'),
                        ('ROLLOS',   'Rollos'),
                        ('METROS',   'Metros'),
                        ('SACOS',    'Sacos'),
                        ('CAJAS',    'Cajas'),
                    ],
                    default='UNIDADES', max_length=10,
                )),
                ('activo',     models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('created_by', models.ForeignKey(
                    blank=True, null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='productos_creados',
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={
                'verbose_name': 'Producto',
                'verbose_name_plural': 'Productos',
                'ordering': ['categoria', 'nombre'],
            },
        ),

        # ── 3. StockFinca ─────────────────────────────────────────────────────
        migrations.CreateModel(
            name='StockFinca',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('stock_actual', models.DecimalField(
                    decimal_places=2, default=Decimal('0.00'), max_digits=12,
                    validators=[django.core.validators.MinValueValidator(Decimal('0.00'))],
                )),
                ('stock_minimo', models.DecimalField(
                    decimal_places=2, default=Decimal('0.00'), max_digits=12,
                    validators=[django.core.validators.MinValueValidator(Decimal('0.00'))],
                )),
                ('activo',     models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('producto', models.ForeignKey(
                    on_delete=django.db.models.deletion.PROTECT,
                    related_name='stocks',
                    to='core.producto',
                )),
                ('finca', models.ForeignKey(
                    blank=True, null=True,
                    on_delete=django.db.models.deletion.PROTECT,
                    related_name='stocks_inventario',
                    to='core.finca',
                )),
                ('created_by', models.ForeignKey(
                    blank=True, null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='stocks_creados',
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={
                'verbose_name': 'Stock por Finca',
                'verbose_name_plural': 'Stocks por Finca',
                'ordering': ['producto__categoria', 'producto__nombre', 'finca__nombre'],
            },
        ),

        # ── 4. MovimientoInventario ───────────────────────────────────────────
        migrations.CreateModel(
            name='MovimientoInventario',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('tipo', models.CharField(
                    choices=[
                        ('ENTRADA', 'Entrada'),
                        ('SALIDA',  'Salida'),
                        ('AJUSTE',  'Ajuste'),
                    ],
                    max_length=10,
                )),
                ('cantidad', models.DecimalField(
                    decimal_places=2, max_digits=12,
                    validators=[django.core.validators.MinValueValidator(Decimal('0.01'))],
                )),
                ('stock_antes',   models.DecimalField(decimal_places=2, max_digits=12)),
                ('stock_despues', models.DecimalField(decimal_places=2, max_digits=12)),
                ('fecha',         models.DateField()),
                ('observaciones', models.TextField(blank=True)),
                ('referencia_tipo', models.CharField(blank=True, max_length=30)),
                ('referencia_id',   models.PositiveIntegerField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('stock_finca', models.ForeignKey(
                    on_delete=django.db.models.deletion.PROTECT,
                    related_name='movimientos',
                    to='core.stockfinca',
                )),
                ('created_by', models.ForeignKey(
                    blank=True, null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='movimientos_inventario',
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={
                'verbose_name': 'Movimiento de Inventario',
                'verbose_name_plural': 'Movimientos de Inventario',
                'ordering': ['-fecha', '-created_at'],
            },
        ),
    ]
