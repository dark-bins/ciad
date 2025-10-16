import { randomUUID } from "crypto";
import { BotProvider } from "./baseProvider";
import { CommandPayload, ProviderContext, ProviderResult } from "../types/command";

export class MockProvider implements BotProvider {
  readonly descriptor = {
    name: "mock",
    priority: 100,
    supportedCommands: "*",
  } as const;

  supports(): boolean {
    return true;
  }

  async execute(payload: CommandPayload, context: ProviderContext): Promise<ProviderResult> {
    const now = new Date().toISOString();

    return {
      messages: [
        {
          id: randomUUID(),
          author: "provider",
          body: `Comando "${payload.command}" ejecutado con argumentos: ${payload.args.join(" ") || "(sin argumentos)"}.`,
          timestamp: now,
        },
        {
          id: randomUUID(),
          author: "provider",
          body: "Este es un proveedor de ejemplo. Reemplaza MockProvider por la integracion real con tu bot (Telegram, servicios externos, etc.).",
          timestamp: now,
        },
      ],
    };
  }
}

export const createMockProvider = () => new MockProvider();
