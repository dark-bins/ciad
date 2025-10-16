/**
 * SQLite database adapter for development
 * Provides same interface as PostgreSQL adapter
 */

import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const DB_PATH = path.join(process.cwd(), "data", "chatweb.db");

// Ensure data directory exists
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

let db: Database.Database | null = null;

export const initDatabase = async (): Promise<void> => {
  try {
    db = new Database(DB_PATH);

    // Enable foreign keys
    db.pragma("foreign_keys = ON");

    // Create tables
    const schema = `
      -- Users table
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'premium', 'admin')),
        plan TEXT NOT NULL DEFAULT 'FREE' CHECK (plan IN ('FREE', 'BASIC', 'PREMIUM', 'GOLD', 'PLATINUM', 'ADMIN')),
        credits INTEGER NOT NULL DEFAULT 100,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        last_login TEXT
      );

      -- Chat sessions
      CREATE TABLE IF NOT EXISTS chat_sessions (
        id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        session_id TEXT UNIQUE NOT NULL,
        provider_chat_id INTEGER,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT DEFAULT (datetime('now')),
        last_activity TEXT DEFAULT (datetime('now'))
      );

      -- Messages
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
        session_id TEXT NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        author TEXT NOT NULL CHECK (author IN ('user', 'provider')),
        body TEXT,
        has_attachments INTEGER DEFAULT 0,
        command_execution_id TEXT REFERENCES command_executions(id) ON DELETE SET NULL,
        created_at TEXT DEFAULT (datetime('now'))
      );

      -- Message attachments
      CREATE TABLE IF NOT EXISTS message_attachments (
        id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
        message_id TEXT NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
        type TEXT NOT NULL,
        url TEXT NOT NULL,
        filename TEXT,
        file_size INTEGER,
        created_at TEXT DEFAULT (datetime('now'))
      );

      -- Command executions
      CREATE TABLE IF NOT EXISTS command_executions (
        id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        session_id TEXT REFERENCES chat_sessions(id) ON DELETE SET NULL,
        command TEXT NOT NULL,
        raw_input TEXT,
        arguments TEXT,
        success INTEGER NOT NULL,
        error_message TEXT,
        credits_used INTEGER DEFAULT 1,
        executed_at TEXT DEFAULT (datetime('now'))
      );

      -- System config
      CREATE TABLE IF NOT EXISTS system_config (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        description TEXT,
        updated_at TEXT DEFAULT (datetime('now')),
        updated_by TEXT REFERENCES users(id)
      );

      -- Indexes
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
      CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON chat_sessions(user_id);
      CREATE INDEX IF NOT EXISTS idx_messages_session_id ON messages(session_id);
      CREATE INDEX IF NOT EXISTS idx_command_executions_user_id ON command_executions(user_id);
    `;

    db.exec(schema);

    // Insert default admin user (password: scrall123)
    const adminExists = db.prepare("SELECT id FROM users WHERE username = ?").get("scrall");
    if (!adminExists) {
      db.prepare(`
        INSERT INTO users (username, email, password_hash, role, plan, credits)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        "scrall",
        "scrall@ciad.local",
        "$2b$10$leKwaHQ9fzw1wpija/kVk.KqcmCou1ECtzDJiOzoUi5C2m7lGdmIO", // scrall123
        "admin",
        "PLATINUM",
        999999
      );
    }

    // Insert default system config
    const configExists = db.prepare("SELECT key FROM system_config WHERE key = ?").get("queries_enabled");
    if (!configExists) {
      db.exec(`
        INSERT OR IGNORE INTO system_config (key, value, description) VALUES
          ('maintenance_mode', 'false', 'Activa/desactiva el modo mantenimiento'),
          ('queries_enabled', 'true', 'Permite o bloquea las consultas'),
          ('rate_limit_cooldown', '15', 'Cooldown entre comandos en segundos'),
          ('default_credits', '100', 'Créditos iniciales para nuevos usuarios'),
          ('free_plan_limit', '50', 'Límite de consultas para plan FREE');
      `);
    }

    console.log("✅ SQLite database initialized:", DB_PATH);
  } catch (error) {
    console.error("❌ Error initializing SQLite:", error);
    throw error;
  }
};

export const closeDatabase = async (): Promise<void> => {
  if (db) {
    db.close();
    console.log("🔌 SQLite database closed");
  }
};

export const query = async <T = any>(text: string, params?: any[]): Promise<T[]> => {
  if (!db) throw new Error("Database not initialized");

  try {
    const sqliteQuery = text.replace(/\$\d+/g, "?");

    const normalizeParam = (value: unknown) => {
      if (value === null || value === undefined) return null;
      if (typeof value === "boolean") return value ? 1 : 0;
      if (value instanceof Date) return value.toISOString();
      if (typeof value === "object" && !Buffer.isBuffer(value)) return JSON.stringify(value);
      return value;
    };

    const normalizedParams = params && Array.isArray(params) ? params.map(normalizeParam) : undefined;

    if (sqliteQuery.trim().toUpperCase().startsWith("SELECT")) {
      const stmt = db.prepare(sqliteQuery);
      const rows = normalizedParams && normalizedParams.length > 0 ? stmt.all(...(normalizedParams as any[])) : stmt.all();
      return rows as T[];
    }

    if (sqliteQuery.trim().toUpperCase().includes("RETURNING")) {
      const queryWithoutReturning = sqliteQuery.replace(/RETURNING\s+\*/gi, "");
      const stmt = db.prepare(queryWithoutReturning);
      const info = normalizedParams && normalizedParams.length > 0 ? stmt.run(...(normalizedParams as any[])) : stmt.run();

      const tableName = sqliteQuery.match(/(?:INSERT INTO|UPDATE)\s+(\w+)/i)?.[1];
      if (tableName) {
        const conflictMatch = sqliteQuery.match(/ON CONFLICT\s*\((\w+)\)/i);
        const conflictColumn = conflictMatch?.[1];
        if (conflictColumn && normalizedParams && normalizedParams.length > 0) {
          const columnsMatch = sqliteQuery.match(/INSERT INTO\s+\w+\s*\(([^)]+)\)/i);
          const columns = columnsMatch?.[1]?.split(",").map((c) => c.trim());
          if (columns) {
            const conflictIndex = columns.indexOf(conflictColumn);
            if (conflictIndex >= 0 && conflictIndex < normalizedParams.length) {
              const conflictValue = normalizedParams[conflictIndex];
              if (conflictValue !== undefined && conflictValue !== null) {
                const row = db
                  .prepare(`SELECT * FROM ${tableName} WHERE ${conflictColumn} = ?`)
                  .get(conflictValue as string | number | Buffer);
                if (row) return [row] as T[];
              }
            }
          }
        }

        const lastId = info.lastInsertRowid;
        if (lastId) {
          let row = db.prepare(`SELECT * FROM ${tableName} WHERE rowid = ?`).get(lastId);
          if (!row) {
            row = db.prepare(`SELECT * FROM ${tableName} WHERE id = ?`).get(lastId);
          }
          if (row) return [row] as T[];
        }
      }
      return [] as T[];
    }

    const stmt = db.prepare(sqliteQuery);
    if (normalizedParams && normalizedParams.length > 0) {
      stmt.run(...(normalizedParams as any[]));
    } else {
      stmt.run();
    }
    return [] as T[];
  } catch (error) {
    console.error("?s???? SQLite query error:", error);
    throw error;
  }
};

export const transaction = async <T>(
  callback: (client: any) => Promise<T>
): Promise<T> => {
  if (!db) throw new Error("Database not initialized");

  const normalizeParam = (value: unknown) => {
    if (value === null || value === undefined) return null;
    if (typeof value === "boolean") return value ? 1 : 0;
    if (value instanceof Date) return value.toISOString();
    if (typeof value === "object" && !Buffer.isBuffer(value)) return JSON.stringify(value);
    return value;
  };

  const mockClient = {
    query: (text: string, params?: any[]) => {
      const sqliteQuery = text.replace(/\$\d+/g, "?");
      const stmt = db!.prepare(sqliteQuery);
      const normalizedParams = params?.map(normalizeParam);

      if (sqliteQuery.trim().toUpperCase().includes("RETURNING")) {
        const queryWithoutReturning = sqliteQuery.replace(/RETURNING\s+\w+/gi, "");
        const stmt = db!.prepare(queryWithoutReturning);
        const info = normalizedParams && normalizedParams.length > 0 ? stmt.run(...normalizedParams) : stmt.run();

        const lastId = info.lastInsertRowid;
        if (lastId) {
          const tableName = sqliteQuery.match(/(?:INSERT INTO|UPDATE)\s+(\w+)/i)?.[1];
          if (tableName) {
            const idCol = sqliteQuery.match(/RETURNING\s+(\w+)/i)?.[1] || "id";
            const row = db!.prepare(`SELECT * FROM ${tableName} WHERE rowid = ?`).get(lastId);
            return { rows: row ? [row] : [] };
          }
        }
        return { rows: [] };
      }

      const result = normalizedParams && normalizedParams.length > 0 ? stmt.run(...normalizedParams) : stmt.run();
      return { rows: [], rowCount: result.changes };
    },
  };

  try {
    db.prepare("BEGIN").run();
    const result = await callback(mockClient);
    db.prepare("COMMIT").run();
    return result;
  } catch (error) {
    db.prepare("ROLLBACK").run();
    throw error;
  }
};
export const pool = {
  connect: async () => ({ release: () => {} }),
  query: (text: string, params?: any[]) => query(text, params),
};



