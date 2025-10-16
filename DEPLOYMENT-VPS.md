# 🚀 Guía de Deployment en VPS - CIAD

## Requisitos del VPS

- **SO**: Ubuntu 20.04+ o Debian 10+
- **RAM**: Mínimo 1GB (recomendado 2GB)
- **CPU**: 1 core (recomendado 2 cores)
- **Almacenamiento**: 10GB mínimo
- **Acceso**: SSH con usuario root o sudo

## Opción 1: Deployment Automático (RECOMENDADO) ⚡

### Paso 1: Conectarse al VPS

```bash
ssh root@tu-ip-del-vps
# o
ssh usuario@tu-ip-del-vps
```

### Paso 2: Descargar y ejecutar script

```bash
# Descargar el script
curl -o deploy.sh https://raw.githubusercontent.com/dark-bins/ciad/main/deploy-vps.sh

# Darle permisos de ejecución
chmod +x deploy.sh

# IMPORTANTE: Editar el script y cambiar tu dominio
nano deploy.sh
# Busca la línea: DOMAIN="tu-dominio.com"
# Cámbiala por: DOMAIN="midominio.com"

# Ejecutar el script
./deploy.sh
```

### Paso 3: Configurar credenciales de Telegram

```bash
nano /var/www/ciad/backend/.env
```

Completa estas variables:
```env
TELEGRAM_API_ID=tu_api_id_real
TELEGRAM_API_HASH=tu_hash_real
TELEGRAM_PHONE=+51999999999
TELEGRAM_PASSWORD=tu_password
```

Guarda con `Ctrl + O`, Enter, `Ctrl + X`

### Paso 4: Reiniciar aplicación

```bash
pm2 restart all
```

### Paso 5: Configurar DNS

En tu proveedor de dominio (Namecheap, GoDaddy, Cloudflare, etc.):

1. Añade registro A:
   - **Host**: `@`
   - **Valor**: IP de tu VPS
   - **TTL**: 300

2. Añade registro A:
   - **Host**: `www`
   - **Valor**: IP de tu VPS
   - **TTL**: 300

3. Añade registro A:
   - **Host**: `api`
   - **Valor**: IP de tu VPS
   - **TTL**: 300

Espera 5-15 minutos para propagación DNS.

### Paso 6: Instalar SSL (HTTPS) 🔒

```bash
# Instalar Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obtener certificados SSL
sudo certbot --nginx -d tudominio.com -d www.tudominio.com -d api.tudominio.com

# Renovación automática ya está configurada
```

---

## Opción 2: Deployment Manual 🔧

Si prefieres más control o el script automático falla:

### 1. Instalar Node.js

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

### 2. Instalar PostgreSQL

```bash
sudo apt install -y postgresql postgresql-contrib
sudo -u postgres psql

CREATE DATABASE ciad;
CREATE USER ciaduser WITH PASSWORD 'tu_password_seguro';
GRANT ALL PRIVILEGES ON DATABASE ciad TO ciaduser;
ALTER DATABASE ciad OWNER TO ciaduser;
\q
```

### 3. Clonar repositorio

```bash
sudo mkdir -p /var/www/ciad
sudo chown $USER:$USER /var/www/ciad
git clone https://github.com/dark-bins/ciad.git /var/www/ciad
cd /var/www/ciad
```

### 4. Configurar Backend

```bash
cd /var/www/ciad/backend

# Crear archivo .env
cat > .env << 'EOF'
NODE_ENV=production
PORT=4000
DATABASE_URL=postgresql://ciaduser:tu_password_seguro@localhost:5432/ciad
JWT_SECRET=cambiar_esto_por_algo_super_seguro_123456789
CORS_ORIGIN=https://tudominio.com

TELEGRAM_API_ID=
TELEGRAM_API_HASH=
TELEGRAM_PHONE=
TELEGRAM_PASSWORD=
TELEGRAM_BOT_USERNAME=@DELUXEDATAA_BOT
TELEGRAM_SESSION_FILE=telegram_session
EOF

# Instalar y compilar
npm install --production
npm run build

# Inicializar base de datos
export $(cat .env | xargs)
psql $DATABASE_URL -f database/schema.sql
```

### 5. Configurar Frontend

```bash
cd /var/www/ciad/frontend

# Crear .env.production
echo "VITE_API_URL=https://api.tudominio.com" > .env.production

# Instalar y compilar
npm install
npm run build
```

### 6. Instalar PM2

