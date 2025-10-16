#!/bin/bash
# Script para arreglar CORS y reiniciar todo

echo "🔧 Arreglando configuración CORS..."

# Actualizar CORS_ORIGIN en .env
cd /var/www/ciad/backend
sed -i 's|CORS_ORIGIN=.*|CORS_ORIGIN=http://62.169.21.154,http://localhost:5173|g' .env

echo "📋 Nueva configuración CORS:"
grep CORS_ORIGIN .env

echo ""
echo "🔄 Reiniciando servicios..."

# Detener PM2
pm2 delete ciad-backend

# Iniciar con variables de entorno
cd /var/www/ciad/backend
NODE_ENV=production \
DB_HOST=localhost \
DB_PORT=5432 \
DB_NAME=ciad \
DB_USER=ciaduser \
DB_PASSWORD=ciad_prod_2025_secure \
DATABASE_URL=postgresql://ciaduser:ciad_prod_2025_secure@localhost:5432/ciad \
CORS_ORIGIN=http://62.169.21.154,http://localhost:5173 \
pm2 start dist/index.js --name ciad-backend

# Guardar configuración
pm2 save

echo ""
echo "✅ Verificando servicios..."
sleep 3
pm2 status

echo ""
echo "🧪 Probando login..."
curl -s -X POST http://localhost/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"scrall","password":"scrall123"}' | jq '.message'

echo ""
echo "✅ ¡Listo! Refresca tu navegador con Ctrl+F5"
