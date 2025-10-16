import { CommandPayload, ProviderContext, ProviderResult } from '../types/command';

export interface ProviderDescriptor {
  name: string;
  priority: number;
  supportedCommands: string[] | '*';
}

export interface BotProvider {
  readonly descriptor: ProviderDescriptor;
  supports(command: string): boolean;
  execute(payload: CommandPayload, context: ProviderContext): Promise<ProviderResult>;
}

export type ProviderFactory = () => BotProvider;

