# Desplegar CIAD en Render

## Paso 1: Crear cuenta
https://render.com (usa GitHub)

## Paso 2: Desplegar PostgreSQL

1. Dashboard → New → PostgreSQL
2. Nombre: `ciad-database`
3. Plan: Free
4. Copiar la URL interna

## Paso 3: Desplegar Backend

1. Dashboard → New → Web Service
2. Conectar tu repositorio GitHub
3. Configuración:
   - Name: `ciad-backend`
   - Root Directory: `backend`
   - Environment: `Node`
   - Build Command: `npm install && npm run build`
   - Start Command: `npm run start`
   - Plan: Free

4. Variables de entorno:
```
NODE_ENV=production
PORT=4000
DATABASE_URL=[URL de PostgreSQL de Render]
JWT_SECRET=tu_secreto_super_seguro
CORS_ORIGIN=https://ciad-frontend.onrender.com
TELEGRAM_API_ID=tu_api_id
TELEGRAM_API_HASH=tu_api_hash
TELEGRAM_PHONE=tu_telefono
TELEGRAM_PASSWORD=tu_password
TELEGRAM_BOT_USERNAME=@SHKAINFORMATIONASXBOT
USE_SQLITE=false
```

## Paso 4: Desplegar Frontend

1. Dashboard → New → Static Site
2. Configuración:
   - Name: `ciad-frontend`
   - Root Directory: `frontend`
   - Build Command: `npm install && npm run build`
   - Publish Directory: `dist`

3. Variable de entorno:
```
VITE_API_URL=https://ciad-backend.onrender.com
```

## URLs resultantes:
- Frontend: `https://ciad-frontend.onrender.com`
- Backend: `https://ciad-backend.onrender.com`

## ⚠️ Limitación Free Tier:
- Servicios se duermen después de 15 min inactividad
- Primera petición tarda ~30 segundos en despertar
- Para beta cerrada está OK

## Ventajas:
✅ Completamente gratis
✅ SSL/HTTPS automático
✅ PostgreSQL incluido
✅ Git push para deploy
