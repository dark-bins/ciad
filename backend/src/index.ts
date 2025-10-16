import http from "http";
import express from "express";
import cors from "cors";

import env from "./config/env";
import { logger, requestLogger, UsageStats } from "./core/logger";
import { createSocketGateway } from "./websocket/socketGateway";
import { createCommandService } from "./services/commandService";
import { createSessionService } from "./services/sessionService";
import { createDefaultRegistry } from "./services/providerRegistry";
import { createMockProvider } from "./providers/mockProvider";
import { createDirectTelegramProvider } from "./providers/telegramProviderDirect";
import { createCommandRouter } from "./routes/commandRoutes";
import { createRateLimiter } from "./services/rateLimiter";
import { initDatabase, closeDatabase } from "./config/database";
import authRoutes from "./routes/auth";
import adminRoutes from "./routes/admin";

async function bootstrap() {
  const app = express();

  const corsOrigins = env.CORS_ORIGIN
    ? env.CORS_ORIGIN.split(",").map((origin) => origin.trim())
    : ["http://localhost:5173", "http://localhost:3000"];

  app.use(
    cors({
      origin: corsOrigins,
      credentials: true,
    }),
  );
  app.use(express.json());

  // Middleware de logging para todas las peticiones HTTP
  app.use(requestLogger);

  // Inicializar PostgreSQL
  try {
    await initDatabase();
    logger.info("✅ Base de datos PostgreSQL inicializada");
  } catch (error) {
    logger.error("❌ Error al inicializar PostgreSQL:", { error });
    process.exit(1);
  }

  const sessionService = createSessionService();
  const providerRegistry = createDefaultRegistry();

  // Inicializar rate limiter con configuración personalizada
  const rateLimiter = createRateLimiter({
    commandCooldown: 15, // 15 segundos entre comandos
    maxCommandsPerWindow: 999999, // Sin límite de ventana
    windowDuration: 300, // En 5 minutos
    spamPenalty: 0, // Sin penalizaciones
  });
  logger.info("✅ Rate limiter inicializado (solo cooldown de 15s)");

  try {
    const telegramProvider = await createDirectTelegramProvider();
    providerRegistry.register(telegramProvider);
    logger.info("✅ Proveedor de Telegram directo registrado");
  } catch (error) {
    logger.warn("⚠️ No se pudo inicializar el proveedor de Telegram directo. Continuando con proveedores disponibles.", {
      error,
    });
    // Usar mock provider como fallback
    providerRegistry.register(createMockProvider());
  }

  const commandService = createCommandService(providerRegistry, sessionService, rateLimiter);

  const server = http.createServer(app);
  const socketGateway = createSocketGateway(server);

  // Rutas de autenticación
  app.use("/api/auth", authRoutes);

  // Rutas de administración
  app.use("/api/admin", adminRoutes);

  // Rutas de comandos (existentes)
  app.use("/api", createCommandRouter(commandService, sessionService, socketGateway, providerRegistry));

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  server.listen(env.PORT, () => {
    logger.info(`ChatWeb backend escuchando en puerto ${env.PORT}`);
  });

  // Manejar cierre graceful
  const gracefulShutdown = async () => {
    logger.info("Cerrando servidor...");
    server.close(async () => {
      await closeDatabase();
      process.exit(0);
    });
  };

  process.on("SIGTERM", gracefulShutdown);
  process.on("SIGINT", gracefulShutdown);
}

bootstrap().catch((error) => {
  logger.error("Fallo al iniciar ChatWeb backend", { error });
  process.exit(1);
});
