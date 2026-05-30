#!/bin/bash
set -e

echo "=== Limpiando bytecode cacheado ==="
find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
find . -name "*.pyc" -delete 2>/dev/null || true

echo "=== Instalando dependencias ==="
pip install -r requirements.txt

echo "=== Colectando archivos estaticos ==="
python manage.py collectstatic --no-input

echo "=== Ejecutando migraciones ==="
python manage.py migrate

echo "=== Build completo ==="
