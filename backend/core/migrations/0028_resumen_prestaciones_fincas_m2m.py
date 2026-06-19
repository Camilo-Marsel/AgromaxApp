from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0027_resumen_prestaciones_finca'),
    ]

    operations = [
        # Quitar constraint del 0027
        migrations.RemoveConstraint(
            model_name='resumenprestaciones',
            name='unique_resumen_prestaciones_periodo_finca',
        ),
        # Quitar FK finca del 0027
        migrations.RemoveField(
            model_name='resumenprestaciones',
            name='finca',
        ),
        # Agregar M2M fincas
        migrations.AddField(
            model_name='resumenprestaciones',
            name='fincas',
            field=models.ManyToManyField(
                blank=True,
                related_name='resumenes_prestaciones',
                to='core.finca',
            ),
        ),
    ]
