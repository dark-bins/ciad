# 🚀 CIAD - Pasos para Poner Online

## ✅ Lo que ya está listo:

1. ✅ Credenciales cambiadas: `scrall` / `scrall123`
2. ✅ Registro público desactivado (beta cerrada)
3. ✅ Código commiteado en Git
4. ✅ Tests pasando (26/26)
5. ✅ Logging profesional configurado
6. ✅ Variables de entorno preparadas

---

## 📝 PASOS SIGUIENTES:

### 1️⃣ Crear Repositorio en GitHub

1. Ve a https://github.com/new
2. Nombre del repo: `ciad` (o el que prefieras)
3. **NO** marques "Add README" ni "Add .gitignore" (ya los tenemos)
4. Click **Create repository**

### 2️⃣ Subir el Código a GitHub

Copia y pega estos comandos **UNO POR UNO** en tu terminal:

```bash
cd "C:\Users\Daniel\Desktop\nueva update\chatweb"

# Cambiar de master a main
git branch -M main

# Agregar tu repositorio de GitHub (CAMBIA LA URL POR LA TUYA)
git remote add origin https://github.com/TU_USUARIO/ciad.git

# Subir el código
git push -u origin main
```

**Importante**: Reemplaza `TU_USUARIO` con tu usuario de GitHub.

---

### 3️⃣ Desplegar en Railway

#### A. Crear Cuenta
1. Ve a https://railway.app
2. Click **Login with GitHub**
3. Autoriza Railway

#### B. Crear Proyecto
1. Click **New Project**
2. Selecciona **Deploy from GitHub repo**
3. Busca y selecciona tu repositorio `ciad`
4. Railway detectará automáticamente Node.js

#### C. Agregar PostgreSQL
1. En tu proyecto, click **New**
2. Selecciona **Database**
3. Click **Add PostgreSQL**
4. ✅ Railway creará `DATABASE_URL` automáticamente

#### D. Configurar Backend

1. Click en el servicio del **backend**
2. Ve a **Settings**:
   - **Root Directory**: escribe `backend`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm run start`

3. Ve a **Variables** y agrega:

```env
NODE_ENV=production
PORT=4000
USE_SQLITE=false

JWT_SECRET=CAMBIA_ESTE_SECRETO_POR_32_CARACTERES_ALEATORIOS_MINIMO

CORS_ORIGIN=*

TELEGRAM_API_ID=TU_API_ID
TELEGRAM_API_HASH=TU_API_HASH
TELEGRAM_PHONE=+51TU_NUMERO
TELEGRAM_PASSWORD=TU_PASSWORD_TELEGRAM
TELEGRAM_BOT_USERNAME=@SHKAINFORMATIONASXBOT o @DELUXEDATAA_BOT

LOG_LEVEL=info
```

**⚠️ MUY IMPORTANTE:**
- `DATABASE_URL` ya está configurada automáticamente por Railway
- Genera un `JWT_SECRET` seguro (ej: `openssl rand -hex 32`)
- Usa tus credenciales reales de Telegram

4. Click **Deploy**

#### E. Configurar Frontend

**Opción 1: También en Railway (Recomendado)**

1. En tu proyecto, click **New**
2. **GitHub Repo** → Selecciona el mismo repositorio
3. **Settings**:
   - **Root Directory**: `frontend`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm run preview`

4. **Variables** (ESPERA A QUE EL BACKEND TERMINE DE DEPLOYAR):
```env
VITE_API_URL=https://TU-BACKEND.up.railway.app
```

(Copia la URL exacta de tu backend de Railway)

5. Click **Deploy**

**Opción 2: Frontend en Vercel (Alternativa más rápida)**

1. Ve a https://vercel.com
2. **New Project** → **Import Git Repository**
3. Selecciona tu repo
4. **Root Directory**: `frontend`
5. **Framework Preset**: Vite
6. **Environment Variables**:
```env
VITE_API_URL=https://TU-BACKEND.up.railway.app
```
7. **Deploy**

