#!/bin/bash
# Script de deployment simplificado para CIAD
# Ejecutar en el VPS: bash deploy-simple.sh

set -e
cd /var/www/ciad/backend

echo "🔨 Compilando backend..."
npm run build

echo "🗄️ Inicializando base de datos..."
export $(cat .env | xargs)
psql $DATABASE_URL -f database/schema.sql 2>/dev/null || echo "✓ Schema ya aplicado"

echo "📦 Instalando frontend..."
cd /var/www/ciad/frontend
npm install

echo "⚙️ Configurando frontend..."
echo "VITE_API_URL=http://62.169.21.154:4000" > .env.production

echo "🔨 Compilando frontend..."
npm run build

echo "🔄 Configurando PM2..."
cd /var/www/ciad
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'ciad-backend',
    cwd: './backend',
    script: 'dist/index.js',
    env: { NODE_ENV: 'production' },
    instances: 1,
    autorestart: true,
  }]
};
EOF

pm2 delete ciad-backend 2>/dev/null || true
pm2 start ecosystem.config.js
pm2 save
pm2 startup systemd -u root --hp /root | tail -1 | bash

echo "🌐 Configurando Nginx..."
cat > /etc/nginx/sites-available/ciad << 'EOF'
upstream backend {
    server localhost:4000;
}

server {
    listen 80 default_server;
    server_name _;
    root /var/www/ciad/frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://backend/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public";
    }
}
EOF

ln -sf /etc/nginx/sites-available/ciad /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl restart nginx

echo "🔥 Abriendo puertos..."
ufw allow 80/tcp 2>/dev/null || true
ufw allow 4000/tcp 2>/dev/null || true
ufw --force enable 2>/dev/null || true

echo ""
echo "✅ ¡DEPLOYMENT COMPLETADO!"
echo ""
echo "🌐 Acceso:"
echo "   http://62.169.21.154"
echo ""
echo "👤 Admin: scrall / scrall123"
echo ""
pm2 status
