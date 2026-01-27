# Generated manually to fix missing tables after faked migration
# NOTA: Los modelos usan db_table personalizado (trabajadores, fincas, etc.)

from django.db import migrations, connection


def add_nacionalidad_if_not_exists(apps, schema_editor):
    """Agregar campo nacionalidad a trabajador si no existe"""
    with connection.cursor() as cursor:
        # SQLite: usar PRAGMA table_info para verificar columnas
        cursor.execute("PRAGMA table_info(trabajadores)")
        columns = [row[1] for row in cursor.fetchall()]
        if 'nacionalidad' not in columns:
            cursor.execute("""
                ALTER TABLE trabajadores
                ADD COLUMN nacionalidad VARCHAR(50) DEFAULT 'COLOMBIANA'
            """)


def create_config_empresa_if_not_exists(apps, schema_editor):
    """Crear tabla ConfiguracionEmpresa si no existe"""
    with connection.cursor() as cursor:
        # SQLite: verificar si la tabla existe
        cursor.execute("""
            SELECT name FROM sqlite_master
            WHERE type='table' AND name='core_configuracionempresa'
        """)
        if not cursor.fetchone():
            cursor.execute("""
                CREATE TABLE core_configuracionempresa (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    razon_social VARCHAR(200) NOT NULL,
                    nit VARCHAR(20) NOT NULL,
                    representante_legal VARCHAR(200) NOT NULL,
                    tipo_documento_representante VARCHAR(10) NOT NULL DEFAULT 'CC',
                    documento_representante VARCHAR(20) NOT NULL,
                    correo VARCHAR(254) NOT NULL,
                    telefono VARCHAR(20) NOT NULL,
                    direccion VARCHAR(300) NOT NULL,
                    ciudad VARCHAR(100) DEFAULT '',
                    departamento VARCHAR(100) DEFAULT '',
                    logo_path VARCHAR(300) DEFAULT 'logos/logo_completo.jpeg',
                    periodo_pago VARCHAR(20) DEFAULT 'QUINCENAL',
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            """)


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0009_add_config_empresa_and_nacionalidad'),
    ]

    operations = [
        migrations.RunPython(create_config_empresa_if_not_exists, migrations.RunPython.noop),
        migrations.RunPython(add_nacionalidad_if_not_exists, migrations.RunPython.noop),
    ]
