# Script de Deployment desde Windows a VPS
# Ejecutar: .\deploy-from-windows.ps1

$VPS_IP = "62.169.21.154"
$VPS_USER = "root"
$VPS_PASSWORD = "scrall1611"

Write-Host "🚀 Iniciando deployment a VPS..." -ForegroundColor Green

# Crear script de deployment completo
$deployScript = @'
#!/bin/bash
set -e

echo "📦 Verificando instalaciones previas..."
cd /var/www/ciad/backend

echo "🔨 Compilando backend..."
npm run build

echo "🗄️ Inicializando base de datos..."
export $(cat .env | xargs)
psql $DATABASE_URL -f database/schema.sql 2>/dev/null || echo "Schema ya aplicado"

echo "📦 Instalando dependencias del frontend..."
cd /var/www/ciad/frontend
npm install

echo "⚙️ Configurando frontend..."
cat > .env.production << 'ENVEOF'
VITE_API_URL=http://62.169.21.154:4000
ENVEOF

echo "🔨 Compilando frontend..."
npm run build

echo "📝 Creando configuración de PM2..."
cd /var/www/ciad
cat > ecosystem.config.js << 'PMEOF'
module.exports = {
  apps: [{
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
  }]
};
PMEOF

echo "🔄 Iniciando aplicación con PM2..."
pm2 delete ciad-backend 2>/dev/null || true
pm2 start ecosystem.config.js
pm2 save
pm2 startup systemd -u root --hp /root | tail -1 | bash

echo "🌐 Configurando Nginx..."
cat > /etc/nginx/sites-available/ciad << 'NGINXEOF'
# Backend API
upstream backend {
    server localhost:4000;
}

# Frontend
server {
    listen 80 default_server;
    server_name _;

    root /var/www/ciad/frontend/dist;
    index index.html;

    # Frontend
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api/ {
        proxy_pass http://backend/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
    }

    # Static files cache
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
}
NGINXEOF

ln -sf /etc/nginx/sites-available/ciad /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

echo "✅ Verificando configuración de Nginx..."
nginx -t

echo "🔄 Reiniciando Nginx..."
systemctl restart nginx

echo "🔥 Configurando firewall..."
ufw allow 80/tcp 2>/dev/null || true
ufw allow 4000/tcp 2>/dev/null || true
ufw allow 22/tcp 2>/dev/null || true
ufw --force enable 2>/dev/null || true

echo ""
echo "✅ ¡Deployment completado!"
echo ""
echo "📊 Estado de la aplicación:"
pm2 status

echo ""
echo "🌐 Acceso:"
echo "   Frontend: http://62.169.21.154"
echo "   Backend:  http://62.169.21.154:4000"
echo ""
echo "👤 Credenciales admin:"
echo "   Usuario:  scrall"
echo "   Password: scrall123"
echo ""
echo "📋 Comandos útiles:"
echo "   Ver logs:     pm2 logs ciad-backend"
echo "   Reiniciar:    pm2 restart all"
echo "   Estado:       pm2 status"
echo ""
'@

# Guardar script en archivo temporal
$deployScript | Out-File -FilePath "$env:TEMP\deploy.sh" -Encoding ASCII

Write-Host "📤 Subiendo script al VPS..." -ForegroundColor Yellow

# Usando plink si está disponible (parte de PuTTY)
if (Get-Command plink -ErrorAction SilentlyContinue) {
    Write-Host "Usando PuTTY plink..." -ForegroundColor Cyan

    # Subir script
    pscp -pw $VPS_PASSWORD "$env:TEMP\deploy.sh" "${VPS_USER}@${VPS_IP}:/root/deploy.sh"

    # Ejecutar script
    echo $VPS_PASSWORD | plink -ssh -pw $VPS_PASSWORD ${VPS_USER}@${VPS_IP} "chmod +x /root/deploy.sh && /root/deploy.sh"
} else {
    Write-Host "⚠️ PuTTY no está instalado. Usando método alternativo..." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Por favor ejecuta estos comandos MANUALMENTE en tu VPS:" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "1. Conéctate al VPS:" -ForegroundColor White
    Write-Host "   ssh root@62.169.21.154" -ForegroundColor Green
    Write-Host ""
    Write-Host "2. Pega y ejecuta este script completo:" -ForegroundColor White
    Write-Host "=====================================" -ForegroundColor Yellow
    Write-Host $deployScript -ForegroundColor Green
    Write-Host "=====================================" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "O descarga y ejecuta el script guardado:" -ForegroundColor White
    Write-Host "   bash <(curl -s https://raw.githubusercontent.com/dark-bins/ciad/main/deploy-vps.sh)" -ForegroundColor Green
}

Write-Host ""
Write-Host "✅ Script preparado!" -ForegroundColor Green
