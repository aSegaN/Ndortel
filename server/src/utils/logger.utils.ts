// ============================================
// FICHIER: logger.utils.ts
// CHEMIN COMPLET: server/src/utils/logger.utils.ts
// DESCRIPTION: Utilitaires de logging pour les services
// VERSION: 1.0.0 - ARCH-001
// ============================================

import logger, {
    auditLogger,
    createServiceLogger,
    sanitizeForLog,
    LogMetadata
} from '../config/logger.js';

// ============================================
// TYPES D'AUDIT
// ============================================

export enum AuditAction {
    // Authentification
    LOGIN_SUCCESS = 'AUTH.LOGIN_SUCCESS',
    LOGIN_FAILURE = 'AUTH.LOGIN_FAILURE',
    LOGOUT = 'AUTH.LOGOUT',
    TOKEN_REFRESH = 'AUTH.TOKEN_REFRESH',
    PASSWORD_CHANGE = 'AUTH.PASSWORD_CHANGE',
    PASSWORD_RESET_REQUEST = 'AUTH.PASSWORD_RESET_REQUEST',

    // Utilisateurs
    USER_CREATE = 'USER.CREATE',
    USER_UPDATE = 'USER.UPDATE',
    USER_DELETE = 'USER.DELETE',
    USER_ACTIVATE = 'USER.ACTIVATE',
    USER_DEACTIVATE = 'USER.DEACTIVATE',

    // Actes d'état civil
    CERTIFICATE_CREATE = 'CERTIFICATE.CREATE',
    CERTIFICATE_UPDATE = 'CERTIFICATE.UPDATE',
    CERTIFICATE_VIEW = 'CERTIFICATE.VIEW',
    CERTIFICATE_PRINT = 'CERTIFICATE.PRINT',
    CERTIFICATE_SIGN = 'CERTIFICATE.SIGN',
    CERTIFICATE_VERIFY = 'CERTIFICATE.VERIFY',

    // Documents
    DOCUMENT_UPLOAD = 'DOCUMENT.UPLOAD',
    DOCUMENT_DOWNLOAD = 'DOCUMENT.DOWNLOAD',
    DOCUMENT_DELETE = 'DOCUMENT.DELETE',

    // Administration
    CONFIG_CHANGE = 'ADMIN.CONFIG_CHANGE',
    ROLE_CHANGE = 'ADMIN.ROLE_CHANGE',
    CENTER_CREATE = 'ADMIN.CENTER_CREATE',
    CENTER_UPDATE = 'ADMIN.CENTER_UPDATE',

    // Sécurité
    ACCESS_DENIED = 'SECURITY.ACCESS_DENIED',
    SUSPICIOUS_ACTIVITY = 'SECURITY.SUSPICIOUS_ACTIVITY',
    RATE_LIMIT_EXCEEDED = 'SECURITY.RATE_LIMIT_EXCEEDED',

    // NOUVELLES ACTIONS CDP
    ACCESS_GRANTED = 'ACCESS_GRANTED',
    DATA_RECTIFIED = 'DATA_RECTIFIED',
    DATA_ACCESSED = 'DATA_ACCESSED',
    CONSENT_GRANTED = 'CONSENT_GRANTED',
    CONSENT_REVOKED = 'CONSENT_REVOKED',
}

export interface AuditEntry {
    action: AuditAction;
    userId: string | null;
    targetId?: string;
    targetType?: string;
    details?: Record<string, unknown>;
    ip?: string;
    userAgent?: string;
    success: boolean;
    reason?: string;
}

// ============================================
// SERVICE DE LOGGING D'AUDIT
// ============================================

/**
 * Logger les actions d'audit (actions sensibles)
 */
export function audit(entry: AuditEntry): void {
    const logData = {
        action: entry.action,
        userId: entry.userId,
        targetId: entry.targetId,
        targetType: entry.targetType,
        success: entry.success,
        reason: entry.reason,
        ip: entry.ip,
        userAgent: entry.userAgent,
        timestamp: new Date().toISOString(),
        details: entry.details ? sanitizeForLog(entry.details) : undefined,
    };

    if (entry.success) {
        auditLogger.info(`[AUDIT] ${entry.action}`, logData);
    } else {
        auditLogger.warn(`[AUDIT] ${entry.action} FAILED`, logData);
    }
}

// ============================================
// LOGGERS DE PERFORMANCE
// ============================================

/**
 * Mesure et log la durée d'une opération
 */
