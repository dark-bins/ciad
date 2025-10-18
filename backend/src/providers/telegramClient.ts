import fs from "fs";
import path from "path";
import input from "input";
import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions";
import { NewMessage, NewMessageEvent } from "telegram/events";
import { Api } from "telegram/tl";
import { logger } from "../core/logger";

export interface TelegramMessage {
  text: string | null;
  media: Buffer | null;
  mediaType: string | null;
  filename?: string | null;
}

const STATUS_KEYWORDS = ["consultando", "procesando", "buscando", "espere", "momento", "cargando", "generando"];
const STATUS_EMOJIS = ["⏳", "⚙️", "⌛️", "🤖"];

export class DirectTelegramClient {
  private client: TelegramClient | null = null;
  private readonly apiId: number;
  private readonly apiHash: string;
  private readonly phoneNumber: string;
  private readonly sessionString: string;
  private readonly providerBotUsername: string;
  private readonly responseHandlers = new Map<string, (messages: TelegramMessage[]) => void>();
  private readonly pendingMessages = new Map<string, TelegramMessage[]>();
  private readonly listeningBots = new Set<string>();
  private readonly sentMessageIds = new Map<number, string>(); // Mapea message_id -> sessionId

  constructor(config: {
    apiId: number;
    apiHash: string;
    phoneNumber: string;
    sessionString: string;
    providerBotUsername: string;
  }) {
    this.apiId = config.apiId;
    this.apiHash = config.apiHash;
    this.phoneNumber = config.phoneNumber;
    this.sessionString = config.sessionString;
    this.providerBotUsername = config.providerBotUsername;
  }

  async connect(): Promise<boolean> {
    try {
      logger.info("Conectando cliente Telegram");

      const session = new StringSession(this.sessionString);
      this.client = new TelegramClient(session, this.apiId, this.apiHash, {
        connectionRetries: 5,
      });

      await this.client.start({
        phoneNumber: this.phoneNumber,
        password: async () => input.text("Introduce tu clave 2FA (si aplica): "),
        phoneCode: async () => input.text("Introduce el codigo de verificacion: "),
        onError: (err) => {
          logger.error("Fallo durante autenticacion de Telegram", { error: err });
          throw err;
        },
      });

      this.registerBotListener(this.providerBotUsername);

      logger.info("Cliente Telegram conectado");
      logger.info(`Escuchando mensajes de @${this.providerBotUsername}`);

      return true;
    } catch (error) {
      logger.error("No se pudo conectar al cliente de Telegram", { error });
      return false;
    }
  }

  private registerBotListener(botUsername: string) {
    const normalized = botUsername.toLowerCase();
    if (!this.client || this.listeningBots.has(normalized)) {
      return;
    }

    this.client.addEventHandler(
      (event: NewMessageEvent) => this.handleProviderMessage(event),
      new NewMessage({ fromUsers: [botUsername] }),
    );
    this.listeningBots.add(normalized);
    logger.info(`Listener registrado para @${botUsername}`);
  }

  private async handleProviderMessage(event: NewMessageEvent) {
    try {
      const message = event.message;
      const rawMessage = (message.message as string | undefined) ?? (message.text as string | undefined) ?? null;
      const caption = (message as { caption?: string }).caption ?? null;
      const text = rawMessage ?? caption ?? null;

      logger.info(`📩 Mensaje recibido del bot - Tiene media: ${Boolean(message.media)}, Texto: ${text?.slice(0, 50)}...`);

      if (text) {
        const normalized = text.toLowerCase();
        const isStatusKeyword = STATUS_KEYWORDS.some((keyword) => normalized.includes(keyword));
        const isStatusEmoji = STATUS_EMOJIS.some((emoji) => text.includes(emoji));
        if (isStatusKeyword || isStatusEmoji) {
          logger.debug(`Mensaje de estado ignorado: ${text.slice(0, 50)}...`);
          return;
        }
      }

      const telegramMessage: TelegramMessage = {
        text,
        media: null,
        mediaType: null,
        filename: (message as { document?: { fileName?: string } }).document?.fileName ?? null,
      };

      if (message.media && this.client) {
        try {
          const downloadDir = path.join(process.cwd(), "downloads");
          if (!fs.existsSync(downloadDir)) {
            fs.mkdirSync(downloadDir, { recursive: true });
          }

          logger.info(`📥 Iniciando descarga de media...`);
          const buffer = await this.client.downloadMedia(message);
          if (buffer && Buffer.isBuffer(buffer)) {
            telegramMessage.media = buffer;
            telegramMessage.mediaType = this.detectMediaType(message);
            if (!telegramMessage.filename && telegramMessage.mediaType === "application/pdf") {
              telegramMessage.filename = `document_${Date.now()}.pdf`;
            }
            logger.info(`✅ Media descargada (${telegramMessage.mediaType ?? "desconocido"}) - ${buffer.length} bytes - filename: ${telegramMessage.filename}`);
          }
        } catch (error) {
          logger.error("Error descargando media de Telegram", { error });
        }
      }

      // NUEVA LÓGICA: Buscar sesión por reply_to_msg_id
      let targetSessionId: string | undefined;

      // Intentar obtener el ID del mensaje al que responde
      const replyToMsgId = (message as any).replyTo?.replyToMsgId;
      if (replyToMsgId) {
        targetSessionId = this.sentMessageIds.get(replyToMsgId);
        if (targetSessionId) {
          logger.info(`🎯 Mensaje vinculado a sesión ${targetSessionId.slice(0, 8)}... via reply_to ${replyToMsgId}`);
        }
      }

      // Fallback: Si no hay reply_to, buscar la sesión más reciente (solo si hay una)
      if (!targetSessionId) {
        const activeSessions = Array.from(this.responseHandlers.keys());
        if (activeSessions.length === 1 && activeSessions[0]) {
          targetSessionId = activeSessions[0];
          logger.info(`⚠️ Sin reply_to - Usando única sesión activa: ${targetSessionId.slice(0, 8)}...`);
        } else if (activeSessions.length > 1) {
          logger.warn(`⚠️ ${activeSessions.length} sesiones activas pero sin reply_to - mensaje descartado para evitar confusión`);
          return;
        }
      }

      if (targetSessionId) {
        if (!this.pendingMessages.has(targetSessionId)) {
          this.pendingMessages.set(targetSessionId, []);
        }
        this.pendingMessages.get(targetSessionId)!.push(telegramMessage);
        logger.info(`✅ Mensaje agregado a sesión ${targetSessionId.slice(0, 8)}... (total: ${this.pendingMessages.get(targetSessionId)!.length})`);
      } else {
        logger.warn(`⚠️ No se encontró sesión válida para el mensaje`);
      }
    } catch (error) {
      logger.error("Error procesando mensaje del proveedor de Telegram", { error });
    }
  }

