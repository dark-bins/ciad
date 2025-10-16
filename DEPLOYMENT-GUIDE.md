# 🚀 Guía de Deployment - CIAD Beta Cerrada

## 📋 Resumen de Opciones

| Plataforma | Costo | Dificultad | Tiempo | Recomendado |
|------------|-------|------------|--------|-------------|
| **Railway** | Gratis (500h/mes) | ⭐ Fácil | 15 min | ✅ SÍ |
| **Render** | Gratis | ⭐⭐ Media | 20 min | ✅ SÍ |
| **Vercel + Railway** | Gratis | ⭐⭐ Media | 25 min | ✅ SÍ |
| **VPS (DigitalOcean)** | $6/mes | ⭐⭐⭐⭐ Alta | 2 horas | Para prod final |

---

## 🎯 OPCIÓN RECOMENDADA: Railway

### Por qué Railway:
- ✅ Deploy en **10 minutos**
- ✅ PostgreSQL incluido gratis
- ✅ SSL/HTTPS automático
- ✅ No se duerme (mejor que Render)
- ✅ Dominio personalizado gratis
- ✅ Logs en tiempo real

### Pasos:

#### 1. Preparar el código
```bash
cd "C:\Users\Daniel\Desktop\nueva update\chatweb"

# Commit todos los cambios
git add .
git commit -m "Preparar para deployment en Railway"
git push origin main
```

#### 2. Crear cuenta en Railway
1. Ve a https://railway.app
2. Sign up con GitHub
3. Autoriza el acceso

#### 3. Crear nuevo proyecto
1. **New Project** → **Deploy from GitHub repo**
2. Selecciona el repositorio `chatweb`
3. Railway detectará automáticamente Node.js

#### 4. Agregar PostgreSQL
1. En tu proyecto → **New** → **Database** → **Add PostgreSQL**
2. Railway creará automáticamente la variable `DATABASE_URL`

#### 5. Configurar Backend
1. Click en el servicio del backend
2. **Settings** → **Root Directory** → `backend`
3. **Variables**:
   ```
   NODE_ENV=production
   PORT=4000
   JWT_SECRET=TU_SECRETO_SUPER_SEGURO_CAMBIAR_ESTO_POR_32_CARACTERES
   CORS_ORIGIN=https://tu-proyecto.up.railway.app
   TELEGRAM_API_ID=tu_api_id
   TELEGRAM_API_HASH=tu_api_hash
   TELEGRAM_PHONE=+51999999999
   TELEGRAM_PASSWORD=tu_password
   TELEGRAM_BOT_USERNAME=@SHKAINFORMATIONASXBOT o @DELUXEDATAA_BOT
   USE_SQLITE=false
   LOG_LEVEL=info
   ```
4. **Deploy**

#### 6. Configurar Frontend
1. **New** → **GitHub Repo** (mismo repo)
2. **Settings** → **Root Directory** → `frontend`
3. **Variables**:
   ```
   VITE_API_URL=https://tu-backend.up.railway.app
   ```
4. **Build Command**: `npm install && npm run build`
5. **Start Command**: `npm run preview`

#### 7. Obtener las URLs
- Backend: `https://ciad-backend-production.up.railway.app`
- Frontend: `https://ciad-frontend-production.up.railway.app`

#### 8. Configurar Beta Cerrada
Para limitar acceso, tienes 2 opciones:

**Opción A: Desactivar registro público**
En el backend, comenta el endpoint de registro en `src/routes/auth.ts`:
```typescript
// router.post("/register", ... // Comentar esta línea
```

**Opción B: Sistema de invitaciones**
Agrega códigos de invitación que solo tú generes.

---

## 🎯 ALTERNATIVA: Render (100% Gratis)

### Pasos:

#### 1. PostgreSQL
1. https://render.com → **New** → **PostgreSQL**
2. Name: `ciad-database`
3. Database: `ciad_db`
4. User: `ciad_user`
5. Plan: **Free**
6. Copiar **Internal Database URL**

#### 2. Backend
1. **New** → **Web Service**
2. Connect GitHub repo
3. Config:
   - Name: `ciad-backend`
   - Root Directory: `backend`
   - Build: `npm install && npm run build`
   - Start: `npm run start`
   - Plan: **Free**
4. Variables de entorno (mismo que Railway)

#### 3. Frontend
1. **New** → **Static Site**
2. Config:
   - Name: `ciad-frontend`
   - Root Directory: `frontend`
   - Build: `npm install && npm run build`
   - Publish: `dist`
