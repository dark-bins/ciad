export type Author = "user" | "provider" | "system";

export interface Attachment {
  id: string;
  type: "image" | "document" | "video" | "audio";
  url: string;
  filename?: string;
  caption?: string;
}

export interface ChatMessage {
  id: string;
  author: Author;
  body?: string;
  attachments?: Attachment[];
  timestamp: string;
  meta?: Record<string, unknown>;
}

export interface CommandExecution {
  id: string;
  sessionId: string;
  userId: string;
  payload: {
    raw: string;
    command: string;
    args: string[];
  };
  result: {
    messages: ChatMessage[];
    meta?: Record<string, unknown>;
  };
  startedAt: string;
  completedAt: string;
}

export interface SessionState {
  sessionId: string;
  userId: string;
  history: CommandExecution[];
}
