#!/usr/bin/env bash
# backend/build.sh

set -o errexit

pip install -r requirements.txt

python manage.py collectstatic --no-input

echo "================================================"
echo "Running migrations..."
echo "================================================"

python manage.py migrate

echo "================================================"
echo "Final migration status:"
echo "================================================"
python manage.py showmigrations core

# Crear superusuario automáticamente
python create_superuser.py
