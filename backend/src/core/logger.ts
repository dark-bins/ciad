/**
 * Logger principal del sistema - ahora usando Winston
 * Exporta la misma interfaz para compatibilidad
 */

import {
  logger as winstonLogger,
  metricsLogger,
  logCommand,
  logApiRequest,
  logError,
  requestLogger,
  UsageStats,
  AlertSystem,
} from '../utils/logger';

export type LogLevel = "info" | "warn" | "error" | "debug";

// Re-exportar el logger de Winston manteniendo la interfaz original
export const logger = winstonLogger;

// Exportar funciones adicionales
export {
  metricsLogger,
  logCommand,
  logApiRequest,
  logError,
  requestLogger,
  UsageStats,
  AlertSystem,
};

export default logger;
