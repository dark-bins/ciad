import { randomUUID } from "crypto";
import { CommandExecution } from "../types/command";
import { ChatSessionRecord, findChatSession, fetchSessionHistory, upsertChatSession } from "../models/ChatHistory";

export interface Session {
  id: string; // public session identifier
  dbId: string; // chat_sessions.id
  userId: string;
  createdAt: string;
  history: CommandExecution[];
}

export class SessionService {
  private sessions = new Map<string, Session>();

  async createSession(userId: string): Promise<Session> {
    const sessionId = randomUUID();
    const record = await upsertChatSession(userId, sessionId);
    const session: Session = {
      id: record.session_id,
      dbId: record.id,
      userId: record.user_id,
      createdAt: typeof record.created_at === 'string' ? record.created_at : record.created_at.toISOString(),
      history: [],
    };
    this.sessions.set(session.id, session);
    return session;
  }

  async ensureSession(sessionId: string, userId: string): Promise<Session> {
    const existing = this.sessions.get(sessionId);
    if (existing) {
      return existing;
    }

    const record = (await findChatSession(sessionId)) ?? (await upsertChatSession(userId, sessionId));
    if (record.user_id !== userId) {
      throw new Error("La sesion no pertenece al usuario especificado");
    }

    const history = await fetchSessionHistory(sessionId);
    const session: Session = {
      id: record.session_id,
      dbId: record.id,
      userId: record.user_id,
      createdAt: typeof record.created_at === 'string' ? record.created_at : record.created_at.toISOString(),
      history,
    };
    this.sessions.set(session.id, session);
    return session;
  }

  getSession(sessionId: string): Session | undefined {
    return this.sessions.get(sessionId);
  }

  appendHistory(sessionId: string, entry: CommandExecution): Session {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }
    session.history.push(entry);
    return session;
  }

  async listHistory(sessionId: string): Promise<CommandExecution[]> {
    const session = this.sessions.get(sessionId);
    if (session) {
      return [...session.history];
    }
    const history = await fetchSessionHistory(sessionId);
    if (history.length > 0) {
      const record = await findChatSession(sessionId);
      if (record) {
        this.sessions.set(sessionId, {
          id: record.session_id,
          dbId: record.id,
          userId: record.user_id,
          createdAt: typeof record.created_at === 'string' ? record.created_at : record.created_at.toISOString(),
          history,
        });
      }
    }
    return history;
  }
}

export const createSessionService = () => new SessionService();