3. Variables:
   ```
   VITE_API_URL=https://ciad-backend.onrender.com
   ```

⚠️ **Limitación**: Render Free se duerme después de 15 minutos sin uso. Primera petición tarda 30-60 segundos.

---

## 🎯 OPCIÓN PRO: VPS (DigitalOcean/Linode)

Para cuando estés listo para producción seria:

### Costos:
- VPS: $6/mes (DigitalOcean Droplet)
- Dominio: $10/año (.com en Namecheap)
- **Total: ~$7/mes**

### Ventajas:
- Control total
- No limitaciones
- Mejor rendimiento
- IP dedicada

### Desventajas:
- Requiere configuración manual
- Necesitas conocimientos de Linux/DevOps
- Mantenimiento manual

---

## 🔒 Seguridad para Beta Cerrada

### 1. Desactivar registro público
```typescript
// backend/src/routes/auth.ts
// Comenta o elimina:
// router.post("/register", ...)
```

### 2. Crear usuarios manualmente
Desde el admin panel o directamente en la base de datos.

### 3. Lista blanca de emails
```typescript
const ALLOWED_EMAILS = [
  'usuario1@email.com',
  'usuario2@email.com',
];

// En registro, validar:
if (!ALLOWED_EMAILS.includes(email)) {
  throw new Error('Beta cerrada - necesitas invitación');
}
```

### 4. Códigos de invitación
Genera códigos únicos que usuarios deben ingresar al registrarse.

---

## 📊 Monitoreo Post-Deploy

### Verificar que todo funciona:
1. **Health check**: `https://tu-backend.railway.app/health`
2. **Login**: Prueba login con usuario admin
3. **Comandos**: Ejecuta un comando de prueba
4. **Logs**: Revisa logs en Railway dashboard
5. **Métricas**: `https://tu-backend.railway.app/api/admin/metrics`

### Logs en Railway:
```bash
# Instalar CLI
npm install -g @railway/cli

# Ver logs en tiempo real
railway logs -f
```

---

## 🚨 Troubleshooting

### Error: "Cannot connect to database"
- Verifica que `DATABASE_URL` esté configurada
- Asegúrate que `USE_SQLITE=false`

### Error: "CORS policy"
- Verifica que `CORS_ORIGIN` en backend sea la URL del frontend
- En frontend, verifica que `VITE_API_URL` sea correcta

### Frontend no se conecta al backend
- Verifica las variables de entorno
- Check network tab en DevTools del navegador

### Telegram no se conecta
- Verifica todas las variables TELEGRAM_*
- Asegúrate que el bot esté activo

---

## ✅ Checklist Pre-Launch

- [ ] Backend desplegado y respondiendo en `/health`
- [ ] Frontend desplegado y cargando
- [ ] Base de datos PostgreSQL conectada
- [ ] Usuario admin creado
- [ ] Telegram bot conectado y respondiendo
- [ ] HTTPS funcionando (automático en Railway/Render)
- [ ] Logs funcionando
- [ ] Registro desactivado o protegido
- [ ] Dominios personalizados configurados (opcional)
- [ ] Backup de base de datos configurado

---

## 📞 Próximos pasos después del deploy

1. **Prueba exhaustiva**:
   - Login/Logout
   - Todos los comandos
   - Admin panel
   - Límites de créditos
   - Rate limiting

2. **Invitar beta testers**:
   - 5-10 personas inicialmente
   - Recoger feedback
   - Monitorear errores en logs

3. **Iterar**:
   - Corregir bugs encontrados
   - Deploy automático con git push
   - Mejorar basado en feedback

4. **Escalar**:
   - Cuando tengas >100 usuarios, considera migrar a VPS
   - Configurar backups automáticos
   - Implementar CDN para imágenes

---

## 💡 Tips Finales

1. **Railway es tu mejor opción para empezar** - Deploy más rápido y sin limitaciones molestas
2. **Usa un dominio personalizado** - Se ve más profesional
3. **Monitorea los logs** - Railway/Render tienen excelentes dashboards
4. **Haz backups** - Exporta la BD regularmente
5. **Beta cerrada primero** - Testea bien antes de abrir al público

---

¿Preguntas? Revisa los archivos:
- `railway-setup.md` - Guía detallada Railway
- `render-setup.md` - Guía detallada Render
- `.env.production.example` - Variables de entorno de ejemplo
