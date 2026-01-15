// ============================================
// FICHIER: httpLogger.middleware.ts
// CHEMIN COMPLET: server/src/middleware/httpLogger.middleware.ts
// DESCRIPTION: Middleware Express pour logging HTTP structuré
// VERSION: 1.0.0 - ARCH-001
// ============================================

import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { httpLogger, sanitizeForLog, LogMetadata } from '../config/logger.js';

// ============================================
// TYPES
// ============================================

// Étendre Request pour inclure les métadonnées de logging
declare global {
    namespace Express {
        interface Request {
            requestId: string;
            startTime: number;
            logMeta: LogMetadata;
        }
    }
}

interface HttpLogEntry {
    requestId: string;
    method: string;
    path: string;
    query: Record<string, unknown>;
    statusCode: number;
    duration: number;
    ip: string;
    userAgent: string;
    userId?: string;
    contentLength?: number;
    referer?: string;
    error?: string;
}

// ============================================
// CONFIGURATION
// ============================================

// Chemins à exclure du logging détaillé
const EXCLUDED_PATHS = [
    '/health',
    '/healthz',
    '/ready',
    '/metrics',
    '/favicon.ico',
];

// Chemins sensibles (ne pas logger le body)
const SENSITIVE_PATHS = [
    '/api/auth/login',
    '/api/auth/register',
    '/api/auth/reset-password',
];

// ============================================
// MIDDLEWARE PRINCIPAL
// ============================================

/**
 * Middleware de logging HTTP
 * Log chaque requête entrante et sa réponse
 */
export function httpLoggerMiddleware(
    req: Request,
    res: Response,
    next: NextFunction
): void {
    // Générer un ID unique pour cette requête
    req.requestId = req.headers['x-request-id'] as string || uuidv4();
    req.startTime = Date.now();

    // Ajouter le request ID aux headers de réponse
    res.setHeader('X-Request-ID', req.requestId);

    // Métadonnées de base pour le logging
    req.logMeta = {
        requestId: req.requestId,
        method: req.method,
        path: req.path,
        ip: getClientIp(req),
        userAgent: req.headers['user-agent'] || 'unknown',
    };

    // Vérifier si ce chemin doit être exclu
    if (EXCLUDED_PATHS.some(p => req.path.startsWith(p))) {
        return next();
    }

    // Log de la requête entrante
    logIncomingRequest(req);

    // Capturer la fin de la réponse
    const originalEnd = res.end.bind(res);

    res.end = function (chunk?: any, encoding?: BufferEncoding | (() => void), callback?: () => void): Response {
        // Calculer la durée
        const duration = Date.now() - req.startTime;

        // Construire l'entrée de log
        const logEntry: HttpLogEntry = {
            requestId: req.requestId,
            method: req.method,
            path: req.path,
            query: sanitizeForLog(req.query as Record<string, unknown>),
            statusCode: res.statusCode,
            duration,
            ip: getClientIp(req),
            userAgent: req.headers['user-agent'] || 'unknown',
            contentLength: parseInt(res.getHeader('content-length') as string) || 0,
            referer: req.headers.referer || req.headers.referrer as string,
        };

        // Ajouter l'ID utilisateur si disponible
        if ((req as any).user?.id) {
            logEntry.userId = (req as any).user.id;
        }

        // Déterminer le niveau de log selon le status code
        const logLevel = getLogLevel(res.statusCode);

        // Logger la réponse
        httpLogger.log(logLevel, `${req.method} ${req.path} ${res.statusCode} ${duration}ms`, logEntry);

        // Appeler la fonction originale
        if (typeof encoding === 'function') {
            return originalEnd(chunk, encoding);
        }
        return originalEnd(chunk, encoding as BufferEncoding, callback);
    } as typeof res.end;

    next();
}

// ============================================
// HELPERS
// ============================================

/**
 * Log la requête entrante
 */
function logIncomingRequest(req: Request): void {
    const isSensitive = SENSITIVE_PATHS.some(p => req.path.startsWith(p));

    const logData: Record<string, unknown> = {
        requestId: req.requestId,
        method: req.method,
        path: req.path,
        query: sanitizeForLog(req.query as Record<string, unknown>),
        ip: getClientIp(req),
        userAgent: req.headers['user-agent'],
    };

    // Logger le body seulement pour les requêtes non-sensibles en mode debug
    if (!isSensitive && process.env.LOG_LEVEL === 'debug' && req.body) {
        logData.body = sanitizeForLog(req.body);
    }

    httpLogger.http(`→ ${req.method} ${req.path}`, logData);
}

/**
 * Obtenir l'IP du client (gère les proxies)
 */
function getClientIp(req: Request): string {
    const forwardedFor = req.headers['x-forwarded-for'];
    if (forwardedFor) {
        const ips = (forwardedFor as string).split(',');
        return ips[0].trim();
    }
    return req.ip || req.socket.remoteAddress || 'unknown';
}

/**
 * Déterminer le niveau de log selon le status code
 */
function getLogLevel(statusCode: number): string {
    if (statusCode >= 500) return 'error';
    if (statusCode >= 400) return 'warn';
    if (statusCode >= 300) return 'info';
    return 'http';
}

// ============================================
// MIDDLEWARE D'ERREUR
// ============================================

/**
 * Middleware de logging des erreurs
 * À utiliser après tous les autres middlewares
 */
export function errorLoggerMiddleware(
    err: Error,
    req: Request,
    res: Response,
    next: NextFunction
): void {
    const duration = Date.now() - (req.startTime || Date.now());

    httpLogger.error(`✗ ${req.method} ${req.path} ERROR`, {
        requestId: req.requestId,
        method: req.method,
        path: req.path,
        duration,
        ip: getClientIp(req),
        userId: (req as any).user?.id,
        error: {
            name: err.name,
            message: err.message,
            stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
        },
    });

    next(err);
}

// ============================================
// EXPORTS
// ============================================

export default httpLoggerMiddleware;