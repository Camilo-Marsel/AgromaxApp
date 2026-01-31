# Generated manually - Renombrar labores especiales
#
# Cambios:
# - Labor "Incapacidad" → "Incapacidad Médica"
# - Labor "Ausencia" → "Ausencia No Justificada"

from django.db import migrations


def rename_labores(apps, schema_editor):
    Labor = apps.get_model('core', 'Labor')

    Labor.objects.filter(nombre='Incapacidad').update(nombre='Incapacidad Médica')
    Labor.objects.filter(nombre='Ausencia').update(nombre='Ausencia No Justificada')


def reverse_rename_labores(apps, schema_editor):
    Labor = apps.get_model('core', 'Labor')

    Labor.objects.filter(nombre='Incapacidad Médica').update(nombre='Incapacidad')
    Labor.objects.filter(nombre='Ausencia No Justificada').update(nombre='Ausencia')


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0014_update_estados_trabajador_nomina'),
    ]

    operations = [
        migrations.RunPython(rename_labores, reverse_rename_labores),
    ]
