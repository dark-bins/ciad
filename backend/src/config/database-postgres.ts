/**
 * PostgreSQL connection helpers.
 */

import { Pool, PoolConfig, PoolClient } from "pg";
import { logger } from "../core/logger";

const poolConfig: PoolConfig = {
  host: process.env.DB_HOST || "localhost",
  port: Number.parseInt(process.env.DB_PORT || "5432", 10),
  database: process.env.DB_NAME || "chatweb",
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "postgres",
  max: 20,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 2_000,
};

export const pool = new Pool(poolConfig);

pool.on("error", (error) => {
  logger.error("Error inesperado en el pool de PostgreSQL", { error });
});

export const initDatabase = async (): Promise<void> => {
  const client = await pool.connect();
  try {
    const result = await client.query<{ now: Date }>("SELECT NOW()");
    logger.info("PostgreSQL conectado", { now: result.rows[0]?.now });
  } catch (error) {
    logger.error("Error al conectar con PostgreSQL", { error });
    throw error;
  } finally {
    client.release();
  }
};

export const closeDatabase = async (): Promise<void> => {
  await pool.end();
  logger.info("Pool de PostgreSQL cerrado");
};

export const query = async <T = unknown>(text: string, params?: unknown[]): Promise<T[]> => {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    if (duration > 1_000) {
      logger.warn("Query lenta detectada", { text: text.slice(0, 100), duration });
    }
    return result.rows as T[];
  } catch (error) {
    logger.error("Error ejecutando query", { error, text: text.slice(0, 120) });
    throw error;
  }
};

export const transaction = async <T>(callback: (client: PoolClient) => Promise<T>): Promise<T> => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    logger.error("Error en transaccion", { error });
    throw error;
  } finally {
    client.release();
  }
};
