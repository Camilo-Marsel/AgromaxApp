from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0026_lote_campos_tecnicos'),
    ]

    operations = [
        migrations.AddField(
            model_name='resumenprestaciones',
            name='finca',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='resumenes_prestaciones',
                to='core.finca',
            ),
        ),
        migrations.RemoveConstraint(
            model_name='resumenprestaciones',
            name='unique_resumen_prestaciones_periodo',
        ),
        migrations.AddConstraint(
            model_name='resumenprestaciones',
            constraint=models.UniqueConstraint(
                fields=['mes', 'año', 'finca'],
                name='unique_resumen_prestaciones_periodo_finca',
            ),
        ),
    ]
