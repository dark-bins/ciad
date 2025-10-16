#!/bin/bash

# ============================================
# Script de Actualización Rápida - CIAD
# Para actualizar la app sin reinstalar todo
# ============================================

set -e

APP_DIR="/var/www/ciad"

echo "🔄 Actualizando CIAD..."

cd "$APP_DIR"

echo "📥 Descargando últimos cambios..."
git pull origin main

echo "📦 Actualizando dependencias del backend..."
cd "$APP_DIR/backend"
npm install --production
npm run build

echo "📦 Actualizando dependencias del frontend..."
cd "$APP_DIR/frontend"
npm install
npm run build

echo "🔄 Reiniciando aplicación..."
pm2 restart all

echo "✅ Actualización completada!"
pm2 status