#### F. Actualizar CORS

Ahora que tienes la URL del frontend:

1. Ve a Railway → Backend → Variables
2. Actualiza `CORS_ORIGIN`:
```env
CORS_ORIGIN=https://tu-frontend.up.railway.app
```
(o la URL de Vercel si lo usaste)

3. El backend se redesplegará automáticamente

---

### 4️⃣ Verificar que Todo Funcione

1. **Backend Health Check**:
   - Ve a `https://tu-backend.up.railway.app/health`
   - Deberías ver: `{"status":"ok"}`

2. **Frontend**:
   - Abre `https://tu-frontend.up.railway.app`
   - Deberías ver el login de CIAD

3. **Login**:
   ```
   Usuario: scrall
   Password: scrall123
   ```

4. **Prueba un Comando**:
   - Escribe `/dni 12345678`
   - Debería ejecutarse correctamente

5. **Admin Panel**:
   - Ve a `https://tu-frontend.up.railway.app/admin`
   - Verifica métricas y usuarios

---

## ✅ URLs Resultantes

Tendrás algo como:

```
Frontend: https://ciad-production.up.railway.app
Backend:  https://ciad-backend-production.up.railway.app
Admin:    https://ciad-production.up.railway.app/admin
```

---

## 🔧 Troubleshooting

### Error: "Cannot connect to database"
- Verifica que PostgreSQL esté agregado en Railway
- `DATABASE_URL` debe estar en las variables del backend
- `USE_SQLITE=false` debe estar configurado

### Error: "CORS policy"
- Actualiza `CORS_ORIGIN` con la URL correcta del frontend
- No olvides el `https://`
- El backend se redesplegará automáticamente

### Frontend no carga
- Verifica `VITE_API_URL` en las variables del frontend
- Debe ser la URL completa: `https://...`
- Asegúrate que el backend esté respondiendo en `/health`

### Telegram no conecta
- Verifica todas las variables `TELEGRAM_*`
- Asegúrate que el bot esté activo
- Revisa los logs en Railway

---

## 📊 Ver Logs en Railway

1. Click en tu servicio (backend o frontend)
2. Ve a **Deployments**
3. Click en el deployment activo
4. Ve a **View Logs**

O instala la CLI:
```bash
npm install -g @railway/cli
railway login
railway logs -f
```

---

## 👥 Agregar Usuarios Beta

Como el registro está desactivado, crea usuarios desde el admin panel:

1. Login como `scrall`
2. Ve a Admin → Users
3. **No hay botón de "Crear Usuario"** aún

**Para crear usuarios manualmente** por ahora, conéctate a la base de datos:

En Railway:
1. PostgreSQL → Data → Connect
2. Ejecuta:
```sql
INSERT INTO users (username, email, password_hash, role, plan, credits)
VALUES (
  'nuevo_usuario',
  'email@ejemplo.com',
  '$2b$10$leKwaHQ9fzw1wpija/kVk.KqcmCou1ECtzDJiOzoUi5C2m7lGdmIO',
  'user',
  'FREE',
  100
);
```

El hash es para la contraseña `scrall123`. Cambia `username` y `email`.

---

## 🎉 ¡Listo!

Tu beta cerrada está online. Ahora puedes:

1. ✅ Invitar testers
2. ✅ Monitorear en Railway
3. ✅ Ver logs en tiempo real
4. ✅ Verificar métricas en `/api/admin/metrics`

---

## 💰 Costos

**Railway Free Tier:**
- 500 horas/mes gratis
- PostgreSQL 512MB incluido
- Suficiente para 10-50 usuarios beta

**Cuando necesites escalar:**
- Railway Pro: $20/mes (ilimitado)
- O migra a VPS: $6/mes

---

## 📞 Soporte

Si hay algún error:
1. Revisa los logs en Railway
2. Verifica las variables de entorno
3. Consulta `DEPLOYMENT-GUIDE.md` para más detalles

---

**¡Felicidades! Tu sistema está listo para la beta 🚀**
