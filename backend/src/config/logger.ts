// ============================================
// FICHIER: logger.ts
// CHEMIN COMPLET: server/src/config/logger.ts
// DESCRIPTION: Configuration Winston pour logs structurés
// VERSION: 1.0.0 - ARCH-001
// ============================================

import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';

// ============================================
// TYPES
// ============================================

export interface LogMetadata {
    requestId?: string;
    userId?: string;
    service?: string;
    action?: string;
    duration?: number;
    statusCode?: number;
    method?: string;
    path?: string;
    ip?: string;
    userAgent?: string;
    [key: string]: unknown;
}

export type LogLevel = 'error' | 'warn' | 'info' | 'http' | 'debug';

// ============================================
// CONFIGURATION
// ============================================

const LOG_DIR = process.env.LOG_DIR || 'logs';
const LOG_LEVEL = (process.env.LOG_LEVEL || 'info') as LogLevel;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Niveaux de log personnalisés (npm standard)
const levels: winston.config.AbstractConfigSetLevels = {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    debug: 4,
};

// Couleurs pour la console
const colors: winston.config.AbstractConfigSetColors = {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    http: 'magenta',
    debug: 'blue',
};

winston.addColors(colors);

// ============================================
// FORMATS
// ============================================

// Format JSON structuré pour production/fichiers
const jsonFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
    winston.format.errors({ stack: true }),
    winston.format.json()
);

// Format lisible pour console en développement
const consoleFormat = winston.format.combine(
    winston.format.timestamp({ format: 'HH:mm:ss.SSS' }),
    winston.format.colorize({ all: true }),
    winston.format.errors({ stack: true }),
    winston.format.printf(({ level, message, timestamp, service, requestId, ...meta }) => {
        const reqId = requestId ? `[${requestId}]` : '';
        const svc = service ? `[${service}]` : '';
        const metaStr = Object.keys(meta).length > 0
            ? `\n  ${JSON.stringify(meta, null, 2).replace(/\n/g, '\n  ')}`
            : '';
        return `${timestamp} ${level} ${svc}${reqId} ${message}${metaStr}`;
    })
);

// ============================================
// TRANSPORTS
// ============================================

// Transport console
const consoleTransport = new winston.transports.Console({
    level: NODE_ENV === 'development' ? 'debug' : LOG_LEVEL,
    format: NODE_ENV === 'development' ? consoleFormat : jsonFormat,
});

// Transport fichier rotatif - Tous les logs
const allLogsTransport = new DailyRotateFile({
    filename: path.join(LOG_DIR, 'app-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '14d',
    level: LOG_LEVEL,
    format: jsonFormat,
});

// Transport fichier rotatif - Erreurs uniquement
const errorLogsTransport = new DailyRotateFile({
    filename: path.join(LOG_DIR, 'error-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '30d',
    level: 'error',
    format: jsonFormat,
});

// Transport fichier rotatif - HTTP requests
const httpLogsTransport = new DailyRotateFile({
    filename: path.join(LOG_DIR, 'http-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '50m',
    maxFiles: '7d',
    level: 'http',
    format: jsonFormat,
});

// Transport fichier rotatif - Audit/Sécurité
const auditLogsTransport = new DailyRotateFile({
    filename: path.join(LOG_DIR, 'audit-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '50m',
    maxFiles: '90d', // Conservation 3 mois pour audit
    level: 'info',
    format: jsonFormat,
});

// ============================================
// LOGGER PRINCIPAL
// ============================================

const logger = winston.createLogger({
    levels,
    level: LOG_LEVEL,
    defaultMeta: {
        service: 'ndortel-api',
        environment: NODE_ENV,
        version: process.env.npm_package_version || '1.0.0',
    },
    transports: [
        consoleTransport,
        allLogsTransport,
        errorLogsTransport,
    ],
    // Ne pas quitter sur les exceptions non gérées
    exitOnError: false,
    // Capturer les exceptions non gérées
    exceptionHandlers: [
        new winston.transports.File({
            filename: path.join(LOG_DIR, 'exceptions.log'),
            format: jsonFormat,
        }),
    ],
    // Capturer les rejections de promesses non gérées
    rejectionHandlers: [
        new winston.transports.File({
            filename: path.join(LOG_DIR, 'rejections.log'),
            format: jsonFormat,
        }),
    ],
});

// ============================================
// LOGGERS SPÉCIALISÉS
// ============================================

// Logger HTTP (requêtes/réponses)
export const httpLogger = winston.createLogger({
    levels,
    level: 'http',
    defaultMeta: { service: 'ndortel-http' },
    transports: [
        consoleTransport,
        httpLogsTransport,
    ],
    format: jsonFormat,
});

// Logger Audit (actions sensibles)
export const auditLogger = winston.createLogger({
    levels,
    level: 'info',
    defaultMeta: { service: 'ndortel-audit' },
    transports: [
        consoleTransport,
        auditLogsTransport,
    ],
    format: jsonFormat,
});

// ============================================
// HELPERS
// ============================================

/**
 * Crée un logger enfant avec métadonnées additionnelles
 */
export function createChildLogger(meta: LogMetadata): winston.Logger {
    return logger.child(meta);
}

/**
 * Crée un logger pour un service spécifique
 */
export function createServiceLogger(serviceName: string): winston.Logger {
    return logger.child({ service: serviceName });
}

/**
 * Log une action d'audit (connexion, modification, etc.)
 */
export function logAudit(
    action: string,
    userId: string | null,
    details: Record<string, unknown> = {}
): void {
    auditLogger.info(action, {
        action,
        userId,
        timestamp: new Date().toISOString(),
        ...details,
    });
}

/**
 * Log une erreur avec contexte complet
 */
export function logError(
    error: Error,
    context: LogMetadata = {}
): void {
    logger.error(error.message, {
        errorName: error.name,
        errorStack: error.stack,
        ...context,
    });
}

/**
 * Masque les données sensibles dans les logs
 */
export function sanitizeForLog(data: Record<string, unknown>): Record<string, unknown> {
    const sensitiveFields = [
        'password', 'password_hash', 'token', 'accessToken', 'refreshToken',
        'authorization', 'cookie', 'secret', 'apiKey', 'api_key',
        'cni', 'nationalId', 'ssn', 'creditCard', 'cvv',
    ];

    const sanitized = { ...data };

    for (const field of sensitiveFields) {
        if (field in sanitized) {
            sanitized[field] = '[REDACTED]';
        }
    }

    // Sanitize nested objects
    for (const [key, value] of Object.entries(sanitized)) {
        if (value && typeof value === 'object' && !Array.isArray(value)) {
            sanitized[key] = sanitizeForLog(value as Record<string, unknown>);
        }
    }

    return sanitized;
}

// ============================================
// EXPORT PAR DÉFAUT
// ============================================

export default logger;

// Export nommé pour compatibilité
export { logger };