  private detectMediaType(message: NewMessageEvent["message"]): string | null {
    if (message.photo) {
      return "photo";
    }
    if (message.document) {
      const doc = message.document as Api.Document;
      if (doc.mimeType?.includes("pdf")) {
        return "document";
      }
      if (doc.mimeType?.includes("image")) {
        return "photo";
      }
      if (doc.mimeType?.includes("video")) {
        return "video";
      }
      if (doc.mimeType?.includes("audio")) {
        return "audio";
      }
      return doc.mimeType ?? "document";
    }
    return null;
  }

  async sendCommand(command: string, userId: string, targetBot?: string): Promise<TelegramMessage[]> {
    if (!this.client || !this.client.connected) {
      throw new Error("Cliente de Telegram desconectado");
    }

    const botUsername = targetBot || this.providerBotUsername;
    this.registerBotListener(botUsername);

    const sessionId = `${userId}_${Date.now()}`;
    logger.info(`Enviando comando al bot @${botUsername}: ${command} (sesion ${sessionId.slice(0, 10)}...)`);

    return new Promise((resolve, reject) => {
      this.responseHandlers.set(sessionId, (messages) => resolve(messages));
      this.pendingMessages.set(sessionId, []);

      this.client!
        .sendMessage(botUsername, { message: command })
        .then((sentMessage) => {
          // Guardar el message_id para poder vincular respuestas
          const messageId = (sentMessage as any).id;
          if (messageId) {
            this.sentMessageIds.set(messageId, sessionId);
            logger.info(`📤 Mensaje enviado con ID ${messageId} vinculado a sesión ${sessionId.slice(0, 8)}...`);
          }
          this.awaitResponses(sessionId, command, resolve);
        })
        .catch((error) => {
          logger.error(`Error enviando comando a @${botUsername}`, { error });
          this.responseHandlers.delete(sessionId);
          this.pendingMessages.delete(sessionId);
          reject(error);
        });
    });
  }

  private cleanupSession(sessionId: string): void {
    this.responseHandlers.delete(sessionId);
    this.pendingMessages.delete(sessionId);

    // Limpiar message_ids asociados a esta sesión
    const keysToDelete: number[] = [];
    for (const [msgId, sessId] of this.sentMessageIds.entries()) {
      if (sessId === sessionId) {
        keysToDelete.push(msgId);
      }
    }
    keysToDelete.forEach(msgId => this.sentMessageIds.delete(msgId));

    if (keysToDelete.length > 0) {
      logger.debug(`🧹 Limpieza: ${keysToDelete.length} message_ids eliminados de sesión ${sessionId.slice(0, 8)}...`);
    }
  }

  private awaitResponses(
    sessionId: string,
    command: string,
    resolve: (messages: TelegramMessage[]) => void,
  ): void {
    logger.info(`Comando enviado a Telegram: ${command}`);

    const timeoutMs = 60_000; // Aumentado a 60 segundos
    const intervalMs = 500;
    const timeout = setTimeout(() => {
      const messages = this.pendingMessages.get(sessionId) ?? [];
      this.cleanupSession(sessionId);

      if (messages.length === 0) {
        logger.warn(`⏱️ Timeout (60s) - Sin respuesta del proveedor para ${command}`);
        resolve([{ text: "No se recibio respuesta del proveedor. Por favor intenta nuevamente.", media: null, mediaType: null }]);
      } else {
        logger.info(`✅ Timeout alcanzado pero se recibieron ${messages.length} respuestas para ${command}`);
        resolve(messages);
      }
    }, timeoutMs);

    let lastCount = 0;
    let stableChecks = 0;
    const maxStableChecks = 12; // 6 segundos de estabilidad

    const interval = setInterval(() => {
      const messages = this.pendingMessages.get(sessionId) ?? [];
      if (messages.length > 0 && messages.length === lastCount) {
        stableChecks += 1;
        if (stableChecks >= maxStableChecks) {
          clearTimeout(timeout);
          clearInterval(interval);
          this.cleanupSession(sessionId);
          logger.info(`✅ Respuestas completas y estables (${messages.length}) para ${command}`);
          resolve(messages);
        }
      } else {
        lastCount = messages.length;
        stableChecks = 0;
      }
    }, intervalMs);
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.disconnect();
      logger.info("Cliente Telegram desconectado");
    }
  }

  isConnected(): boolean {
    return this.client?.connected ?? false;
  }
}

