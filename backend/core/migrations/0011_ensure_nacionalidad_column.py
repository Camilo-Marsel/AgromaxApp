# Generated manually to ensure nacionalidad column exists
# NOTA: Los modelos usan db_table personalizado (trabajadores, fincas, etc.)

from django.db import migrations, connection


def ensure_nacionalidad_exists(apps, schema_editor):
    """Asegurar que el campo nacionalidad existe en trabajadores"""
    with connection.cursor() as cursor:
        # SQLite: usar PRAGMA table_info para verificar columnas
        cursor.execute("PRAGMA table_info(trabajadores)")
        columns = [row[1] for row in cursor.fetchall()]
        if 'nacionalidad' not in columns:
            print("Adding nacionalidad column to trabajadores...")
            cursor.execute("""
                ALTER TABLE trabajadores
                ADD COLUMN nacionalidad VARCHAR(50) DEFAULT 'COLOMBIANA'
            """)
            print("Column nacionalidad added successfully!")
        else:
            print("Column nacionalidad already exists.")


def ensure_config_empresa_exists(apps, schema_editor):
    """Asegurar que la tabla ConfiguracionEmpresa existe"""
    with connection.cursor() as cursor:
        # SQLite: verificar si la tabla existe
        cursor.execute("""
            SELECT name FROM sqlite_master
            WHERE type='table' AND name='core_configuracionempresa'
        """)
        if not cursor.fetchone():
            print("Creating core_configuracionempresa table...")
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
            print("Table core_configuracionempresa created successfully!")
        else:
            print("Table core_configuracionempresa already exists.")


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0010_fix_missing_tables'),
    ]

    operations = [
        migrations.RunPython(ensure_config_empresa_exists, migrations.RunPython.noop),
        migrations.RunPython(ensure_nacionalidad_exists, migrations.RunPython.noop),
    ]
