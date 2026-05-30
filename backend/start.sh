#!/bin/bash
# Limpiar bytecode cacheado para asegurar que Render use el codigo fuente actualizado
find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
find . -name "*.pyc" -delete 2>/dev/null || true

echo "Cache de bytecode limpiada. Iniciando servidor..."
exec gunicorn config.wsgi:application --bind 0.0.0.0:${PORT:-8000} --workers 2
