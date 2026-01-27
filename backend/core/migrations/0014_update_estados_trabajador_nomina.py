# Generated manually - Actualizar estados de Trabajador y Nomina
#
# Cambios:
# - Trabajador: ACTIVO/INACTIVO/RETIRADO → CONTRATADO/SIN_CONTRATO/RETIRADO
# - Trabajador: Agregar campos motivo_retiro y observaciones_retiro
# - Nomina: BORRADOR/CALCULADA/APROBADA/PAGADA → PENDIENTE/APROBADA
# - Nomina: Eliminar campo fecha_pago (ya no es necesario)

from django.db import migrations, models


def migrate_trabajador_estados(apps, schema_editor):
    """Migrar estados de trabajador: ACTIVO/INACTIVO → SIN_CONTRATO"""
    Trabajador = apps.get_model('core', 'Trabajador')

    # ACTIVO → SIN_CONTRATO (luego se actualizará manualmente a CONTRATADO si tiene contrato)
    Trabajador.objects.filter(estado='ACTIVO').update(estado='SIN_CONTRATO')

    # INACTIVO → SIN_CONTRATO
    Trabajador.objects.filter(estado='INACTIVO').update(estado='SIN_CONTRATO')

    # RETIRADO se mantiene igual


def migrate_nomina_estados(apps, schema_editor):
    """Migrar estados de nómina"""
    Nomina = apps.get_model('core', 'Nomina')

    # BORRADOR → PENDIENTE
    Nomina.objects.filter(estado='BORRADOR').update(estado='PENDIENTE')

    # CALCULADA → PENDIENTE
    Nomina.objects.filter(estado='CALCULADA').update(estado='PENDIENTE')

    # PAGADA → APROBADA
    Nomina.objects.filter(estado='PAGADA').update(estado='APROBADA')

    # APROBADA se mantiene igual


def actualizar_trabajadores_con_contrato(apps, schema_editor):
    """Actualizar trabajadores que tienen contrato activo a estado CONTRATADO"""
    Trabajador = apps.get_model('core', 'Trabajador')
    Contrato = apps.get_model('core', 'Contrato')

    # Obtener IDs de trabajadores con contrato activo
    trabajadores_con_contrato = Contrato.objects.filter(
        estado='ACTIVO'
    ).values_list('trabajador_id', flat=True)

    # Actualizar estado a CONTRATADO
    Trabajador.objects.filter(
        id__in=trabajadores_con_contrato
    ).update(estado='CONTRATADO')


def reverse_trabajador_estados(apps, schema_editor):
    """Revertir migración de estados de trabajador"""
    Trabajador = apps.get_model('core', 'Trabajador')

    # CONTRATADO → ACTIVO
    Trabajador.objects.filter(estado='CONTRATADO').update(estado='ACTIVO')

    # SIN_CONTRATO → ACTIVO (no había INACTIVO real)
    Trabajador.objects.filter(estado='SIN_CONTRATO').update(estado='ACTIVO')


def reverse_nomina_estados(apps, schema_editor):
    """Revertir migración de estados de nómina"""
    Nomina = apps.get_model('core', 'Nomina')

    # PENDIENTE → CALCULADA
    Nomina.objects.filter(estado='PENDIENTE').update(estado='CALCULADA')

    # APROBADA se mantiene igual (existía antes)


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0013_add_fincas_asignadas_usuario'),
    ]

    operations = [
        # 1. Agregar campos de retiro a Trabajador
        migrations.AddField(
            model_name='trabajador',
            name='motivo_retiro',
            field=models.CharField(
                blank=True,
                choices=[
                    ('RENUNCIA', 'Renuncia Voluntaria'),
                    ('DESPIDO_JUSTA_CAUSA', 'Despido con Justa Causa'),
                    ('DESPIDO_SIN_JUSTA_CAUSA', 'Despido sin Justa Causa'),
                    ('MUTUO_ACUERDO', 'Mutuo Acuerdo'),
                    ('FIN_CONTRATO', 'Finalización de Contrato'),
                    ('OTRO', 'Otro'),
                ],
                max_length=30,
                null=True,
                verbose_name='Motivo de Retiro'
            ),
        ),
        migrations.AddField(
            model_name='trabajador',
            name='observaciones_retiro',
            field=models.TextField(
                blank=True,
                null=True,
                verbose_name='Observaciones del Retiro'
            ),
        ),

        # 2. Migrar datos de Trabajador (antes de cambiar choices)
        migrations.RunPython(
            migrate_trabajador_estados,
            reverse_trabajador_estados
        ),

        # 3. Actualizar trabajadores con contrato activo
        migrations.RunPython(
            actualizar_trabajadores_con_contrato,
            migrations.RunPython.noop  # No hay reverso para esto
        ),

        # 4. Actualizar campo estado de Trabajador con nuevos choices
        migrations.AlterField(
            model_name='trabajador',
            name='estado',
            field=models.CharField(
                choices=[
                    ('CONTRATADO', 'Contratado'),
                    ('SIN_CONTRATO', 'Sin Contrato'),
                    ('RETIRADO', 'Retirado'),
                ],
                default='SIN_CONTRATO',
                max_length=20
            ),
        ),

        # 5. Migrar datos de Nomina (antes de cambiar choices)
        migrations.RunPython(
            migrate_nomina_estados,
            reverse_nomina_estados
        ),

        # 6. Actualizar campo estado de Nomina con nuevos choices
        migrations.AlterField(
            model_name='nomina',
            name='estado',
            field=models.CharField(
                choices=[
                    ('PENDIENTE', 'Pendiente'),
                    ('APROBADA', 'Aprobada'),
                ],
                default='PENDIENTE',
                max_length=20
            ),
        ),

        # 7. Eliminar campo fecha_pago de Nomina (ya no es necesario)
        migrations.RemoveField(
            model_name='nomina',
            name='fecha_pago',
        ),
    ]