```bash
sudo npm install -g pm2

cd /var/www/ciad

# Crear ecosystem.config.js
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
    }
  ]
};
EOF

# Iniciar app
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### 7. Instalar y configurar Nginx

```bash
sudo apt install -y nginx

sudo tee /etc/nginx/sites-available/ciad > /dev/null << 'EOF'
# Backend API
server {
    listen 80;
    server_name api.tudominio.com;

    location / {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}

# Frontend
server {
    listen 80;
    server_name tudominio.com www.tudominio.com;

    root /var/www/ciad/frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF

sudo ln -s /etc/nginx/sites-available/ciad /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
```

### 8. Configurar firewall

```bash
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
```

---

## Opción 3: Otras Plataformas (Alternativas a Railway)

### 3.1 Render.com (GRATIS) ✨

**Pros**: Gratis, fácil, SSL automático
**Contras**: Instancia se duerme después de 15 min inactividad

1. Ve a https://render.com
2. Conecta tu GitHub
3. Crea "New Web Service" para backend
4. Crea "New Static Site" para frontend
5. Configura variables de entorno

### 3.2 Vercel + Supabase (GRATIS)

**Pros**: Gratis, rápido, CDN global
**Contras**: Backend limitado

1. Frontend en Vercel: https://vercel.com
2. Base de datos en Supabase: https://supabase.com
3. Backend en Render

### 3.3 DigitalOcean App Platform

**Pros**: Fácil, escalable
**Contras**: Pago ($5/mes básico)

Similar a Railway pero más estable.

### 3.4 Heroku (Pago)

**Pros**: Muy fácil
**Contras**: Ya no tiene plan gratuito ($7/mes)

---

## Comandos Útiles VPS

### Ver logs de la aplicación
```bash
pm2 logs ciad-backend        # Logs en tiempo real
pm2 logs ciad-backend --lines 100  # Últimas 100 líneas
```

### Reiniciar aplicación
```bash
pm2 restart all              # Reiniciar todo
pm2 restart ciad-backend     # Solo backend
```

### Ver estado
```bash
pm2 status                   # Estado de apps
pm2 monit                    # Monitor en tiempo real
systemctl status nginx       # Estado de Nginx
```

### Actualizar aplicación
```bash
cd /var/www/ciad
./update-vps.sh              # Script de actualización rápida
```

### Ver logs de Nginx
```bash
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### Base de datos
```bash
# Conectar a PostgreSQL
psql -U ciaduser -d ciad

# Backup
pg_dump -U ciaduser ciad > backup.sql

# Restore
psql -U ciaduser ciad < backup.sql
```

---

## Solución de Problemas

### Backend no inicia
```bash
pm2 logs ciad-backend
# Revisa errores de conexión DB o variables de entorno
```

### Error 502 Bad Gateway (Nginx)
```bash
# Verifica que el backend esté corriendo
pm2 status

# Revisa logs de Nginx
sudo tail -f /var/log/nginx/error.log
```

### No se puede conectar a PostgreSQL
```bash
# Verifica que esté corriendo
sudo systemctl status postgresql

# Reinicia
sudo systemctl restart postgresql

# Verifica conexión
psql -U ciaduser -d ciad -h localhost
```

### Frontend muestra página en blanco
```bash
# Verifica la compilación
cd /var/www/ciad/frontend
cat dist/index.html

# Recompila
npm run build
```

---

## Seguridad Adicional

### 1. Configurar fail2ban (protección contra ataques)
```bash
sudo apt install -y fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

### 2. Deshabilitar login root por SSH
```bash
sudo nano /etc/ssh/sshd_config
# Cambiar: PermitRootLogin no
sudo systemctl restart sshd
```

### 3. Configurar backup automático
```bash
# Crear script de backup
sudo crontab -e

# Añadir línea (backup diario a las 3 AM):
0 3 * * * pg_dump -U ciaduser ciad > /root/backups/ciad-$(date +\%Y\%m\%d).sql
```

---

## Monitoreo

### Configurar alertas por email
```bash
# Instalar msmtp
sudo apt install -y msmtp msmtp-mta

# Configurar en ~/.msmtprc
# Luego PM2 puede enviar alertas
pm2 install pm2-logrotate
```

### Monitoreo con PM2 Plus (opcional, gratis)
```bash
pm2 plus
# Sigue las instrucciones para obtener dashboard web
```

---

## Soporte

- **Logs de aplicación**: `/var/www/ciad/backend/logs/`
- **Logs de Nginx**: `/var/log/nginx/`
- **Logs de PM2**: `pm2 logs`

Si necesitas ayuda, revisa los logs y busca el error específico.
