import { Router, Response } from "express";
import { body, validationResult } from "express-validator";
import {
  getAllUsers,
  updateUser,
  deleteUser,
  getUserStats,
  addCredits,
  deductCredits,
} from "../models/User";
import { getAllConfig, updateMultipleConfig } from "../models/SystemConfig";
import { authenticate, requireAdmin, AuthRequest } from "../middleware/authenticate";
import { query } from "../config/database";
import { logger, UsageStats } from "../core/logger";
import fs from "fs";
import path from "path";

const router = Router();

router.use(authenticate);
router.use(requireAdmin);

router.get("/users", async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const users = await getAllUsers();
    const safeUsers = users.map((user) => ({
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      plan: user.plan,
      credits: user.credits,
      is_active: user.is_active,
      created_at: user.created_at,
      last_login: user.last_login,
    }));

    res.json({ users: safeUsers });
  } catch (error) {
    logger.error("Error obteniendo usuarios", { error });
    res.status(500).json({ error: "Error al obtener usuarios" });
  }
});

router.get("/stats", async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userStats = await getUserStats();
    const commandStats = await query<{
      total_commands: number;
      successful_commands: number;
      total_credits_used: number;
    }>(
      `SELECT
         COUNT(*) as total_commands,
         COUNT(CASE WHEN success = true THEN 1 END) as successful_commands,
         COALESCE(SUM(credits_used), 0) as total_credits_used
       FROM command_executions
       WHERE executed_at > NOW() - INTERVAL '24 hours'`,
    );

    const sessionStats = await query<{ active_sessions: number }>(
      `SELECT COUNT(*) as active_sessions
         FROM chat_sessions
        WHERE is_active = true`,
    );

    const commandsSummary =
      commandStats[0] ?? {
        total_commands: 0,
        successful_commands: 0,
        total_credits_used: 0,
      };
    const sessionSummary = sessionStats[0] ?? { active_sessions: 0 };

    res.json({ users: userStats, commands: commandsSummary, sessions: sessionSummary });
  } catch (error) {
    logger.error("Error obteniendo estadisticas", { error });
    res.status(500).json({ error: "Error al obtener estadisticas" });
  }
});

router.put(
  "/users/:userId",
  [
    body("email").optional().isEmail().withMessage("Email invalido"),
    body("role").optional().isIn(["user", "premium", "admin"]).withMessage("Rol invalido"),
    body("plan").optional().isIn(["FREE", "BASIC", "PREMIUM", "GOLD", "PLATINUM", "ADMIN"]).withMessage("Plan invalido"),
    body("credits").optional().isInt({ min: 0 }).withMessage("Creditos invalidos"),
    body("is_active").optional().isBoolean().withMessage("is_active debe ser boolean"),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { userId } = req.params as { userId: string };
      const updatedUser = await updateUser(userId, req.body);

      res.json({
        message: "Usuario actualizado exitosamente",
        user: {
          id: updatedUser.id,
          username: updatedUser.username,
          email: updatedUser.email,
          role: updatedUser.role,
          plan: updatedUser.plan,
          credits: updatedUser.credits,
          is_active: updatedUser.is_active,
        },
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Error desconocido";
      const errorStack = error instanceof Error ? error.stack : undefined;
      logger.error("Error actualizando usuario", {
        error: errorMessage,
        stack: errorStack,
        userId: req.params.userId,
        updateData: req.body
      });
      res.status(500).json({ error: `Error al actualizar usuario: ${errorMessage}` });
    }
  },
);

router.delete("/users/:userId", async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { userId } = req.params as { userId: string };
    const currentUserId = req.userId;
    if (!currentUserId) {
      res.status(401).json({ error: "No autenticado" });
      return;
    }

    if (userId === currentUserId) {
      res.status(400).json({ error: "No puedes eliminar tu propia cuenta" });
      return;
    }

    await deleteUser(userId);
    res.json({ message: "Usuario eliminado exitosamente" });
  } catch (error) {
    logger.error("Error eliminando usuario", { error });
    res.status(500).json({ error: "Error al eliminar usuario" });
  }
});

router.post(
  "/users/:userId/credits",
  [
    body("amount").isInt().withMessage("La cantidad debe ser un numero entero"),
    body("operation").isIn(["add", "deduct"]).withMessage("La operacion debe ser add o deduct"),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { userId } = req.params as { userId: string };
      const { amount, operation } = req.body as { amount: number; operation: "add" | "deduct" };

      const newCredits = operation === "add" ? await addCredits(userId, amount) : await deductCredits(userId, amount);

      res.json({
        message: "Creditos actualizados",
        credits: newCredits,
      });
    } catch (error) {
      logger.error("Error actualizando creditos", { error });
      res.status(500).json({ error: "Error al actualizar creditos" });
    }
  },
);

