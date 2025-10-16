import { Router } from "express";
import { CommandService, CommandError } from "../services/commandService";
import { SessionService } from "../services/sessionService";
import { SocketGateway } from "../websocket/socketGateway";
import { ProviderRegistry } from "../services/providerRegistry";
import { getCommandCatalog } from "../config/commandCatalog";
import { authenticate, AuthRequest } from "../middleware/authenticate";

export const createCommandRouter = (
  commandService: CommandService,
  sessionService: SessionService,
  socketGateway: SocketGateway,
  providerRegistry: ProviderRegistry,
) => {
  const router = Router();

  router.get("/providers", (_req, res) => {
    const providers = providerRegistry.list().map((provider) => provider.descriptor);
    res.json({ providers });
  });

  router.get("/commands/catalog", (_req, res) => {
    const catalog = getCommandCatalog();
    const totalCommands = catalog.categories.reduce((acc, category) => acc + category.commands.length, 0);
    res.json({
      ...catalog,
      totalCommands,
    });
  });

  router.post("/sessions", async (req: AuthRequest, res) => {
    try {
      // Try to authenticate, but don't fail if token is missing
      const authHeader = req.headers.authorization;
      let userId: string | undefined;

      if (authHeader?.startsWith("Bearer ")) {
        try {
          const token = authHeader.substring(7);
          const { verifyToken } = await import("../middleware/authenticate");
          const payload = verifyToken(token);
          userId = payload.userId;
        } catch (error) {
          // Token invalid or expired, continue without userId
        }
      }

      // If no userId from token, get from request body (fallback for compatibility)
      if (!userId) {
        const { userId: bodyUserId } = req.body as { userId?: string };
        userId = bodyUserId;
      }

      if (!userId) {
        return res.status(400).json({ error: "userId requerido" });
      }

      const session = await sessionService.createSession(userId);
      const { dbId, ...publicSession } = session;
      res.status(201).json({ session: publicSession });
    } catch (error) {
      console.error("Error creando sesion:", error);
      res.status(500).json({ error: "No se pudo crear la sesion" });
    }
  });

  router.get("/sessions/:sessionId/history", async (req, res) => {
    try {
      const history = await sessionService.listHistory(req.params.sessionId);
      res.json({ history });
    } catch (error) {
      res.status(500).json({ error: "No se pudo obtener el historial" });
    }
  });

  router.post("/commands", async (req: AuthRequest, res) => {
    const { sessionId, input, userId: bodyUserId } = req.body as {
      sessionId?: string;
      input?: string;
      userId?: string;
    };

    // Try to get userId from JWT token first
    const authHeader = req.headers.authorization;
    let userId: string | undefined;

    if (authHeader?.startsWith("Bearer ")) {
      try {
        const token = authHeader.substring(7);
        const { verifyToken } = await import("../middleware/authenticate");
        const payload = verifyToken(token);
        userId = payload.userId;
      } catch (error) {
        // Token invalid or expired, continue without userId
      }
    }

    // If no userId from token, get from request body (fallback for compatibility)
    if (!userId) {
      userId = bodyUserId;
    }

    if (!userId || !input) {
      return res.status(400).json({ error: "userId e input son requeridos" });
    }

    try {
      const execution = await commandService.execute({
        userId,
        input,
        ...(sessionId ? { sessionId } : {}),
      });
      socketGateway.emitCommandExecution(execution);
      res.status(201).json({ execution });
    } catch (error) {
      if (error instanceof CommandError) {
        return res.status(400).json({ error: error.message, code: error.code });
      }
      console.error("Error ejecutando comando:", error);
      return res.status(500).json({ error: "Error inesperado" });
    }
  });

  return router;
};
