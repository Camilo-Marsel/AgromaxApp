from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0025_config_produccion_colores_cinta'),
    ]

    operations = [
        # Remove old fields
        migrations.RemoveField(model_name='lote', name='medida'),
        migrations.RemoveField(model_name='lote', name='unidad_medida'),

        # Add new fields
        migrations.AddField(
            model_name='lote',
            name='numero_lote',
            field=models.PositiveSmallIntegerField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='lote',
            name='canal_primario_longitud',
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=10, null=True),
        ),
        migrations.AddField(
            model_name='lote',
            name='canal_primario_area',
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=12, null=True),
        ),
        migrations.AddField(
            model_name='lote',
            name='canal_secundario_longitud',
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=10, null=True),
        ),
        migrations.AddField(
            model_name='lote',
            name='canal_secundario_area',
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=12, null=True),
        ),
        migrations.AddField(
            model_name='lote',
            name='canal_terciario_longitud',
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=10, null=True),
        ),
        migrations.AddField(
            model_name='lote',
            name='canal_terciario_area',
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=12, null=True),
        ),
        migrations.AddField(
            model_name='lote',
            name='cables_longitud',
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=10, null=True),
        ),
        migrations.AddField(
            model_name='lote',
            name='cables_area',
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=12, null=True),
        ),
        migrations.AddField(
            model_name='lote',
            name='area_bruta',
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=14, null=True),
        ),
        migrations.AddField(
            model_name='lote',
            name='area_neta',
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=14, null=True),
        ),
        migrations.AlterModelOptions(
            name='lote',
            options={
                'ordering': ['finca', 'numero_lote', 'nombre'],
                'verbose_name': 'Lote',
                'verbose_name_plural': 'Lotes',
            },
        ),
    ]