router.get("/config", async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const config = await getAllConfig();
    res.json({ config });
  } catch (error) {
    logger.error("Error obteniendo configuracion del sistema", { error });
    res.status(500).json({ error: "Error al obtener configuracion" });
  }
});

router.put(
  "/config",
  [body("config").isObject().withMessage("Se requiere un objeto de configuracion")],
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const currentUserId = req.userId;
      if (!currentUserId) {
        res.status(401).json({ error: "No autenticado" });
        return;
      }

      const { config } = req.body as { config: Record<string, string> };
      await updateMultipleConfig(config, currentUserId);

      res.json({ message: "Configuracion actualizada exitosamente" });
    } catch (error) {
      logger.error("Error actualizando configuracion", { error });
      res.status(500).json({ error: "Error al actualizar configuracion" });
    }
  },
);

router.get("/commands/recent", async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const limit = Number.parseInt(String(req.query.limit ?? "50"), 10) || 50;

    const commands = await query<{
      id: string;
      command: string;
      arguments: string | null;
      success: boolean;
      error_message: string | null;
      credits_used: number | null;
      executed_at: Date;
      username: string;
      role: string;
    }>(
      `SELECT
         ce.id,
         ce.command,
         ce.arguments,
         ce.success,
         ce.error_message,
         ce.credits_used,
         ce.executed_at,
         u.username,
         u.role
       FROM command_executions ce
       JOIN users u ON ce.user_id = u.id
       ORDER BY ce.executed_at DESC
       LIMIT $1`,
      [limit],
    );

    res.json({ commands });
  } catch (error) {
    logger.error("Error obteniendo comandos recientes", { error });
    res.status(500).json({ error: "Error al obtener comandos" });
  }
});

// Endpoint de métricas en tiempo real
router.get("/metrics", async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const usageStats = UsageStats.getInstance();
    const realtimeStats = usageStats.getStats();

    // Obtener logs recientes de errores
    const logsDir = path.join(process.cwd(), 'logs');
    let recentErrors: any[] = [];

    try {
      const errorFiles = fs.readdirSync(logsDir)
        .filter(file => file.startsWith('error-'))
        .sort()
        .reverse();

      if (errorFiles.length > 0 && errorFiles[0]) {
        const latestErrorFile = path.join(logsDir, errorFiles[0]);
        const content = fs.readFileSync(latestErrorFile, 'utf-8');
        const lines = content.trim().split('\n').slice(-10); // Últimos 10 errores

        recentErrors = lines.map(line => {
          try {
            return JSON.parse(line);
          } catch {
            return null;
          }
        }).filter(Boolean);
      }
    } catch (error) {
      logger.warn('No se pudieron leer los logs de errores', { error });
    }

    res.json({
      realtime: realtimeStats,
      recentErrors,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("Error obteniendo métricas", { error });
    res.status(500).json({ error: "Error al obtener métricas" });
  }
});

// Endpoint para obtener logs de aplicación
router.get("/logs/:type", async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { type } = req.params;
    const { lines = 100 } = req.query;

    const logsDir = path.join(process.cwd(), 'logs');
    const validTypes = ['application', 'error', 'metrics'];

    if (!type || !validTypes.includes(type)) {
      res.status(400).json({ error: 'Tipo de log inválido' });
      return;
    }

    const files = fs.readdirSync(logsDir)
      .filter(file => file.startsWith(`${type}-`))
      .sort()
      .reverse();

    if (files.length === 0 || !files[0]) {
      res.json({ logs: [], message: 'No hay logs disponibles' });
      return;
    }

    const latestFile = path.join(logsDir, files[0]);
    const content = fs.readFileSync(latestFile, 'utf-8');
    const allLines = content.trim().split('\n');
    const requestedLines = parseInt(lines as string, 10) || 100;
    const logLines = allLines.slice(-requestedLines);

    const logs = logLines.map(line => {
      try {
        return JSON.parse(line);
      } catch {
        return { raw: line };
      }
    });

    res.json({
      logs,
      totalLines: allLines.length,
      returnedLines: logs.length,
      file: files[0],
    });
  } catch (error) {
    logger.error("Error leyendo logs", { error });
    res.status(500).json({ error: "Error al leer logs" });
  }
});

export default router;
