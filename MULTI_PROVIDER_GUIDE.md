# 🔌 Guía de Integración Multi-Provider

## Arquitectura Actual

ChatWeb está diseñado con una arquitectura de **Registry Pattern** que permite agregar múltiples proveedores de Telegram sin modificar el core del sistema.

## Estructura de Proveedores

```
backend/src/providers/
├── telegramProviderDirect.ts    ← Proveedor actual (SHKAINFORMATIONASXBOT)
├── telegramProviderSecondary.ts ← Nuevo proveedor (ejemplo)
├── telegramProviderThird.ts     ← Otro proveedor (ejemplo)
└── mockProvider.ts              ← Para testing
```

---

## 🚀 Cómo Agregar un Nuevo Proveedor

### Paso 1: Crear el archivo del proveedor

```typescript
// backend/src/providers/telegramProviderSecondary.ts

import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions";
import { TelegramProvider } from "./types";

export const createSecondaryTelegramProvider = async (): Promise<TelegramProvider> => {
  const client = new TelegramClient(
    new StringSession(process.env.TELEGRAM_SESSION_2 || ""),
    parseInt(process.env.TELEGRAM_API_ID_2 || "", 10),
    process.env.TELEGRAM_API_HASH_2 || "",
    { connectionRetries: 5 }
  );

  await client.connect();

  return {
    getId: () => "telegram-provider-secondary",
    getName: () => "Secondary Bot Provider",
    isConnected: () => client.connected,

    sendCommand: async (session, command) => {
      // Lógica específica de este proveedor
      await client.sendMessage(process.env.TELEGRAM_BOT_2, { message: command });

      // Recoger respuestas...
      return {
        messages: [...],
        meta: { provider: "secondary", credits: 1 }
      };
    }
  };
};
```

### Paso 2: Registrar en el sistema

```typescript
// backend/src/index.ts

import { createSecondaryTelegramProvider } from "./providers/telegramProviderSecondary";

// Después del proveedor principal:
try {
  const secondaryProvider = await createSecondaryTelegramProvider();
  providerRegistry.register(secondaryProvider);
  logger.info("✅ Secondary provider registered");
} catch (error) {
  logger.warn("⚠️ Secondary provider failed, continuing...");
}
```

### Paso 3: Configurar variables de entorno

```env
# .env

# Provider 1 (Actual - SHKAINFORMATIONASXBOT)
TELEGRAM_API_ID=20450582
TELEGRAM_API_HASH=e146872423c00526f40442469669e8ce
TELEGRAM_SESSION_STRING=1AQAOMTQ5...
TELEGRAM_PROVIDER_BOT=SHKAINFORMATIONASXBOT

# Provider 2 (Nuevo bot)
TELEGRAM_API_ID_2=tu_api_id
TELEGRAM_API_HASH_2=tu_api_hash
TELEGRAM_SESSION_STRING_2=session_string_2
TELEGRAM_BOT_2=@NombreDelSegundoBot

# Provider 3 (Otro bot)
TELEGRAM_API_ID_3=otro_api_id
...
```

---

## 🎯 Uso de Múltiples Proveedores

### Opción 1: Round-Robin (Balanceo de carga)

```typescript
// backend/src/services/providerRegistry.ts

class ProviderRegistry {
  private currentIndex = 0;

  getNextProvider(): TelegramProvider {
    const providers = Array.from(this.providers.values());
    const provider = providers[this.currentIndex];
    this.currentIndex = (this.currentIndex + 1) % providers.length;
    return provider;
  }
}
```

### Opción 2: Por comando específico

```typescript
// backend/src/config/commandMappings.ts

export const COMMAND_MAPPINGS = {
  "/dni": {
    providerCmd: "/dni",
    preferredProvider: "telegram-provider-primary", // ← Especificar proveedor
    description: "Consulta RENIEC",
  },
  "/whois": {
    providerCmd: "/whois",
    preferredProvider: "telegram-provider-secondary", // ← Otro proveedor
    description: "Consulta dominio",
  },
};
```

### Opción 3: Failover automático

```typescript
async executeCommand(command: string): Promise<ProviderResult> {
  const providers = this.getAllProviders();

  for (const provider of providers) {
    try {
      if (provider.isConnected()) {
        return await provider.sendCommand(session, command);
      }
    } catch (error) {
      logger.warn(`Provider ${provider.getId()} failed, trying next...`);
      continue; // Intenta con el siguiente
    }
  }

  throw new Error("All providers failed");
}
```

