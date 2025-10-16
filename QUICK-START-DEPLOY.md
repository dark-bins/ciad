# 🚀 Deploy CIAD en 15 Minutos - Railway

## Paso 1: Sube tu código a GitHub (si no lo has hecho)

```bash
cd "C:\Users\Daniel\Desktop\nueva update\chatweb"

git init
git add .
git commit -m "Initial commit - CIAD project"

# Crea un repo en GitHub.com primero, luego:
git remote add origin https://github.com/TU_USUARIO/ciad.git
git branch -M main
git push -u origin main
```

---

## Paso 2: Railway - Crear cuenta

1. Ve a **https://railway.app**
2. Click **Login with GitHub**
3. Autoriza Railway

✅ **Cuenta creada**

---

## Paso 3: Nuevo Proyecto

1. Click **New Project**
2. Selecciona **Deploy from GitHub repo**
3. Busca y selecciona tu repositorio `ciad`
4. Railway detectará Node.js automáticamente

✅ **Proyecto creado**

---

## Paso 4: Agregar PostgreSQL

1. En tu proyecto, click **New**
2. Selecciona **Database**
3. Click **Add PostgreSQL**

Railway automáticamente:
- Crea la base de datos
- Genera `DATABASE_URL`
- La conecta a tu proyecto

✅ **Base de datos lista**

---

## Paso 5: Configurar Backend

1. Click en el servicio **backend** (debería detectarlo automáticamente)
2. Ve a **Settings**
3. **Root Directory**: escribe `backend`
4. Ve a **Variables** y agrega:

```
NODE_ENV=production
PORT=4000
USE_SQLITE=false

JWT_SECRET=TU_SECRETO_AQUI_32_CARACTERES_MINIMO

CORS_ORIGIN=*

TELEGRAM_API_ID=TU_API_ID
TELEGRAM_API_HASH=TU_API_HASH
TELEGRAM_PHONE=+51TU_NUMERO
TELEGRAM_PASSWORD=TU_PASSWORD_TELEGRAM
TELEGRAM_BOT_USERNAME=@SHKAINFORMATIONASXBOT

LOG_LEVEL=info
```

**Importante**:
- `DATABASE_URL` ya está configurada automáticamente por Railway
- Genera un JWT_SECRET seguro (32+ caracteres aleatorios)

5. Click **Deploy**

✅ **Backend desplegado**

---

## Paso 6: Configurar Frontend

### Opción A: También en Railway

1. En tu proyecto, click **New**
2. **GitHub Repo** → Selecciona el mismo repositorio
3. **Settings**:
   - **Root Directory**: `frontend`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm run preview`

4. **Variables**:
```
VITE_API_URL=https://TU-BACKEND.up.railway.app
```

(Copia la URL de tu backend de Railway)

5. Click **Deploy**

### Opción B: En Vercel (Recomendado para frontend)

1. Ve a **https://vercel.com**
2. **New Project** → **Import Git Repository**
3. Selecciona tu repo
4. **Root Directory**: `frontend`
5. **Framework Preset**: Vite
6. **Environment Variables**:
```
VITE_API_URL=https://TU-BACKEND.up.railway.app
```
7. **Deploy**

✅ **Frontend desplegado**

---

## Paso 7: Actualizar CORS

Ahora que tienes la URL del frontend:

1. Ve a Railway → Backend → Variables
2. Actualiza `CORS_ORIGIN`:
```
CORS_ORIGIN=https://tu-frontend.up.railway.app
```
(o la URL de Vercel si lo usaste)

3. El backend se redesplegará automáticamente

✅ **CORS configurado**

---

## Paso 8: Verificar

1. **Backend health check**:
   - Ve a `https://tu-backend.up.railway.app/health`
   - Deberías ver: `{"status":"ok"}`

2. **Frontend**:
   - Abre `https://tu-frontend.up.railway.app`
   - Deberías ver el login de CIAD

3. **Login**:
   - Usuario: `admin`
   - Password: `admin123`

✅ **¡FUNCIONANDO!**

---

## 🎉 ¡Listo!

Ahora tienes:
- ✅ Backend corriendo con PostgreSQL
- ✅ Frontend accesible públicamente
- ✅ HTTPS automático
- ✅ Deploy automático con git push

### URLs resultantes:

```
Frontend: https://ciad-frontend.up.railway.app
Backend:  https://ciad-backend.up.railway.app
Admin:    https://ciad-frontend.up.railway.app/admin
```

---

## 🔒 Hacer Beta Cerrada

### Método 1: Desactivar registro

1. Abre `backend/src/routes/auth.ts`
2. Comenta la ruta de registro:
```typescript
// router.post("/register", ...
```
3. Commit y push:
```bash
git add .
git commit -m "Desactivar registro público"
git push
```

Railway redesplegará automáticamente.

### Método 2: Lista blanca

En `backend/src/routes/auth.ts`, antes del registro:

```typescript
const BETA_EMAILS = [
  'usuario1@email.com',
  'usuario2@email.com',
];

// En el endpoint de registro
if (!BETA_EMAILS.includes(req.body.email)) {
  return res.status(403).json({
    error: 'Beta cerrada - necesitas invitación'
  });
}
```

---

## 📊 Monitorear

### Logs en tiempo real:

1. En Railway → Click en tu servicio
2. Ve a **Deployments** → **View Logs**

O usa la CLI:
```bash
npm install -g @railway/cli
railway login
railway logs -f
```

### Métricas:

```
https://tu-backend.up.railway.app/api/admin/metrics
```

---

## 🚨 Problemas Comunes

### "Cannot connect to database"
- Verifica que `USE_SQLITE=false`
- Railway debería agregar `DATABASE_URL` automáticamente

### "CORS error" en el navegador
- Actualiza `CORS_ORIGIN` con la URL correcta del frontend
- No olvides el `https://`

### Frontend no carga
- Verifica `VITE_API_URL` en las variables de Vercel/Railway
- Debe ser la URL completa: `https://...`

### Telegram no conecta
- Verifica todas las variables `TELEGRAM_*`
- Asegúrate que el bot esté activo

---

## 🎯 Próximos Pasos

1. **Prueba todo**:
   - Login
   - Comandos
   - Admin panel
   - Límites de créditos

2. **Invita testers**:
   - Crea usuarios desde admin panel
   - O agrega emails a lista blanca

3. **Dominio personalizado** (opcional):
   - Railway Settings → Domains
   - Agrega tu dominio

4. **Backups**:
   - Railway hace backups automáticos
   - Puedes exportar manualmente desde el dashboard

---

## 💰 Costos

**Railway Free Tier:**
- 500 horas/mes gratis
- PostgreSQL 512MB incluido
- Suficiente para beta cerrada (10-50 usuarios)

**Cuando escalar:**
- >100 usuarios activos: Considera Railway Pro ($20/mes)
- O migra a VPS ($6/mes DigitalOcean)

---

## ✅ Checklist Final

- [ ] Backend responde en `/health`
- [ ] Frontend carga y se ve bien
- [ ] Login funciona
- [ ] Admin panel accesible
- [ ] Comandos ejecutándose
- [ ] Telegram conectado
- [ ] Logs funcionando
- [ ] Registro desactivado/protegido
- [ ] CORS configurado correctamente
- [ ] HTTPS activo (automático)

---

**¡Felicidades! Tu beta está online 🎉**

Para más detalles, revisa `DEPLOYMENT-GUIDE.md`
