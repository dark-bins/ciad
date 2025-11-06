import { randomUUID, createHash } from "crypto";
import { BotProvider } from "./baseProvider";
import {
  CommandPayload,
  ProviderContext,
  ProviderResult,
  ChatMessage,
  Attachment,
} from "../types/command";
import { logger } from "../core/logger";
import { DirectTelegramClient, TelegramMessage } from "./telegramClient";
import { processProviderText } from "../utils/textFilters";

const DEFAULT_IMAGE_MIME = "image/jpeg";
const DEFAULT_DOCUMENT_MIME = "application/pdf";

const bufferToDataUrl = (media: Buffer, mimeType: string) => {
  const base64 = media.toString("base64");
  const dataUrl = `data:${mimeType};base64,${base64}`;
  logger.info(`📦 Buffer convertido a dataURL - Buffer: ${media.length} bytes, Base64: ${base64.length} chars, DataURL: ${dataUrl.length} chars`);
  return dataUrl;
};

const detectMimeFromBuffer = (buffer: Buffer): { mime: string; type: Attachment["type"] } | null => {
  const hex = buffer.subarray(0, 12).toString("hex").toLowerCase();
  if (hex.startsWith("ffd8ff")) {
    return { mime: "image/jpeg", type: "image" };
  }
  if (hex.startsWith("89504e470d0a1a0a")) {
    return { mime: "image/png", type: "image" };
  }
  if (hex.startsWith("47494638")) {
    return { mime: "image/gif", type: "image" };
  }
  if (hex.startsWith("25504446")) {
    return { mime: "application/pdf", type: "document" };
  }

  // Detectar archivos de texto (por contenido ASCII)
  try {
    const text = buffer.toString('utf-8', 0, Math.min(512, buffer.length));
    // Si más del 95% son caracteres imprimibles ASCII/UTF-8, es probablemente texto
    const printable = text.split('').filter(c => {
      const code = c.charCodeAt(0);
      return (code >= 32 && code <= 126) || code === 10 || code === 13 || code === 9 || code > 127;
    }).length;
    if (printable / text.length > 0.95) {
      return { mime: "text/plain", type: "document" };
    }
  } catch {}

  return null;
};

const mapMediaType = (
  mediaType: string | null,
  buffer?: Buffer,
): { type: Attachment["type"]; mime: string } | null => {
  // PRIORIDAD 1: Usar mediaType de Telegram (más confiable)
  if (mediaType) {
    // Imágenes
    if (mediaType.includes("photo") || mediaType.includes("image")) {
      return { type: "image", mime: mediaType.includes("png") ? "image/png" : DEFAULT_IMAGE_MIME };
    }
    // PDFs específicamente
    if (mediaType.includes("pdf")) {
      return { type: "document", mime: "application/pdf" };
    }
    // Archivos de texto
    if (mediaType.includes("text/plain") || mediaType.includes("text/")) {
      return { type: "document", mime: "text/plain" };
    }
    // Videos
    if (mediaType.includes("video")) {
      return { type: "video", mime: "video/mp4" };
    }
    // Audio
    if (mediaType.includes("audio")) {
      return { type: "audio", mime: "audio/mpeg" };
    }
    // Documentos genéricos (application/*)
    if (mediaType.includes("application/")) {
      return { type: "document", mime: mediaType };
    }
  }

  // PRIORIDAD 2: Detectar por contenido del buffer (fallback)
  if (buffer) {
    const detected = detectMimeFromBuffer(buffer);
    if (detected) return detected;
  }

  // PRIORIDAD 3: Default para "document" genérico
  if (mediaType && mediaType.includes("document")) {
    return { type: "document", mime: DEFAULT_DOCUMENT_MIME };
  }

  return null;
};

/**
 * Proveedor de Telegram que se conecta directamente al bot proveedor SHKAINFORMATIONASXBOT
 * Usa Telethon (vía telegram library de Node.js) para comunicación directa
 */
class DirectTelegramProvider implements BotProvider {
  readonly descriptor = {
    name: "telegram-provider-direct",
    priority: 10,
    supportedCommands: "*",
  } as const;

  constructor(private readonly client: DirectTelegramClient) {}

  supports(): boolean {
    return this.client.isConnected();
  }

  private cleanText(raw: string | null): string | null {
    // Usar el sistema avanzado de filtros
    return processProviderText(raw, {
      checkStatus: true,
      removeDuplicateLines: true,
      truncate: 4000, // Límite de 4000 caracteres
    });
  }

