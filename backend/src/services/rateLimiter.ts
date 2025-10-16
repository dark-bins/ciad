/**
 * Sistema de Rate Limiting y Anti-Spam
 *
 * Controla la frecuencia de comandos por usuario para evitar:
 * - Abuso del sistema
 * - Sobrecarga del proveedor de Telegram
 * - Costos excesivos
 */

import { logger } from "../core/logger";

export class RateLimitError extends Error {
  constructor(
    message: string,
    public readonly retryAfter: number // segundos
  ) {
    super(message);
    this.name = "RateLimitError";
  }
}

interface UserLimitData {
  /** Timestamp del último comando ejecutado */
  lastCommand: number;
  /** Cantidad de comandos ejecutados en la ventana actual */
  commandCount: number;
  /** Timestamp del inicio de la ventana actual */
  windowStart: number;
}

export interface RateLimiterConfig {
  /** Cooldown mínimo entre comandos (segundos) */
  commandCooldown: number;
  /** Máximo de comandos por ventana de tiempo */
  maxCommandsPerWindow: number;
  /** Duración de la ventana de tiempo (segundos) */
  windowDuration: number;
  /** Penalización por spam (segundos adicionales de cooldown) */
  spamPenalty: number;
}

const DEFAULT_CONFIG: RateLimiterConfig = {
  commandCooldown: 15, // 15 segundos entre comandos
  maxCommandsPerWindow: 999999, // Sin límite de ventana
  windowDuration: 300, // En 5 minutos (300 segundos)
  spamPenalty: 0, // Sin penalizaciones
};

export class RateLimiter {
  private userLimits: Map<string, UserLimitData> = new Map();
  private spammedUsers: Map<string, number> = new Map(); // userId -> unban timestamp
  private config: RateLimiterConfig;

  constructor(config: Partial<RateLimiterConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    // Limpiar datos antiguos cada 10 minutos
    setInterval(() => this.cleanup(), 10 * 60 * 1000);
  }

  /**
   * Verifica si un usuario puede ejecutar un comando
   * @throws RateLimitError si el usuario está limitado
   */
  async checkLimit(userId: string): Promise<void> {
    const now = Date.now();

    // 1. Verificar si el usuario está en penalización por spam
    const spamUntil = this.spammedUsers.get(userId);
    if (spamUntil && now < spamUntil) {
      const retryAfter = Math.ceil((spamUntil - now) / 1000);
      logger.warn(`Usuario ${userId} en penalización por spam. Retry en ${retryAfter}s`);
      throw new RateLimitError(
        `⚠️ Penalización por spam. Espera ${retryAfter} segundos antes de enviar otro comando.`,
        retryAfter
      );
    }

    // Limpiar penalización si ya expiró
    if (spamUntil) {
      this.spammedUsers.delete(userId);
    }

    // 2. Obtener o crear datos del usuario
    let userData = this.userLimits.get(userId);
    if (!userData) {
      userData = {
        lastCommand: 0,
        commandCount: 0,
        windowStart: now,
      };
      this.userLimits.set(userId, userData);
    }

    // 3. Verificar cooldown mínimo entre comandos
    const timeSinceLastCommand = (now - userData.lastCommand) / 1000;
    if (userData.lastCommand > 0 && timeSinceLastCommand < this.config.commandCooldown) {
      const retryAfter = Math.ceil(this.config.commandCooldown - timeSinceLastCommand);
      logger.debug(`Usuario ${userId} en cooldown. Retry en ${retryAfter}s`);
      throw new RateLimitError(
        `⏱️ Por favor espera ${retryAfter} segundos antes de enviar otro comando.`,
        retryAfter
      );
    }

    // 4. Verificar límite de comandos por ventana
    const windowElapsed = (now - userData.windowStart) / 1000;

    // Si la ventana expiró, reiniciar contador
    if (windowElapsed > this.config.windowDuration) {
      userData.windowStart = now;
      userData.commandCount = 0;
    }

    // Verificar si excede el límite
    if (userData.commandCount >= this.config.maxCommandsPerWindow) {
      const windowRemaining = Math.ceil(this.config.windowDuration - windowElapsed);

      // Aplicar penalización por spam
      this.applySpamPenalty(userId);

      logger.warn(
        `Usuario ${userId} excedió límite (${userData.commandCount}/${this.config.maxCommandsPerWindow}). Penalizado.`
      );

      throw new RateLimitError(
        `🚫 Has excedido el límite de comandos (${this.config.maxCommandsPerWindow} comandos cada ${Math.ceil(this.config.windowDuration / 60)} minutos). Penalización de ${this.config.spamPenalty} segundos aplicada.`,
        this.config.spamPenalty
      );
    }

    // 5. Todo OK, registrar el comando
    userData.lastCommand = now;
    userData.commandCount++;

    logger.debug(
      `Rate limit OK para ${userId}. Comandos: ${userData.commandCount}/${this.config.maxCommandsPerWindow}`
    );
  }

