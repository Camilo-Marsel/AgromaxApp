# backend/core/migrations/0008_update_role_names.py

from django.db import migrations


def update_role_names(apps, schema_editor):
    """
    Actualiza los nombres de roles de:
    - SUPER_ADMIN -> ADMINISTRADOR
    - DIGITADOR -> SUPERVISOR
    - SOLO_LECTURA -> CONSULTA
    """
    Rol = apps.get_model('core', 'Rol')

    # Mapeo de nombres antiguos a nuevos
    role_mapping = {
        'SUPER_ADMIN': 'ADMINISTRADOR',
        'DIGITADOR': 'SUPERVISOR',
        'SOLO_LECTURA': 'CONSULTA',
    }

    for old_name, new_name in role_mapping.items():
        Rol.objects.filter(nombre=old_name).update(nombre=new_name)


def reverse_role_names(apps, schema_editor):
    """Revierte los nombres de roles a los originales"""
    Rol = apps.get_model('core', 'Rol')

    # Mapeo inverso
    role_mapping = {
        'ADMINISTRADOR': 'SUPER_ADMIN',
        'SUPERVISOR': 'DIGITADOR',
        'CONSULTA': 'SOLO_LECTURA',
    }

    for old_name, new_name in role_mapping.items():
        Rol.objects.filter(nombre=old_name).update(nombre=new_name)


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0007_prestamo_updated_at'),
    ]

    operations = [
        migrations.RunPython(update_role_names, reverse_role_names),
    ]
