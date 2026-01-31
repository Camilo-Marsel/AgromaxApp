# Generated manually - Aumentar decimales de cantidad en RegistroLabor
#
# Cambios:
# - RegistroLabor.cantidad: decimal_places=2 → decimal_places=4
# - MinValueValidator: 0.01 → 0.0001

from decimal import Decimal

from django.core.validators import MinValueValidator
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0015_rename_labores_especiales'),
    ]

    operations = [
        migrations.AlterField(
            model_name='registrolabor',
            name='cantidad',
            field=models.DecimalField(
                decimal_places=4,
                help_text='Cantidad según unidad de medida',
                max_digits=10,
                validators=[MinValueValidator(Decimal('0.0001'))],
            ),
        ),
    ]
