#!/bin/bash

# Script de deployment para CIAD
# Facilita el proceso de desplegar a producción

set -e

echo "🚀 CIAD Deployment Helper"
echo "=========================="
echo ""

# Colores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Función para hacer preguntas
ask() {
    local prompt="$1"
    local default="$2"
    local response

    if [ -n "$default" ]; then
        read -p "$prompt [$default]: " response
        echo "${response:-$default}"
    else
        read -p "$prompt: " response
        echo "$response"
    fi
}

# Verificar que estamos en el directorio correcto
if [ ! -d "backend" ] || [ ! -d "frontend" ]; then
    echo -e "${RED}❌ Error: No se encontraron las carpetas backend y frontend${NC}"
    echo "Asegúrate de ejecutar este script desde la raíz del proyecto"
    exit 1
fi

echo -e "${BLUE}¿Qué plataforma usarás?${NC}"
echo "1) Railway (Recomendado)"
echo "2) Render"
echo "3) Vercel + Railway"
echo "4) Solo preparar archivos"
echo ""

platform=$(ask "Selecciona una opción" "1")

case $platform in
    1)
        PLATFORM="Railway"
        ;;
    2)
        PLATFORM="Render"
        ;;
    3)
        PLATFORM="Vercel + Railway"
        ;;
    4)
        PLATFORM="Manual"
        ;;
    *)
        echo -e "${RED}Opción inválida${NC}"
        exit 1
        ;;
esac

echo ""
echo -e "${GREEN}✓ Plataforma seleccionada: $PLATFORM${NC}"
echo ""

# Verificar que el código está actualizado
echo -e "${BLUE}📦 Verificando estado del código...${NC}"

if [ -n "$(git status --porcelain)" ]; then
    echo -e "${YELLOW}⚠️  Hay cambios sin commitear${NC}"

    commit_msg=$(ask "¿Mensaje de commit?" "Preparar para deployment")

    git add .
    git commit -m "$commit_msg"
    echo -e "${GREEN}✓ Commit creado${NC}"
else
    echo -e "${GREEN}✓ No hay cambios pendientes${NC}"
fi

# Verificar package.json
echo ""
echo -e "${BLUE}🔍 Verificando configuración...${NC}"

# Verificar que start script existe en backend
if ! grep -q '"start"' backend/package.json; then
    echo -e "${RED}❌ Falta script 'start' en backend/package.json${NC}"
    exit 1
fi

# Verificar que build script existe en frontend
if ! grep -q '"build"' frontend/package.json; then
    echo -e "${RED}❌ Falta script 'build' en frontend/package.json${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Scripts de package.json OK${NC}"

# Crear archivo .env.example si no existe
if [ ! -f "backend/.env.example" ]; then
    echo ""
    echo -e "${BLUE}📝 Creando .env.example...${NC}"

    cat > backend/.env.example << 'EOF'
# Database
DATABASE_URL=postgresql://user:password@host:5432/ciad_db
USE_SQLITE=false

# Server
NODE_ENV=production
PORT=4000

# JWT
JWT_SECRET=cambiar_por_secreto_seguro_de_32_caracteres

# CORS
CORS_ORIGIN=https://tu-frontend.com

# Telegram
TELEGRAM_API_ID=tu_api_id
TELEGRAM_API_HASH=tu_api_hash
TELEGRAM_PHONE=+51999999999
TELEGRAM_PASSWORD=tu_password
TELEGRAM_BOT_USERNAME=@SHKAINFORMATIONASXBOT
TELEGRAM_SESSION_FILE=telegram_session

# Logging
LOG_LEVEL=info
EOF

    echo -e "${GREEN}✓ .env.example creado${NC}"
fi

# Compilar backend para verificar
echo ""
echo -e "${BLUE}🔨 Compilando backend...${NC}"
cd backend
npm run build

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Backend compilado correctamente${NC}"
else
    echo -e "${RED}❌ Error compilando backend${NC}"
    exit 1
fi

cd ..

# Compilar frontend para verificar
echo ""
echo -e "${BLUE}🔨 Compilando frontend...${NC}"
cd frontend

# Temporal: usar localhost para verificar compilación
VITE_API_URL=http://localhost:4000 npm run build

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Frontend compilado correctamente${NC}"
else
    echo -e "${RED}❌ Error compilando frontend${NC}"
    exit 1
fi

cd ..

# Push a GitHub
echo ""
echo -e "${BLUE}📤 ¿Hacer push a GitHub?${NC}"
push=$(ask "Hacer push? (y/n)" "y")

if [ "$push" = "y" ] || [ "$push" = "Y" ]; then
    echo "Haciendo push..."
    git push origin main || git push origin master
    echo -e "${GREEN}✓ Push completado${NC}"
fi

# Instrucciones finales
echo ""
echo -e "${GREEN}================================${NC}"
echo -e "${GREEN}✅ Preparación completada${NC}"
echo -e "${GREEN}================================${NC}"
echo ""
echo -e "${BLUE}Próximos pasos para $PLATFORM:${NC}"
echo ""

case $platform in
    1)
        echo "1. Ve a https://railway.app"
        echo "2. Crea nuevo proyecto → Deploy from GitHub"
        echo "3. Selecciona tu repositorio"
        echo "4. Agrega PostgreSQL database"
        echo "5. Configura variables de entorno (ver .env.example)"
        echo "6. Deploy!"
        echo ""
        echo "Variables importantes:"
        echo "  - DATABASE_URL (automático con PostgreSQL)"
        echo "  - JWT_SECRET (genera uno seguro)"
        echo "  - CORS_ORIGIN (URL de tu frontend)"
        echo "  - TELEGRAM_* (tus credenciales)"
        ;;
    2)
        echo "1. Ve a https://render.com"
        echo "2. New → PostgreSQL (Free)"
        echo "3. New → Web Service (Backend)"
        echo "   - Root Directory: backend"
        echo "   - Build: npm install && npm run build"
        echo "   - Start: npm run start"
        echo "4. New → Static Site (Frontend)"
        echo "   - Root Directory: frontend"
        echo "   - Build: npm install && npm run build"
        echo "   - Publish: dist"
        echo "5. Configura variables de entorno"
        ;;
    3)
        echo "1. Backend en Railway (ver opción 1)"
        echo "2. Frontend en Vercel:"
        echo "   - Ve a https://vercel.com"
        echo "   - New Project → Import Git"
        echo "   - Root Directory: frontend"
        echo "   - Framework Preset: Vite"
        echo "   - Add Environment Variable:"
        echo "     VITE_API_URL=https://tu-backend.railway.app"
        ;;
    4)
        echo "Archivos listos para deployment manual"
        echo "Revisa DEPLOYMENT-GUIDE.md para instrucciones completas"
        ;;
esac

echo ""
echo -e "${YELLOW}📚 Lee DEPLOYMENT-GUIDE.md para instrucciones detalladas${NC}"
echo ""
echo -e "${GREEN}¡Buena suerte con el deployment! 🚀${NC}"
