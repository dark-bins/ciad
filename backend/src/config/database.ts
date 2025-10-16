/**
 * Database connection with automatic PostgreSQL/SQLite fallback
 */

import { logger } from "../core/logger";

const USE_SQLITE = process.env.USE_SQLITE === "true" || process.env.DB_HOST === undefined;

type QueryFn = <T = unknown>(text: string, params?: unknown[]) => Promise<T[]>;
type TransactionFn = <T>(callback: (client: any) => Promise<T>) => Promise<T>;

interface DatabaseAdapter {
  pool: unknown;
  initDatabase: () => Promise<void>;
  closeDatabase: () => Promise<void>;
  query: QueryFn;
  transaction: TransactionFn;
}

let dbModule: DatabaseAdapter;

if (USE_SQLITE) {
  logger.info("Usando SQLite para desarrollo");
  dbModule = require("./database-sqlite") as DatabaseAdapter;
} else {
  logger.info("Usando PostgreSQL para producción");
  dbModule = require("./database-postgres") as DatabaseAdapter;
}

export const pool = dbModule.pool;
export const initDatabase = dbModule.initDatabase;
export const closeDatabase = dbModule.closeDatabase;
export const query: QueryFn = dbModule.query;
export const transaction: TransactionFn = dbModule.transaction;
