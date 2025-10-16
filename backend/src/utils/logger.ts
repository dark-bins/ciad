/**
 * Sistema de logging profesional con Winston
 * Incluye rotación de archivos, niveles de log y formateo
 */

import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';
import fs from 'fs';

// Crear directorio de logs si no existe
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Formato personalizado para consola
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let metaStr = '';
    if (Object.keys(meta).length > 0) {
      metaStr = '\n' + JSON.stringify(meta, null, 2);
    }
    return `[${timestamp}] ${level}: ${message}${metaStr}`;
  })
);

// Formato para archivos
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Transport para todos los logs
const allLogsTransport = new DailyRotateFile({
  filename: path.join(logsDir, 'application-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  maxSize: '20m',
  maxFiles: '14d',
  format: fileFormat,
});

// Transport para errores
const errorLogsTransport = new DailyRotateFile({
  filename: path.join(logsDir, 'error-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  level: 'error',
  maxSize: '20m',
  maxFiles: '30d',
  format: fileFormat,
});

// Transport para métricas de uso
const metricsTransport = new DailyRotateFile({
  filename: path.join(logsDir, 'metrics-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  maxSize: '20m',
  maxFiles: '30d',
  format: fileFormat,
});

// Logger principal
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  defaultMeta: { service: 'ciad-backend' },
  transports: [
    new winston.transports.Console({
      format: consoleFormat,
    }),
    allLogsTransport,
    errorLogsTransport,
  ],
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(logsDir, 'exceptions.log'),
      format: fileFormat,
    }),
  ],
  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(logsDir, 'rejections.log'),
      format: fileFormat,
    }),
  ],
});

// Logger para métricas
export const metricsLogger = winston.createLogger({
  level: 'info',
  defaultMeta: { type: 'metrics' },
  transports: [metricsTransport],
  format: fileFormat,
});

// Interfaces para métricas estructuradas
export interface CommandMetric {
  userId: string;
  username: string;
  command: string;
  success: boolean;
  executionTime: number;
  creditsUsed: number;
  errorMessage?: string;
  timestamp: Date;
}

export interface ApiMetric {
  method: string;
  path: string;
  statusCode: number;
  responseTime: number;
  userId?: string;
  ip: string;
  userAgent: string;
  timestamp: Date;
}

export interface ErrorMetric {
  type: 'validation' | 'database' | 'external_api' | 'auth' | 'system';
  message: string;
  stack?: string;
  userId?: string;
  context?: Record<string, any>;
  timestamp: Date;
}

// Funciones helper para logging estructurado
export const logCommand = (metric: CommandMetric): void => {
  metricsLogger.info('command_execution', metric);

  if (!metric.success) {
    logger.error('Command execution failed', {
      command: metric.command,
      user: metric.username,
      error: metric.errorMessage,
    });
  }
};

export const logApiRequest = (metric: ApiMetric): void => {
  metricsLogger.info('api_request', metric);

  if (metric.statusCode >= 500) {
    logger.error('API request failed', {
      method: metric.method,
      path: metric.path,
      statusCode: metric.statusCode,
      userId: metric.userId,
    });
  }
};

export const logError = (metric: ErrorMetric): void => {
  metricsLogger.error('application_error', metric);

  logger.error(`${metric.type.toUpperCase()} Error: ${metric.message}`, {
    type: metric.type,
    userId: metric.userId,
    context: metric.context,
    stack: metric.stack,
  });
};

// Middleware para logging de requests HTTP
export const requestLogger = (req: any, res: any, next: any): void => {
  const startTime = Date.now();

  res.on('finish', () => {
    const responseTime = Date.now() - startTime;

    logApiRequest({
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      responseTime,
      userId: req.user?.id,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent') || 'unknown',
      timestamp: new Date(),
    });
  });

  next();
};

// Estadísticas de uso en tiempo real
export class UsageStats {
  private static instance: UsageStats;
  private commandCounts: Map<string, number> = new Map();
  private errorCounts: Map<string, number> = new Map();
  private userActivity: Map<string, number> = new Map();
  private totalRequests = 0;
  private totalErrors = 0;

  static getInstance(): UsageStats {
    if (!UsageStats.instance) {
      UsageStats.instance = new UsageStats();
    }
    return UsageStats.instance;
  }

  incrementCommand(command: string): void {
    this.commandCounts.set(command, (this.commandCounts.get(command) || 0) + 1);
  }

  incrementError(errorType: string): void {
    this.errorCounts.set(errorType, (this.errorCounts.get(errorType) || 0) + 1);
    this.totalErrors++;
  }

  incrementUserActivity(userId: string): void {
    this.userActivity.set(userId, (this.userActivity.get(userId) || 0) + 1);
  }

  incrementRequests(): void {
    this.totalRequests++;
  }

  getStats(): {
    totalRequests: number;
    totalErrors: number;
    topCommands: Array<{ command: string; count: number }>;
    topErrors: Array<{ type: string; count: number }>;
    activeUsers: number;
  } {
    const topCommands = Array.from(this.commandCounts.entries())
      .map(([command, count]) => ({ command, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const topErrors = Array.from(this.errorCounts.entries())
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalRequests: this.totalRequests,
      totalErrors: this.totalErrors,
      topCommands,
      topErrors,
      activeUsers: this.userActivity.size,
    };
  }

  reset(): void {
    this.commandCounts.clear();
    this.errorCounts.clear();
    this.userActivity.clear();
    this.totalRequests = 0;
    this.totalErrors = 0;
  }
}

// Sistema de alertas
export class AlertSystem {
  private static instance: AlertSystem;
  private errorThreshold = 10; // Errores por minuto
  private errorCount = 0;
  private lastReset = Date.now();

  static getInstance(): AlertSystem {
    if (!AlertSystem.instance) {
      AlertSystem.instance = new AlertSystem();
    }
    return AlertSystem.instance;
  }

  checkAndAlert(error: ErrorMetric): void {
    this.errorCount++;

    // Reset counter cada minuto
    const now = Date.now();
    if (now - this.lastReset > 60000) {
      this.errorCount = 0;
      this.lastReset = now;
    }

    // Alerta si se excede el threshold
    if (this.errorCount >= this.errorThreshold) {
      this.sendAlert({
        severity: 'high',
        message: `High error rate detected: ${this.errorCount} errors in the last minute`,
        errorType: error.type,
        timestamp: new Date(),
      });
    }

    // Alertas críticas inmediatas
    if (error.type === 'database' || error.type === 'system') {
      this.sendAlert({
        severity: 'critical',
        message: `Critical error: ${error.message}`,
        errorType: error.type,
        context: error.context,
        timestamp: new Date(),
      });
    }
  }

  private sendAlert(alert: {
    severity: 'low' | 'medium' | 'high' | 'critical';
    message: string;
    errorType?: string;
    context?: any;
    timestamp: Date;
  }): void {
    logger.error('🚨 ALERT', alert);

    // Aquí puedes integrar servicios de notificación:
    // - Email (Nodemailer)
    // - Telegram Bot
    // - Slack Webhook
    // - Discord Webhook
    // - SMS (Twilio)

    // Por ahora solo loguea
    console.error('🚨 ALERT 🚨', JSON.stringify(alert, null, 2));
  }
}

export default logger;