---

## 🔥 Ventajas de la Arquitectura Actual

✅ **Escalabilidad**: Agrega N proveedores sin cambiar código core
✅ **Failover**: Si un bot falla, usa otro automáticamente
✅ **Balanceo**: Distribuye carga entre múltiples bots
✅ **Especialización**: Cada bot puede tener comandos diferentes
✅ **Rate Limiting**: Evita límites de Telegram usando múltiples bots

---

## 📊 Casos de Uso Reales

### Caso 1: Bot Principal + Bot de Respaldo
```
Bot 1 (Principal): 1000 requests/día ✅
Bot 2 (Backup):    Se activa si Bot 1 falla ⚠️
```

### Caso 2: Bots Especializados
```
Bot 1: Comandos RENIEC (DNI, nombres)
Bot 2: Comandos Telefonía (cel, tel, bitel)
Bot 3: Comandos Vehículos (placa, propietario)
```

### Caso 3: Distribución de Carga
```
Usuario 1 → Bot 1
Usuario 2 → Bot 2
Usuario 3 → Bot 3
Usuario 4 → Bot 1 (round-robin)
```

---

## 🛠️ Comandos por Proveedor

Puedes crear una matriz de qué comandos soporta cada proveedor:

```typescript
// backend/src/config/providerCapabilities.ts

export const PROVIDER_CAPABILITIES = {
  "telegram-provider-primary": [
    "/dni", "/dnif", "/tel", "/antpe", "/ag"
  ],
  "telegram-provider-secondary": [
    "/whois", "/email", "/social", "/crypto"
  ],
  "telegram-provider-osint": [
    "/ip", "/domain", "/leak", "/breach"
  ]
};
```

---

## 🎮 Panel Admin: Gestión de Proveedores

Puedes agregar en el panel admin:

- Ver estado de cada proveedor (conectado/desconectado)
- Activar/desactivar proveedores manualmente
- Ver estadísticas por proveedor
- Configurar prioridades

```typescript
// Endpoint: GET /api/admin/providers
{
  providers: [
    { id: "primary", name: "SHKAINFORMATIONASXBOT", status: "connected", commands: 29 },
    { id: "secondary", name: "SecondBot", status: "connected", commands: 15 },
    { id: "osint", name: "OSINTBot", status: "disconnected", commands: 0 }
  ]
}
```

---

## 🚀 Próximos Pasos Recomendados

1. **Testear beta actual** con el proveedor existente
2. **Conseguir credenciales** de otros bots de Telegram
3. **Crear proveedores secundarios** usando esta guía
4. **Implementar balanceo** de carga round-robin
5. **Agregar panel de providers** en el admin dashboard

---

## 💡 Ejemplo Completo: Agregar Bot de Respaldo

```typescript
// 1. Crear proveedor
export const createBackupProvider = async () => {
  const client = new TelegramClient(
    new StringSession(process.env.TELEGRAM_SESSION_BACKUP),
    parseInt(process.env.TELEGRAM_API_ID_BACKUP),
    process.env.TELEGRAM_API_HASH_BACKUP,
    { connectionRetries: 3 }
  );

  await client.connect();

  return {
    getId: () => "telegram-backup",
    getName: () => "Backup Bot",
    sendCommand: async (session, cmd) => {
      // Lógica igual al principal
    }
  };
};

// 2. Registrar con fallback
try {
  const backupProvider = await createBackupProvider();
  providerRegistry.register(backupProvider);
  logger.info("✅ Backup provider ready");
} catch (error) {
  logger.warn("⚠️ Backup not available");
}

// 3. Usar con failover automático
const result = await commandService.executeWithFailover(command);
```

---

## ✅ Checklist de Implementación

- [ ] Obtener credenciales del segundo bot
- [ ] Crear archivo `telegramProviderSecondary.ts`
- [ ] Agregar variables de entorno
- [ ] Registrar en `index.ts`
- [ ] Probar conexión
- [ ] Implementar estrategia de selección (round-robin/failover/especializado)
- [ ] Actualizar panel admin para mostrar múltiples proveedores
- [ ] Documentar comandos por proveedor

---

**¿Necesitas ayuda implementando algún proveedor específico?**
