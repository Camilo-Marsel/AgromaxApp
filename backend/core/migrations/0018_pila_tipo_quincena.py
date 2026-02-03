# Migration to add tipo and quincena fields to PILA model

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0017_contrato_recibe_auxilio_transporte'),
    ]

    operations = [
        # Add tipo field
        migrations.AddField(
            model_name='pila',
            name='tipo',
            field=models.CharField(
                choices=[('MES', 'Mensual'), ('QUINCENA', 'Quincenal')],
                default='MES',
                max_length=10,
            ),
        ),
        # Add quincena FK
        migrations.AddField(
            model_name='pila',
            name='quincena',
            field=models.ForeignKey(
                blank=True,
                help_text='Quincena específica (solo para tipo QUINCENA)',
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='pilas',
                to='core.quincena',
            ),
        ),
        # Remove old unique constraint
        migrations.RemoveConstraint(
            model_name='pila',
            name='unique_pila_periodo',
        ),
        # Add new constraints
        migrations.AddConstraint(
            model_name='pila',
            constraint=models.UniqueConstraint(
                condition=models.Q(('tipo', 'MES')),
                fields=['mes', 'año'],
                name='unique_pila_mes',
            ),
        ),
        migrations.AddConstraint(
            model_name='pila',
            constraint=models.UniqueConstraint(
                condition=models.Q(('tipo', 'QUINCENA')) & ~models.Q(('quincena', None)),
                fields=['quincena'],
                name='unique_pila_quincena',
            ),
        ),
        # Update ARL help_text
        migrations.AlterField(
            model_name='pila',
            name='total_arl',
            field=models.DecimalField(
                decimal_places=2,
                default=0,
                help_text='Total aporte ARL (1.044%)',
                max_digits=15,
            ),
        ),
    ]
