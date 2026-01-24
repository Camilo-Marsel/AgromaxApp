# Generated manually to fix missing tables after faked migration

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0009_add_config_empresa_and_nacionalidad'),
    ]

    operations = [
        # Crear ConfiguracionEmpresa si no existe
        migrations.RunSQL(
            sql="""
            CREATE TABLE IF NOT EXISTS core_configuracionempresa (
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
            );
            """,
            reverse_sql="DROP TABLE IF EXISTS core_configuracionempresa;",
        ),
        # Agregar campo nacionalidad a trabajador si no existe
        migrations.RunSQL(
            sql="""
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name = 'core_trabajador' AND column_name = 'nacionalidad'
                ) THEN
                    ALTER TABLE core_trabajador ADD COLUMN nacionalidad VARCHAR(50) DEFAULT 'COLOMBIANA';
                END IF;
            END $$;
            """,
            reverse_sql="""
            ALTER TABLE core_trabajador DROP COLUMN IF EXISTS nacionalidad;
            """,
        ),
    ]
