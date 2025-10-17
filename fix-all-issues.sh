#!/bin/bash
# Script para arreglar colores y WebSocket

echo "🔧 Arreglando problemas del frontend..."

cd /var/www/ciad/frontend/src

# Agregar estilos para mejorar visibilidad de texto
cat >> App.css << 'EOF'

/* ===========================================
   FIX: Mejorar visibilidad de texto en catálogo
   =========================================== */

/* Texto de badges visible sobre cualquier fondo */
[class*="bg-blue"], [class*="bg-purple"], [class*="bg-cyan"] {
  color: #1a1a1a !important;
}

/* Asegurar que los títulos de comandos sean visibles */
h3, h4, h5, strong {
  color: #1a1a1a !important;
}

/* Pills y badges */
.badge, [class*="badge"], [class*="pill"] {
  color: #ffffff !important;
  background-color: #2563eb !important;
  font-weight: 600 !important;
}

/* Texto en cards del catálogo */
.command-title, [class*="command"] h3 {
  color: #f0f0f0 !important;
  text-shadow: 0 1px 2px rgba(0,0,0,0.5);
}

/* Subtítulos y descripciones */
.command-subtitle, [class*="command"] p, [class*="command"] span {
  color: #d0d0d0 !important;
}

EOF

echo "✅ Estilos actualizados"

# Recompilar frontend
echo "🔨 Recompilando frontend..."
cd /var/www/ciad/frontend
npm run build

echo "🔄 Recargando Nginx..."
systemctl reload nginx

echo "✅ ¡Listo! Refresca tu navegador con Ctrl+F5"
