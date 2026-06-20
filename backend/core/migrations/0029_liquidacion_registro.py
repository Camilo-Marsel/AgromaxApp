from django.db import migrations, models
import django.db.models.deletion
from django.conf import settings


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0028_resumen_prestaciones_fincas_m2m'),
    ]

    operations = [
        migrations.CreateModel(
            name='LiquidacionRegistro',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('fecha_ingreso', models.DateField()),
                ('fecha_retiro', models.DateField()),
                ('dias_trabajados', models.IntegerField(default=0)),
                ('meses_calculados', models.IntegerField(default=0)),
                ('fuente', models.CharField(choices=[('provisiones', 'Provisiones PILA'), ('nominas', 'Nóminas aprobadas')], default='nominas', max_length=20)),
                ('salario_base_total', models.DecimalField(decimal_places=2, default=0, max_digits=15)),
                ('cesantias', models.DecimalField(decimal_places=2, default=0, max_digits=15)),
                ('intereses_cesantias', models.DecimalField(decimal_places=2, default=0, max_digits=15)),
                ('prima', models.DecimalField(decimal_places=2, default=0, max_digits=15)),
                ('vacaciones', models.DecimalField(decimal_places=2, default=0, max_digits=15)),
                ('total', models.DecimalField(decimal_places=2, default=0, max_digits=15)),
                ('estado', models.CharField(choices=[('BORRADOR', 'Borrador'), ('APROBADA', 'Aprobada')], default='BORRADOR', max_length=20)),
                ('notas', models.TextField(blank=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('aprobada_at', models.DateTimeField(blank=True, null=True)),
                ('trabajador', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='liquidaciones', to='core.trabajador')),
                ('contrato', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='liquidaciones', to='core.contrato')),
                ('created_by', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='liquidaciones_creadas', to=settings.AUTH_USER_MODEL)),
                ('aprobada_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='liquidaciones_aprobadas', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'Liquidación de Contrato',
                'verbose_name_plural': 'Liquidaciones de Contrato',
                'ordering': ['-created_at'],
            },
        ),
    ]
