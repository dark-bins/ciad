# 🚀 DEPLOYMENT DIRECTO - EJECUTA EN TU VPS

ssh root@62.169.21.154

## 1. PM2
cd /var/www/ciad
pm2 delete ciad-backend 2>/dev/null || true
pm2 start backend/dist/index.js --name ciad-backend
pm2 save
pm2 startup

## 2. Nginx
cat > /etc/nginx/sites-available/ciad << 'NGINX'
upstream backend { server localhost:4000; }
server {
    listen 80 default_server;
    server_name _;
    root /var/www/ciad/frontend/dist;
    index index.html;
    location / { try_files $uri $uri/ /index.html; }
    location /api/ {
        proxy_pass http://backend/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
NGINX

ln -sf /etc/nginx/sites-available/ciad /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl restart nginx

## 3. Firewall
ufw allow 80/tcp && ufw allow 22/tcp && ufw --force enable

## 4. Verificar
pm2 logs ciad-backend --lines 20

## ACCESO: http://62.169.21.154
## Admin: scrall / scrall123
