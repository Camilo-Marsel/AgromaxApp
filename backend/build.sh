#!/usr/bin/env bash
# backend/build.sh

set -o errexit

pip install -r requirements.txt

python manage.py collectstatic --no-input
python manage.py migrate

# Crear superusuario automáticamente
python create_superuser.py

# Cargar datos iniciales (solo si existen y la BD está vacía)
if [ -f datos_produccion.json ]; then
    echo "📦 Cargando datos iniciales..."
    python manage.py loaddata datos_produccion.json || echo "⚠️ Datos ya cargados o error al cargar"
fi
