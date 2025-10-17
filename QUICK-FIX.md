# Fix Rápido - Colores y WebSocket

## Problema 1: Text

o blanco no se ve en el catálogo
Los badges "COMANDOS DISPONIBLES" y "Search Data"/"Private Data" tienen texto blanco sobre fondo claro.

## Problema 2: WebSocket errors
El frontend intenta conectar a WebSocket pero el backend no tiene Socket.IO configurado correctamente.

## Solución:

### 1. Cambiar colores en el catálogo (frontend/src/App.css)
Agregar estilos específicos para mejorar visibilidad:

```css
/* Badges del catálogo */
.badge, [class*="badge"] {
  color: #1a1a1a !important;
  font-weight: 600 !important;
}

/* Cards de comandos */
.command-card, [class*="command"] {
  color: #e0e0e0 !important;
}

.command-card h3, .command-card strong {
  color: #ffffff !important;
}
```

### 2. Deshabilitar WebSocket temporalmente
En frontend, comentar la conexión WebSocket hasta configurarla correctamente.

