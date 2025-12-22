#!/usr/bin/env bash
# backend/build.sh

set -o errexit

pip install -r requirements.txt

python manage.py collectstatic --no-input
python manage.py migrate

# Crear superusuario automáticamente
python create_superuser.py
