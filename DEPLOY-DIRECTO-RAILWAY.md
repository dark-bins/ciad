# Deploy Directo en Railway (Sin GitHub)

## Método: Railway CLI

### 1. Instalar Railway CLI

```bash
npm install -g @railway/cli
```

### 2. Login en Railway

```bash
railway login
```

Esto abrirá tu navegador para autenticarte.

### 3. Crear proyecto

```bash
cd "C:\Users\Daniel\Desktop\nueva update\chatweb"
railway init
```

Selecciona "Create new project" y dale un nombre (ej: ciad)

### 4. Deploy Backend

```bash
cd backend
railway up
```

### 5. Agregar PostgreSQL

```bash
railway add
```

Selecciona PostgreSQL

### 6. Variables de entorno

```bash
railway variables set NODE_ENV=production
railway variables set PORT=4000
railway variables set USE_SQLITE=false
railway variables set JWT_SECRET=ciad2025secretkey32charactersmini
railway variables set CORS_ORIGIN=*
railway variables set TELEGRAM_BOT_USERNAME=@DELUXEDATAA_BOT
```

Agrega las de Telegram con tus credenciales reales.

### 7. Deploy Frontend

```bash
cd ../frontend
railway up
```

---

## Más fácil: Usa Render en su lugar

Render permite deploy desde repos privados sin problema.
