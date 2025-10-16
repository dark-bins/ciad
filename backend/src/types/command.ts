export type AttachmentType = 'image' | 'document' | 'video' | 'audio';

export interface Attachment {
  id: string;
  type: AttachmentType;
  url: string;
  filename?: string | undefined;
  caption?: string | undefined;
  mimeType?: string | undefined;
}

export type ChatMessageAuthor = 'user' | 'system' | 'provider';

export interface ChatMessage {
  id: string;
  author: ChatMessageAuthor;
  body?: string | undefined;
  attachments?: Attachment[] | undefined;
  meta?: Record<string, unknown> | undefined;
  timestamp: string;
}

export interface CommandPayload {
  raw: string;
  command: string;
  args: string[];
}

export interface ProviderContext {
  userId: string;
  sessionId: string;
}

export interface ProviderResult {
  messages: ChatMessage[];
  meta?: Record<string, unknown>;
}

export interface CommandExecution {
  id: string;
  sessionId: string;
  userId: string;
  payload: CommandPayload;
  result: ProviderResult;
  startedAt: string;
  completedAt: string;
}

