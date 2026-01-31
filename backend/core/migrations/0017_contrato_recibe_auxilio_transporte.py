# Generated manually - Agregar campo recibe_auxilio_transporte a Contrato

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0016_registrolabor_cantidad_4_decimales'),
    ]

    operations = [
        migrations.AddField(
            model_name='contrato',
            name='recibe_auxilio_transporte',
            field=models.BooleanField(
                default=True,
                help_text='Indica si el trabajador recibe auxilio de transporte en este contrato',
                verbose_name='Recibe Auxilio de Transporte',
            ),
        ),
    ]