  private mapResponses(responses: TelegramMessage[], command: string): ChatMessage[] {
    logger.info(`🔍 DirectTelegramProvider.mapResponses: Procesando ${responses.length} respuestas para ${command}`);
    const messages: ChatMessage[] = [];
    const seenKeys = new Set<string>();

    responses.forEach((response, index) => {
      logger.info(`🔍 Respuesta #${index + 1}: texto="${response.text?.slice(0, 100)}", hasMedia=${Boolean(response.media)}`);
      const timestamp = new Date().toISOString();
      const cleanedText = this.cleanText(response.text);
      logger.info(`🧹 Después de cleanText: "${cleanedText?.slice(0, 100)}"`);

      if (response.media) {
        if (Buffer.isBuffer(response.media)) {
          const mapping = mapMediaType(response.mediaType, response.media);
          const type = mapping?.type ?? "image";
          const mime = mapping?.mime ?? DEFAULT_IMAGE_MIME;

          logger.info(`📎 Archivo detectado - mediaType original: "${response.mediaType}", MIME detectado: "${mime}", tipo: "${type}"`);

          const hash = createHash("sha1").update(response.media).digest("hex");
          const dedupeKey = `${type}::${hash}::${cleanedText ?? ""}`;

          if (seenKeys.has(dedupeKey)) {
            return;
          }
          seenKeys.add(dedupeKey);

          // Filtrar imágenes promocionales de DELUXEDATA (imagen roja con capucha)
          // Estas imágenes suelen venir sin texto útil o con texto muy corto
          if (type === "image" && (!cleanedText || cleanedText.length < 20)) {
            logger.info(`⏭️ Saltando imagen promocional sin contenido útil (texto: "${cleanedText}")`);
            return;
          }

          const attachment: Attachment = {
            id: randomUUID(),
            type,
            url: bufferToDataUrl(response.media, mime),
            mimeType: mime,
          };

          if (type === "document") {
            // Determinar extensión correcta según MIME type
            let extension = "bin";
            if (mime === "application/pdf") {
              extension = "pdf";
            } else if (mime === "text/plain") {
              extension = "txt";
            } else if (mime.startsWith("application/")) {
              extension = mime.split("/")[1] || "bin";
            }

            attachment.filename = response.filename || `documento_${Date.now()}.${extension}`;
            logger.info(`📄 Documento: ${attachment.filename} (${mime})`);
          }

          messages.push({
            id: randomUUID(),
            author: "provider",
            attachments: [attachment],
            body: cleanedText ?? undefined,
            timestamp,
          });
          return;
        }
      }

      if (cleanedText) {
        const textKey = `text::${cleanedText}`;
        if (seenKeys.has(textKey)) {
          return;
        }
        seenKeys.add(textKey);

        messages.push({
          id: randomUUID(),
          author: "provider",
          body: cleanedText,
          timestamp,
        });
      }
    });

    logger.info(`📊 Total mensajes creados: ${messages.length} de ${responses.length} respuestas`);

    if (messages.length === 0) {
      logger.warn(`⚠️ TODAS las respuestas fueron filtradas por cleanText. Enviando mensaje de error.`);
      messages.push({
        id: randomUUID(),
        author: "provider",
        body: `No se recibió respuesta del proveedor para ${command}.`,
        timestamp: new Date().toISOString(),
      });
    }

    return messages;
  }

  async execute(payload: CommandPayload, context: ProviderContext): Promise<ProviderResult> {
    logger.info(`🔄 Ejecutando comando via Telegram directo: ${payload.command}`);

    // Get the correct Telegram bot for this command
    const { getTelegramBotForCommand } = await import("../config/commandCatalog");
    const targetBot = getTelegramBotForCommand(payload.command);

    if (targetBot) {
      logger.info(`📱 Enviando comando ${payload.command} a bot @${targetBot}`);
    }

    const responses: TelegramMessage[] = await this.client.sendCommand(payload.raw, context.userId, targetBot);
    logger.debug("Respuestas crudas del proveedor", {
      total: responses.length,
      items: responses.map((response) => ({
        hasMedia: Boolean(response.media),
        mediaType: response.mediaType,
        filename: response.filename,
        textLength: response.text?.length ?? 0,
      })),
    });
    const messages = this.mapResponses(responses, payload.command);

    return { messages };
  }
}

/**
 * Crea y conecta el proveedor de Telegram directo
 */
export const createDirectTelegramProvider = async (): Promise<BotProvider> => {
  logger.info("🚀 Inicializando proveedor de Telegram directo...");

  // Leer configuración desde variables de entorno
  const apiId = parseInt(process.env.TELEGRAM_API_ID || "0");
  const apiHash = process.env.TELEGRAM_API_HASH || "";
  const phoneNumber = process.env.TELEGRAM_PHONE || "";
  const sessionString = process.env.TELEGRAM_SESSION_STRING || "";
  const providerBotUsername = process.env.TELEGRAM_PROVIDER_BOT || "SHKAINFORMATIONASXBOT";

  if (!apiId || !apiHash || !phoneNumber) {
    throw new Error(
      "Faltan variables de entorno para Telegram: TELEGRAM_API_ID, TELEGRAM_API_HASH, TELEGRAM_PHONE"
    );
  }

  const client = new DirectTelegramClient({
    apiId,
    apiHash,
    phoneNumber,
    sessionString,
    providerBotUsername,
  });

  const connected = await client.connect();
  if (!connected) {
    throw new Error("No fue posible conectar con Telegram");
  }

  logger.info("✅ Proveedor de Telegram directo inicializado correctamente");
  return new DirectTelegramProvider(client);
};