  /**
   * Aplica penalización por spam a un usuario
   */
  private applySpamPenalty(userId: string): void {
    const penaltyUntil = Date.now() + this.config.spamPenalty * 1000;
    this.spammedUsers.set(userId, penaltyUntil);
    logger.info(
      `Penalización aplicada a ${userId} hasta ${new Date(penaltyUntil).toISOString()}`
    );
  }

  /**
   * Limpia datos antiguos de usuarios inactivos
   */
  private cleanup(): void {
    const now = Date.now();
    const maxAge = 3600 * 1000; // 1 hora

    // Limpiar límites de usuarios inactivos
    for (const [userId, data] of this.userLimits.entries()) {
      if (now - data.lastCommand > maxAge) {
        this.userLimits.delete(userId);
      }
    }

    // Limpiar penalizaciones expiradas
    for (const [userId, unbanTime] of this.spammedUsers.entries()) {
      if (now > unbanTime) {
        this.spammedUsers.delete(userId);
      }
    }

    logger.debug(`Rate limiter cleanup: ${this.userLimits.size} usuarios activos`);
  }

  /**
   * Obtiene estadísticas de un usuario
   */
  getUserStats(userId: string): {
    commandCount: number;
    maxCommands: number;
    cooldownSeconds: number;
    isPenalized: boolean;
    penaltyEndsIn?: number;
  } | null {
    const userData = this.userLimits.get(userId);
    const spamUntil = this.spammedUsers.get(userId);
    const now = Date.now();

    if (!userData && !spamUntil) {
      return null;
    }

    const stats: {
      commandCount: number;
      maxCommands: number;
      cooldownSeconds: number;
      isPenalized: boolean;
      penaltyEndsIn?: number;
    } = {
      commandCount: userData?.commandCount ?? 0,
      maxCommands: this.config.maxCommandsPerWindow,
      cooldownSeconds: this.config.commandCooldown,
      isPenalized: spamUntil ? now < spamUntil : false,
    };

    if (spamUntil && now < spamUntil) {
      stats.penaltyEndsIn = Math.ceil((spamUntil - now) / 1000);
    }

    return stats;
  }

  /**
   * Resetea los límites de un usuario (solo para admin)
   */
  resetUser(userId: string): void {
    this.userLimits.delete(userId);
    this.spammedUsers.delete(userId);
    logger.info(`Rate limits reseteados para usuario ${userId}`);
  }

  /**
   * Obtiene estadísticas globales
   */
  getGlobalStats(): {
    activeUsers: number;
    penalizedUsers: number;
    totalCommandsInWindow: number;
  } {
    const now = Date.now();
    let totalCommands = 0;
    let penalizedCount = 0;

    for (const data of this.userLimits.values()) {
      const windowElapsed = (now - data.windowStart) / 1000;
      if (windowElapsed < this.config.windowDuration) {
        totalCommands += data.commandCount;
      }
    }

    for (const unbanTime of this.spammedUsers.values()) {
      if (now < unbanTime) {
        penalizedCount++;
      }
    }

    return {
      activeUsers: this.userLimits.size,
      penalizedUsers: penalizedCount,
      totalCommandsInWindow: totalCommands,
    };
  }
}

/**
 * Instancia global del rate limiter
 */
export const createRateLimiter = (config?: Partial<RateLimiterConfig>): RateLimiter => {
  return new RateLimiter(config);
};
