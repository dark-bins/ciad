import type { PoolClient } from "pg";
import { query, transaction } from "../config/database";
import { CommandPayload, ProviderResult, CommandExecution, ChatMessage, Attachment } from "../types/command";

export interface ChatSessionRecord {
  id: string;
  session_id: string;
  user_id: string;
  is_active: boolean;
  created_at: Date;
  last_activity: Date;
}

export const upsertChatSession = async (userId: string, sessionKey: string): Promise<ChatSessionRecord> => {
  const result = await query<ChatSessionRecord>(
    `INSERT INTO chat_sessions (user_id, session_id, is_active, last_activity)
     VALUES ($1, $2, true, CURRENT_TIMESTAMP)
     ON CONFLICT (session_id)
     DO UPDATE SET last_activity = CURRENT_TIMESTAMP, is_active = true
     RETURNING *`,
    [userId, sessionKey],
  );

  const record = result[0];
  if (!record) {
    throw new Error("No se pudo crear o recuperar la sesion de chat");
  }
  return record;
};

export const findChatSession = async (sessionKey: string): Promise<ChatSessionRecord | null> => {
  const result = await query<ChatSessionRecord>(
    `SELECT id, session_id, user_id, is_active, created_at, last_activity
       FROM chat_sessions
      WHERE session_id = $1`,
    [sessionKey],
  );
  return result[0] ?? null;
};

const insertAttachment = async (
  client: PoolClient,
  messageId: string,
  attachment: Attachment,
): Promise<void> => {
  await client.query(
    `INSERT INTO message_attachments (message_id, type, url, filename, file_size)
     VALUES ($1, $2, $3, $4, $5)`,
    [messageId, attachment.type, attachment.url, attachment.filename ?? null, null],
  );
};

interface PersistExecutionParams {
  dbSessionId: string;
  userId: string;
  payload: CommandPayload;
  result: ProviderResult;
  startedAt: string;
  completedAt: string;
}