export function measurePerformance<T>(
    operationName: string,
    fn: () => T | Promise<T>,
    meta: LogMetadata = {}
): T | Promise<T> {
    const startTime = Date.now();

    const logResult = (success: boolean, error?: Error) => {
        const duration = Date.now() - startTime;
        const level = success ? 'debug' : 'error';

        logger.log(level, `[PERF] ${operationName} completed in ${duration}ms`, {
            operation: operationName,
            duration,
            success,
            error: error?.message,
            ...meta,
        });
    };

    try {
        const result = fn();

        // Gérer les promesses
        if (result instanceof Promise) {
            return result
                .then((value) => {
                    logResult(true);
                    return value;
                })
                .catch((error) => {
                    logResult(false, error);
                    throw error;
                }) as Promise<T>;
        }

        logResult(true);
        return result;
    } catch (error) {
        logResult(false, error as Error);
        throw error;
    }
}

/**
 * Décorateur pour mesurer la performance des méthodes
 */
export function LogPerformance(operationName?: string) {
    return function (
        target: any,
        propertyKey: string,
        descriptor: PropertyDescriptor
    ) {
        const originalMethod = descriptor.value;
        const opName = operationName || `${target.constructor.name}.${propertyKey}`;

        descriptor.value = function (...args: any[]) {
            return measurePerformance(opName, () => originalMethod.apply(this, args));
        };

        return descriptor;
    };
}

// ============================================
// LOGGERS SPÉCIALISÉS PAR SERVICE
// ============================================

// Logger pour le service d'authentification
export const authLogger = createServiceLogger('auth-service');

// Logger pour le service de certificats
export const certificateLogger = createServiceLogger('certificate-service');

// Logger pour le service de stockage
export const storageLogger = createServiceLogger('storage-service');

// Logger pour le service de chiffrement
export const encryptionLogger = createServiceLogger('encryption-service');

// Logger pour le service PKI
export const pkiLogger = createServiceLogger('pki-service');

// ============================================
// HELPERS DE LOGGING
// ============================================

/**
 * Log le démarrage d'une opération
 */
export function logStart(operation: string, meta: LogMetadata = {}): number {
    const startTime = Date.now();
    logger.debug(`▶ Starting: ${operation}`, { operation, ...meta });
    return startTime;
}

/**
 * Log la fin d'une opération
 */
export function logEnd(operation: string, startTime: number, meta: LogMetadata = {}): void {
    const duration = Date.now() - startTime;
    logger.debug(`✓ Completed: ${operation} (${duration}ms)`, {
        operation,
        duration,
        ...meta,
    });
}

/**
 * Log un avertissement de sécurité
 */
export function logSecurityWarning(
    message: string,
    details: LogMetadata = {}
): void {
    logger.warn(`[SECURITY] ${message}`, {
        type: 'security_warning',
        ...details,
    });
}

/**
 * Log une erreur critique
 */
export function logCritical(
    message: string,
    error: Error,
    details: LogMetadata = {}
): void {
    logger.error(`[CRITICAL] ${message}`, {
        type: 'critical_error',
        errorName: error.name,
        errorMessage: error.message,
        errorStack: error.stack,
        ...details,
    });
}

/**
 * Log un événement métier
 */
export function logBusinessEvent(
    event: string,
    details: LogMetadata = {}
): void {
    logger.info(`[EVENT] ${event}`, {
        type: 'business_event',
        event,
        ...details,
    });
}

// ============================================
// CONTEXTE DE REQUÊTE
// ============================================

/**
 * Crée un contexte de logging pour une requête
 */
export function createRequestContext(requestId: string, userId?: string): LogMetadata {
    return {
        requestId,
        userId,
        timestamp: new Date().toISOString(),
    };
}

/**
 * Wrapper pour logger avec contexte de requête
 */
export class RequestLogger {
    private context: LogMetadata;

    constructor(requestId: string, userId?: string) {
        this.context = createRequestContext(requestId, userId);
    }

    debug(message: string, meta: LogMetadata = {}): void {
        logger.debug(message, { ...this.context, ...meta });
    }

    info(message: string, meta: LogMetadata = {}): void {
        logger.info(message, { ...this.context, ...meta });
    }

    warn(message: string, meta: LogMetadata = {}): void {
        logger.warn(message, { ...this.context, ...meta });
    }

    error(message: string, error?: Error, meta: LogMetadata = {}): void {
        logger.error(message, {
            ...this.context,
            errorName: error?.name,
            errorMessage: error?.message,
            errorStack: error?.stack,
            ...meta,
        });
    }

    audit(action: AuditAction, success: boolean, details?: Record<string, unknown>): void {
        audit({
            action,
            userId: this.context.userId as string || null,
            success,
            details,
        });
    }
}

// ============================================
// EXPORTS
// ============================================

export default {
    audit,
    measurePerformance,
    logStart,
    logEnd,
    logSecurityWarning,
    logCritical,
    logBusinessEvent,
    createRequestContext,
    RequestLogger,
};