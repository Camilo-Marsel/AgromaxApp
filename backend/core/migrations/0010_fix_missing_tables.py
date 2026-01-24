# Generated manually to fix missing tables after faked migration

from django.db import migrations, connection


def add_nacionalidad_if_not_exists(apps, schema_editor):
    """Agregar campo nacionalidad a trabajador si no existe"""
    with connection.cursor() as cursor:
        # Verificar si la columna existe
        cursor.execute("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'core_trabajador' AND column_name = 'nacionalidad'
        """)
        if not cursor.fetchone():
            cursor.execute("""
                ALTER TABLE core_trabajador
                ADD COLUMN nacionalidad VARCHAR(50) DEFAULT 'COLOMBIANA'
            """)


def create_config_empresa_if_not_exists(apps, schema_editor):
    """Crear tabla ConfiguracionEmpresa si no existe"""
    with connection.cursor() as cursor:
        # Verificar si la tabla existe
        cursor.execute("""
            SELECT table_name
            FROM information_schema.tables
            WHERE table_name = 'core_configuracionempresa'
        """)
        if not cursor.fetchone():
            cursor.execute("""
                CREATE TABLE core_configuracionempresa (
                    id BIGSERIAL PRIMARY KEY,
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
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
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
