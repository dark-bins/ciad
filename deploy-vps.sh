#!/bin/bash

# ============================================
# Script de Deployment Automático - CIAD
# Para VPS con Ubuntu/Debian
# ============================================

set -e

echo "🚀 Iniciando deployment de CIAD..."

# Colores para output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

# Configuración
APP_NAME="ciad"
APP_DIR="/var/www/ciad"
DOMAIN="tu-dominio.com"  # CAMBIAR ESTO
BACKEND_PORT=4000
FRONTEND_PORT=5173

echo -e "${BLUE}📦 Actualizando sistema...${NC}"
sudo apt update
sudo apt upgrade -y

echo -e "${BLUE}📦 Instalando dependencias del sistema...${NC}"
# Node.js 20
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt install -y nodejs
fi

# PostgreSQL
if ! command -v psql &> /dev/null; then
    sudo apt install -y postgresql postgresql-contrib
fi

# Nginx
if ! command -v nginx &> /dev/null; then
    sudo apt install -y nginx
fi

# PM2
if ! command -v pm2 &> /dev/null; then
    sudo npm install -g pm2
fi

# Git
if ! command -v git &> /dev/null; then
    sudo apt install -y git
fi

echo -e "${BLUE}🗄️  Configurando PostgreSQL...${NC}"
sudo -u postgres psql -c "CREATE DATABASE ciad;" 2>/dev/null || echo "Database already exists"
sudo -u postgres psql -c "CREATE USER ciaduser WITH PASSWORD 'ciad_password_change_me';" 2>/dev/null || echo "User already exists"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE ciad TO ciaduser;" 2>/dev/null || true
sudo -u postgres psql -c "ALTER DATABASE ciad OWNER TO ciaduser;" 2>/dev/null || true

echo -e "${BLUE}📁 Clonando/Actualizando repositorio...${NC}"
if [ -d "$APP_DIR" ]; then
    cd "$APP_DIR"
    git pull origin main
else
    sudo mkdir -p "$APP_DIR"
    sudo chown $USER:$USER "$APP_DIR"
    git clone https://github.com/dark-bins/ciad.git "$APP_DIR"
    cd "$APP_DIR"
fi

echo -e "${BLUE}⚙️  Configurando variables de entorno...${NC}"
cat > "$APP_DIR/backend/.env" << EOF
NODE_ENV=production
PORT=$BACKEND_PORT
DATABASE_URL=postgresql://ciaduser:ciad_password_change_me@localhost:5432/ciad

# JWT Secret - CAMBIAR ESTO
JWT_SECRET=$(openssl rand -base64 32)

# CORS - CAMBIAR ESTO
CORS_ORIGIN=https://$DOMAIN

# Telegram - COMPLETAR CON TUS CREDENCIALES
TELEGRAM_API_ID=
TELEGRAM_API_HASH=
TELEGRAM_PHONE=
TELEGRAM_PASSWORD=
TELEGRAM_BOT_USERNAME=@DELUXEDATAA_BOT
TELEGRAM_SESSION_FILE=telegram_session
EOF

echo -e "${BLUE}📦 Instalando dependencias del backend...${NC}"
cd "$APP_DIR/backend"
npm install --production

echo -e "${BLUE}🔨 Compilando backend...${NC}"
npm run build

echo -e "${BLUE}🗄️  Inicializando base de datos...${NC}"
export $(cat .env | xargs)
psql $DATABASE_URL -f database/schema.sql 2>/dev/null || echo "Schema already applied"

echo -e "${BLUE}📦 Instalando dependencias del frontend...${NC}"
cd "$APP_DIR/frontend"
npm install

echo -e "${BLUE}🔨 Compilando frontend...${NC}"
cat > .env.production << EOF
VITE_API_URL=https://api.$DOMAIN
EOF
npm run build

echo -e "${BLUE}🔄 Configurando PM2...${NC}"
cd "$APP_DIR"

# PM2 ecosystem file
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'ciad-backend',
      cwd: './backend',
      script: 'dist/index.js',
      env: {
        NODE_ENV: 'production',
      },
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      error_file: './logs/backend-error.log',
      out_file: './logs/backend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    }
  ]
};
EOF

# Detener procesos anteriores
pm2 delete ciad-backend 2>/dev/null || true

# Iniciar aplicación
pm2 start ecosystem.config.js
pm2 save
pm2 startup | tail -n 1 | sudo bash

echo -e "${BLUE}🌐 Configurando Nginx...${NC}"
sudo tee /etc/nginx/sites-available/ciad > /dev/null << EOF
# Backend API
server {
    listen 80;
    server_name api.$DOMAIN;

    client_max_body_size 50M;

    location / {
        proxy_pass http://localhost:$BACKEND_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
}

# Frontend
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;

    root $APP_DIR/frontend/dist;
    index index.html;

    location / {
        try_files \$uri \$uri/ /index.html;
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
}
EOF

# Habilitar sitio
sudo ln -sf /etc/nginx/sites-available/ciad /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx

echo -e "${GREEN}✅ Deployment completado!${NC}"
echo -e "${BLUE}================================================${NC}"
echo -e "${GREEN}Backend:${NC} http://api.$DOMAIN"
echo -e "${GREEN}Frontend:${NC} http://$DOMAIN"
echo -e "${BLUE}================================================${NC}"
echo ""
echo -e "${RED}⚠️  IMPORTANTE:${NC}"
echo "1. Edita $APP_DIR/backend/.env y completa las credenciales de Telegram"
echo "2. Configura DNS: Apunta '$DOMAIN' y 'api.$DOMAIN' a la IP de este servidor"
echo "3. Instala SSL con: sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN -d api.$DOMAIN"
echo "4. Reinicia PM2: pm2 restart all"
echo ""
echo -e "${BLUE}Ver logs:${NC}"
echo "  Backend: pm2 logs ciad-backend"
echo "  Nginx: sudo tail -f /var/log/nginx/error.log"
echo ""
echo -e "${BLUE}Comandos útiles:${NC}"
echo "  pm2 status        - Ver estado de la app"
echo "  pm2 restart all   - Reiniciar app"
echo "  pm2 logs          - Ver logs en tiempo real"
