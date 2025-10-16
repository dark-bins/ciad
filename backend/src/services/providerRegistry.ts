import { BotProvider } from "../providers/baseProvider";
import { CommandPayload } from "../types/command";

export class ProviderRegistry {
  private providers: BotProvider[] = [];

  register(provider: BotProvider) {
    this.providers.push(provider);
    this.providers.sort((a, b) => a.descriptor.priority - b.descriptor.priority);
  }

  resolve(command: string): BotProvider | undefined {
    return this.providers.find((provider) => provider.supports(command));
  }

  list(): BotProvider[] {
    return [...this.providers];
  }
}

export const createDefaultRegistry = () => new ProviderRegistry();
