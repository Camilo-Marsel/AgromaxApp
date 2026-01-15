#!/usr/bin/env bash
# backend/build.sh

set -o errexit

pip install -r requirements.txt

python manage.py collectstatic --no-input

# Crear migraciones si hay cambios pendientes en los modelos
python manage.py makemigrations --no-input

# Intentar migrar normalmente
# Si falla por "relation already exists", hacer fake de las migraciones pendientes
if ! python manage.py migrate 2>&1; then
    echo "================================================"
    echo "Migration failed - attempting fake migration..."
    echo "================================================"

    # Hacer fake de todas las migraciones de core que puedan estar causando conflictos
    python manage.py migrate core --fake || true

    # Intentar migrar el resto
    python manage.py migrate
fi

# Crear superusuario automáticamente
python create_superuser.py
