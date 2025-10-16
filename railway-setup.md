# Desplegar CIAD en Railway

## Paso 1: Preparar el proyecto

1. Crear cuenta en https://railway.app (usa GitHub)
2. Instalar Railway CLI (opcional):
   ```bash
   npm install -g @railway/cli
   ```

## Paso 2: Crear archivos de configuración

### Backend - Procfile
Crear `backend/Procfile`:
```
web: npm run start
```

### Backend - railway.json
Crear `backend/railway.json`:
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "npm run start",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

## Paso 3: Variables de entorno en Railway

En el dashboard de Railway, agregar estas variables:

```
NODE_ENV=production
PORT=4000
DATABASE_URL=postgresql://... (Railway te da esto automáticamente)
JWT_SECRET=tu_secreto_super_seguro_aqui
CORS_ORIGIN=https://tu-frontend.railway.app
TELEGRAM_API_ID=tu_api_id
TELEGRAM_API_HASH=tu_api_hash
TELEGRAM_PHONE=tu_telefono
TELEGRAM_PASSWORD=tu_password
TELEGRAM_BOT_USERNAME=@SHKAINFORMATIONASXBOT
USE_SQLITE=false
```

## Paso 4: Deploy

### Desde la web:
1. New Project → Deploy from GitHub
2. Selecciona tu repo
3. Agrega PostgreSQL plugin
4. Deploy backend (carpeta backend)
5. Deploy frontend (carpeta frontend)

### Frontend en Railway:
Variables de entorno del frontend:
```
VITE_API_URL=https://tu-backend.railway.app
```

## Paso 5: URLs resultantes

Tendrás algo como:
- Backend: `https://ciad-backend.railway.app`
- Frontend: `https://ciad-frontend.railway.app`
- PostgreSQL: Automático (Railway lo conecta)

## Ventajas:
✅ Gratis hasta 500 horas/mes
✅ PostgreSQL incluido
✅ SSL/HTTPS automático
✅ Deploy automático con git push
✅ Muy fácil de usar
