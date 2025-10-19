import fs from "fs";
import path from "path";
import { pathToFileURL } from "url";
import { createRequire } from "module";
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

interface TelegramResponse {
  text: string | null;
  media: Buffer | string | null;
  mediaType: string | null;
}

const DEFAULT_IMAGE_MIME = "image/jpeg";
const DEFAULT_DOCUMENT_MIME = "application/pdf";

const bufferToDataUrl = (media: Buffer, mimeType: string) => {
  const base64 = media.toString("base64");
  return `data:${mimeType};base64,${base64}`;
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
  return null;
};

const mapMediaType = (
  mediaType: string | null,
  buffer?: Buffer,
): { type: Attachment["type"]; mime: string } | null => {
  if (buffer) {
    const detected = detectMimeFromBuffer(buffer);
    if (detected) return detected;
  }
  if (!mediaType) return null;
  if (mediaType.includes("photo") || mediaType.includes("image")) {
    return { type: "image", mime: DEFAULT_IMAGE_MIME };
  }
  if (mediaType.includes("document") || mediaType.includes("pdf")) {
    return { type: "document", mime: DEFAULT_DOCUMENT_MIME };
  }
  if (mediaType.includes("video")) {
    return { type: "video", mime: "video/mp4" };
  }
  if (mediaType.includes("audio")) {
    return { type: "audio", mime: "audio/mpeg" };
  }
  return { type: "document", mime: DEFAULT_DOCUMENT_MIME };
};

class TelegramCommandProvider implements BotProvider {
  readonly descriptor = {
    name: "telegram-provider",
    priority: 10,
    supportedCommands: "*",
  } as const;

  constructor(private readonly client: any) {}

  supports(): boolean {
    return true;
  }

  private cleanText(raw: string | null): string | null {
    if (!raw) return null;
    const filtersToRemove: RegExp[] = [
      /\[#ShizukaCloud.*?\]/gi,
      /\[#.*?\]/gi,
      /ShizukaCloud/gi,
      /\[BOT.*?\]/gi,
      /\[SHIZUKA.*?\]/gi,
      /Yenes?/gi,
      /\u{1F380}/gu,
      /\u267E\uFE0F?/g,
      /UBICGEOS/gi,
      /-{3,}/g,
      /_{3,}/g,
      /\*{3,}/g,
    ];

    let cleaned = raw;
    for (const filter of filtersToRemove) {
      cleaned = cleaned.replace(filter, "");
    }

    cleaned = cleaned.replace(/\*\*(.*?)\*\*/g, "$1");
    cleaned = cleaned.replace(/^\*([^*\n]+)\*$/gm, "$1");
    cleaned = cleaned.replace(/\*([A-Z\s]+):\*/g, "$1:");
    cleaned = cleaned.replace(/\n{3,}/g, "\n\n");
    cleaned = cleaned.replace(/ {2,}/g, " ");
    cleaned = cleaned.trim();

    return cleaned.length > 0 ? cleaned : null;
  }

  private mapResponses(responses: TelegramResponse[], command: string): ChatMessage[] {
    const messages: ChatMessage[] = [];

    const seenKeys = new Set<string>();

    responses.forEach((response) => {
      const timestamp = new Date().toISOString();
      const cleanedText = this.cleanText(response.text);

      if (response.media) {
        if (Buffer.isBuffer(response.media)) {
          const mapping = mapMediaType(response.mediaType, response.media);
          const type = mapping?.type ?? "image";
          const mime = mapping?.mime ?? DEFAULT_IMAGE_MIME;
          const hash = createHash("sha1").update(response.media).digest("hex");
          const dedupeKey = `${type}::${hash}::${cleanedText ?? ""}`;
          if (seenKeys.has(dedupeKey)) {
            return;
          }
          seenKeys.add(dedupeKey);

          // Skip "loading" or "processing" images without relevant text
          if (type === "image" && (!cleanedText || cleanedText.length < 10)) {
            logger.debug("Skipping loading/processing image without text");
            return;
          }

          const attachment: Attachment = {
            id: randomUUID(),
            type,
            url: bufferToDataUrl(response.media, mime),
            mimeType: mime,
          };
          if (type === "document") {
            attachment.filename = `adjunto_${Date.now()}.pdf`;
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

        if (typeof response.media === "string") {
          const mapping = mapMediaType(response.mediaType);
          const dedupeKey = `${mapping?.type ?? "document"}::${response.media}::${cleanedText ?? ""}`;
          if (seenKeys.has(dedupeKey)) {
            return;
          }
          seenKeys.add(dedupeKey);
          messages.push({
            id: randomUUID(),
            author: "provider",
            attachments: [
              {
                id: randomUUID(),
                type: mapping?.type ?? "document",
                url: response.media,
                mimeType: mapping?.mime ?? DEFAULT_DOCUMENT_MIME,
                filename: mapping?.type === "document" ? `adjunto_${Date.now()}.pdf` : undefined,
              },
            ],
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

    if (messages.length === 0) {
      messages.push({
        id: randomUUID(),
        author: "provider",
        body: `No se recibio respuesta del proveedor para ${command}.`,
        timestamp: new Date().toISOString(),
      });
    }

    return messages;
  }

  async execute(payload: CommandPayload, context: ProviderContext): Promise<ProviderResult> {
    const responses: TelegramResponse[] = await this.client.sendCommand(payload.raw, context.userId);
    const messages = this.mapResponses(responses, payload.command);
    return { messages };
  }
}

const resolveTelegramClientPath = (): string => {
  const candidatePaths = [
    path.resolve(__dirname, "../../../../../whatsapp_bot/src/telegram/telegramClient.js"),
    path.resolve(__dirname, "../../../../whatsapp_bot/src/telegram/telegramClient.js"),
    path.resolve(__dirname, "../../../whatsapp_bot/src/telegram/telegramClient.js"),
    path.resolve(process.cwd(), "../../whatsapp_bot/src/telegram/telegramClient.js"),
    path.resolve(process.cwd(), "../whatsapp_bot/src/telegram/telegramClient.js"),
  ];

  for (const candidate of candidatePaths) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  throw new Error(
    `No se encontro el modulo telegramClient.js. Revisar ubicacion del proyecto. Buscado en:\n${candidatePaths.join(
      "\n",
    )}`,
  );
};

export const createTelegramProvider = async (): Promise<BotProvider> => {
  const modulePath = resolveTelegramClientPath();
  logger.debug("Cargando TelegramClient desde", { modulePath });

  let TelegramClient;
  try {
    const importModule = await import(pathToFileURL(modulePath).href);
    TelegramClient = importModule.default ?? importModule.TelegramClient ?? Object.values(importModule)[0];
  } catch (error) {
    logger.warn("Fallo import dinamico, probando con require", { error });
    const requireModule = createRequire(__filename);
    const telegramModule = requireModule(modulePath);
    TelegramClient = telegramModule.default ?? telegramModule.TelegramClient ?? telegramModule;
  }

  if (!TelegramClient) {
    throw new Error("No se pudo cargar TelegramClient desde whatsapp_bot");
  }

  const client = new TelegramClient();
  const connected = await client.connect();
  if (!connected) {
    throw new Error("No fue posible conectar con Telegram");
  }
  logger.info("Proveedor de Telegram inicializado correctamente");
  return new TelegramCommandProvider(client);
};