export const persistCommandExecution = async ({
  dbSessionId,
  userId,
  payload,
  result,
  startedAt,
  completedAt,
}: PersistExecutionParams): Promise<string> => {
  return transaction(async (client: PoolClient) => {
    const creditsUsed = Number(result.meta?.credits) || 1;
    const executionRes = await client.query<{ id: string }>(
      `INSERT INTO command_executions (user_id, session_id, command, raw_input, arguments, success, credits_used, executed_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      [
        userId,
        dbSessionId,
        payload.command,
        payload.raw,
        payload.args.join(" "),
        true,
        creditsUsed,
        new Date(completedAt).toISOString(),
      ],
    );

    const executionId = executionRes.rows[0]?.id;
    if (!executionId) {
      throw new Error("No se pudo registrar la ejecucion del comando");
    }

    // Mensaje del usuario
    await client.query(
      `INSERT INTO messages (session_id, user_id, author, body, has_attachments, command_execution_id, created_at)
       VALUES ($1, $2, 'user', $3, false, $4, $5)`,
      [dbSessionId, userId, payload.raw, executionId, new Date(startedAt).toISOString()],
    );

    // Mensajes del proveedor
    for (const message of result.messages) {
      const hasAttachments = Boolean(message.attachments?.length);
      const providerRes = await client.query<{ id: string }>(
        `INSERT INTO messages (session_id, user_id, author, body, has_attachments, command_execution_id, created_at)
         VALUES ($1, $2, 'provider', $3, $4, $5, $6) RETURNING id`,
        [
          dbSessionId,
          userId,
          message.body ?? null,
          hasAttachments,
          executionId,
          message.timestamp ? new Date(message.timestamp).toISOString() : new Date(completedAt).toISOString(),
        ],
      );

      const messageId = providerRes.rows[0]?.id;
      if (messageId && message.attachments) {
        for (const attachment of message.attachments) {
          await insertAttachment(client, messageId, attachment);
        }
      }
    }

    await client.query(
      `UPDATE chat_sessions
          SET last_activity = CURRENT_TIMESTAMP
        WHERE id = $1`,
      [dbSessionId],
    );
    return executionId;
  });
};

interface HistoryRow {
  execution_id: string;
  session_id: string;
  user_id: string;
  raw_input: string;
  command: string;
  arguments: string | null;
  started_at: Date | string;
  completed_at: Date | string;
}

interface MessageRow {
  id: string;
  command_execution_id: string | null;
  author: "user" | "provider";
  body: string | null;
  created_at: Date | string;
}

interface AttachmentRow {
  id: string;
  message_id: string;
  type: Attachment["type"];
  url: string;
  filename: string | null;
  file_size: number | null;
  created_at: Date | string;
}

const normalizeTimestamp = (value: Date | string): string => {
  if (value instanceof Date) {
    return value.toISOString();
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return new Date().toISOString();
  }
  return parsed.toISOString();
};

export const fetchSessionHistory = async (sessionKey: string): Promise<CommandExecution[]> => {
  const executions = await query<HistoryRow>(
    `SELECT
       ce.id as execution_id,
       cs.session_id,
       ce.raw_input,
       ce.command,
       ce.arguments,
       cs.user_id,
       ce.executed_at as completed_at,
       (ce.executed_at - INTERVAL '1 second') as started_at
     FROM command_executions ce
     JOIN chat_sessions cs ON ce.session_id = cs.id
    WHERE cs.session_id = $1
    ORDER BY ce.executed_at ASC`,
    [sessionKey],
  );

  if (executions.length === 0) {
    return [];
  }

  const executionIds = executions.map((row) => row.execution_id);

  const messages = executionIds.length
    ? await query<MessageRow>(
        `SELECT id, command_execution_id, author, body, created_at
           FROM messages
          WHERE command_execution_id IN (${executionIds.map(() => "?").join(", ")})
          ORDER BY created_at ASC`,
        executionIds,
      )
    : [];

  const messageIds = messages.map((row) => row.id);
  const attachments = messageIds.length
    ? await query<AttachmentRow>(
        `SELECT id, message_id, type, url, filename, file_size, created_at
           FROM message_attachments
          WHERE message_id IN (${messageIds.map(() => "?").join(", ")})
          ORDER BY created_at ASC`,
        messageIds,
      )
    : [];

  const attachmentsByMessage = attachments.reduce<Record<string, Attachment[]>>((acc, item) => {
    const list = acc[item.message_id] ?? [];
    list.push({
      id: item.id,
      type: item.type,
      url: item.url,
      filename: item.filename ?? undefined,
      mimeType: undefined,
    });
    acc[item.message_id] = list;
    return acc;
  }, {});

  const messagesByExecution = messages.reduce<Record<string, ChatMessage[]>>((acc, item) => {
    if (!item.command_execution_id) {
      return acc;
    }

    const list = acc[item.command_execution_id] ?? [];
    list.push({
      id: item.id,
      author: item.author,
      body: item.body ?? undefined,
      timestamp: normalizeTimestamp(item.created_at),
      attachments: attachmentsByMessage[item.id] ?? undefined,
    });
    acc[item.command_execution_id] = list;
    return acc;
  }, {});

  return executions.map<CommandExecution>((row) => {
    const providerMessages = messagesByExecution[row.execution_id] ?? [];
    providerMessages.sort((a, b) => a.timestamp.localeCompare(b.timestamp));

    const startedAt = normalizeTimestamp(row.started_at);
    const completedAt = normalizeTimestamp(row.completed_at);

    return {
      id: row.execution_id,
      sessionId: row.session_id,
      userId: row.user_id,
      payload: {
        raw: row.raw_input,
        command: row.command,
        args: row.arguments ? row.arguments.split(/\s+/).filter(Boolean) : [],
      },
      result: {
        messages: providerMessages.filter((message) => message.author === "provider"),
      },
      startedAt,
      completedAt,
    };
  });
};
