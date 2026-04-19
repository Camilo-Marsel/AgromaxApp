# Generated manually to ensure nacionalidad column exists

from django.db import migrations, connection


def _table_exists(name):
    return name in connection.introspection.table_names()


def _column_exists(table, column):
    with connection.cursor() as cursor:
        if connection.vendor == 'sqlite':
            cursor.execute(f"PRAGMA table_info({table})")
            return column in [row[1] for row in cursor.fetchall()]
        else:
            cursor.execute(
                "SELECT column_name FROM information_schema.columns "
                "WHERE table_name=%s AND column_name=%s",
                [table, column]
            )
            return cursor.fetchone() is not None


def ensure_nacionalidad_exists(apps, schema_editor):
    if _column_exists('trabajadores', 'nacionalidad'):
        return
    with connection.cursor() as cursor:
        cursor.execute(
            "ALTER TABLE trabajadores ADD COLUMN nacionalidad VARCHAR(50) DEFAULT 'COLOMBIANA'"
        )


def ensure_config_empresa_exists(apps, schema_editor):
    if _table_exists('core_configuracionempresa'):
        return
    with connection.cursor() as cursor:
        if connection.vendor == 'sqlite':
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
        else:
            cursor.execute("""
                CREATE TABLE core_configuracionempresa (
                    id SERIAL PRIMARY KEY,
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
                    created_at TIMESTAMP DEFAULT NOW(),
                    updated_at TIMESTAMP DEFAULT NOW()
                )
            """)


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0010_fix_missing_tables'),
    ]

    operations = [
        migrations.RunPython(ensure_config_empresa_exists, migrations.RunPython.noop),
        migrations.RunPython(ensure_nacionalidad_exists, migrations.RunPython.noop),
    ]
