#!/usr/bin/env bash
# backend/build.sh

set -o errexit

pip install -r requirements.txt

python manage.py collectstatic --no-input

# Crear migraciones si hay cambios pendientes en los modelos
python manage.py makemigrations --no-input

echo "================================================"
echo "Running migrations..."
echo "================================================"

# Mostrar estado actual de migraciones
python manage.py showmigrations core

# Intentar migrar normalmente
if python manage.py migrate 2>&1; then
    echo "Migrations completed successfully"
else
    echo "================================================"
    echo "Migration failed - analyzing error..."
    echo "================================================"

    # Capturar el error
    ERROR_OUTPUT=$(python manage.py migrate 2>&1 || true)
    echo "$ERROR_OUTPUT"

    # Si el error es "relation already exists", hacer fake de migraciones específicas
    if echo "$ERROR_OUTPUT" | grep -q "already exists"; then
        echo "Detected 'already exists' error - faking conflicting migrations..."

        # Fake solo las migraciones que causan conflictos (0009 crea tablas que podrían existir)
        python manage.py migrate core 0008 --fake || true
        python manage.py migrate core 0009 --fake || true

        # Aplicar 0010 que tiene la lógica de "si no existe"
        python manage.py migrate core 0010 || true

        # Aplicar cualquier migración restante
        python manage.py migrate
    else
        echo "Unknown migration error - attempting full fake and retry..."
        python manage.py migrate core --fake || true
        python manage.py migrate
    fi
fi

echo "================================================"
echo "Final migration status:"
echo "================================================"
python manage.py showmigrations core

# Crear superusuario automáticamente
python create_superuser.py
