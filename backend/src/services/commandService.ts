import { ProviderRegistry } from "./providerRegistry";
import { mapCommandToProviderRaw } from "../providers/providerCommandMapper";
import { Session, SessionService } from "./sessionService";
import { CommandExecution, CommandPayload, ProviderResult } from "../types/command";
import { RateLimiter, RateLimitError } from "./rateLimiter";
import { validateCommandArgs } from "../config/commandMappings";
import { persistCommandExecution } from "../models/ChatHistory";
import { findUserById } from "../models/User";

export class CommandError extends Error {
  constructor(message: string, public readonly code: string = "COMMAND_ERROR") {
    super(message);
  }
}

export interface ExecuteCommandOptions {
  sessionId?: string;
  userId: string;
  input: string;
}

export class CommandService {
  constructor(
    private readonly registry: ProviderRegistry,
    private readonly sessions: SessionService,
    private readonly rateLimiter: RateLimiter,
  ) {}

  parseInput(raw: string): CommandPayload {
    const trimmed = raw.trim();

    if (!trimmed.startsWith("/")) {
      throw new CommandError("Los comandos deben iniciar con '/'.", "INVALID_FORMAT");
    }

    if (trimmed.length > 500) {
      throw new CommandError("El comando es demasiado largo (maximo 500 caracteres).", "COMMAND_TOO_LONG");
    }

    const parts = trimmed.split(/\s+/);
    const [rawCommand, ...args] = parts;

    if (!rawCommand || rawCommand.length <= 1) {
      throw new CommandError("Comando vacio.", "EMPTY_COMMAND");
    }

    const command = rawCommand.toLowerCase();
    const validation = validateCommandArgs(command, args);
    if (!validation.valid) {
      throw new CommandError(validation.error ?? "Argumentos invalidos", "INVALID_ARGUMENTS");
    }

    return { raw: trimmed, command, args };
  }

  async execute(options: ExecuteCommandOptions): Promise<CommandExecution> {
    // Validar plan del usuario
    const user = await findUserById(options.userId);
    if (!user) {
      throw new CommandError("Usuario no encontrado", "USER_NOT_FOUND");
    }

    const allowedPlans = ["PREMIUM", "GOLD", "PLATINUM", "ADMIN"];
    if (!allowedPlans.includes(user.plan)) {
      throw new CommandError(
        `Tu plan ${user.plan} no tiene acceso a consultas. Actualiza a PREMIUM, GOLD, PLATINUM o ADMIN para consultar.`,
        "PLAN_NOT_ALLOWED"
      );
    }

    try {
      await this.rateLimiter.checkLimit(options.userId);
    } catch (error) {
      if (error instanceof RateLimitError) {
        throw new CommandError(error.message, "RATE_LIMIT_EXCEEDED");
      }
      throw error;
    }

    const payload = this.parseInput(options.input);

    const provider = this.registry.resolve(payload.command);
    if (!provider) {
      throw new CommandError(`No hay proveedor registrado para ${payload.command}`, "UNSUPPORTED_COMMAND");
    }

    const session: Session =
      options.sessionId && options.sessionId.length > 0
        ? await this.sessions.ensureSession(options.sessionId, options.userId)
        : await this.sessions.createSession(options.userId);

    if (!session) {
      throw new CommandError("No se pudo determinar la sesion activa.", "SESSION_ERROR");
    }

    const startedAt = new Date().toISOString();
    const providerRaw = await mapCommandToProviderRaw(payload.raw);
    const providerPayload: CommandPayload = { ...payload, raw: providerRaw };
    const result: ProviderResult = await provider.execute(providerPayload, {
      sessionId: session.id,
      userId: options.userId,
    });
    const completedAt = new Date().toISOString();

    const executionId = await persistCommandExecution({
      dbSessionId: session.dbId,
      userId: options.userId,
      payload,
      result,
      startedAt,
      completedAt,
    });

    const execution: CommandExecution = {
      id: executionId,
      sessionId: session.id,
      userId: options.userId,
      payload,
      result,
      startedAt,
      completedAt,
    };

    this.sessions.appendHistory(session.id, execution);
    return execution;
  }

  getUserRateStats(userId: string) {
    return this.rateLimiter.getUserStats(userId);
  }

  resetUserRateLimit(userId: string) {
    this.rateLimiter.resetUser(userId);
  }
}

export const createCommandService = (registry: ProviderRegistry, sessions: SessionService, rateLimiter: RateLimiter) =>
  new CommandService(registry, sessions, rateLimiter);
