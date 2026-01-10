// ============================================
// FICHIER: server/src/middleware/validate.ts
// DESCRIPTION: Middleware de validation Zod
// VERSION: 1.0.0 - SEC-003 Correction
// ============================================

import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

// ============================================
// TYPES
// ============================================

export interface ValidationError {
  field: string;
  message: string;
  code?: string;
}

export interface ValidatedRequest<TBody = any, TParams = any, TQuery = any> extends Request {
  validatedBody?: TBody;
  validatedParams?: TParams;
  validatedQuery?: TQuery;
}

// ============================================
// FORMATEUR D'ERREURS
// ============================================

/**
 * Formate les erreurs Zod en format utilisable
 */
function formatZodErrors(error: ZodError): ValidationError[] {
  return error.errors.map(err => ({
    field: err.path.join('.') || 'unknown',
    message: err.message,
    code: err.code
  }));
}

/**
 * Génère un message d'erreur lisible
 */
function formatErrorMessage(errors: ValidationError[]): string {
  if (errors.length === 1) {
    return errors[0].message;
  }
  return `${errors.length} erreurs de validation`;
}

// ============================================
// MIDDLEWARES DE VALIDATION
// ============================================

/**
 * Valide le body de la requête
 */
export function validateBody<T>(schema: ZodSchema<T>) {
  return async (req: ValidatedRequest<T>, res: Response, next: NextFunction) => {
    try {
      const result = await schema.parseAsync(req.body);
      req.validatedBody = result;
      // Remplace aussi req.body pour compatibilité
      req.body = result;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = formatZodErrors(error);
        return res.status(400).json({
          error: 'Données invalides',
          message: formatErrorMessage(errors),
          details: errors
        });
      }
      next(error);
    }
  };
}

/**
 * Valide les paramètres d'URL
 */
export function validateParams<T>(schema: ZodSchema<T>) {
  return async (req: ValidatedRequest<any, T>, res: Response, next: NextFunction) => {
    try {
      const result = await schema.parseAsync(req.params);
      req.validatedParams = result;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = formatZodErrors(error);
        return res.status(400).json({
          error: 'Paramètres invalides',
          message: formatErrorMessage(errors),
          details: errors
        });
      }
      next(error);
    }
  };
}

/**
 * Valide les query parameters
 */
export function validateQuery<T>(schema: ZodSchema<T>) {
  return async (req: ValidatedRequest<any, any, T>, res: Response, next: NextFunction) => {
    try {
      const result = await schema.parseAsync(req.query);
      req.validatedQuery = result;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = formatZodErrors(error);
        return res.status(400).json({
          error: 'Paramètres de requête invalides',
          message: formatErrorMessage(errors),
          details: errors
        });
      }
      next(error);
    }
  };
}

/**
 * Valide body, params et query en une fois
 */
export function validate<TBody = any, TParams = any, TQuery = any>(options: {
  body?: ZodSchema<TBody>;
  params?: ZodSchema<TParams>;
  query?: ZodSchema<TQuery>;
}) {
  return async (
    req: ValidatedRequest<TBody, TParams, TQuery>,
    res: Response,
    next: NextFunction
  ) => {
    const allErrors: ValidationError[] = [];

    try {
      // Valider params
      if (options.params) {
        try {
          const result = await options.params.parseAsync(req.params);
          req.validatedParams = result;
        } catch (error) {
          if (error instanceof ZodError) {
            allErrors.push(...formatZodErrors(error).map(e => ({
              ...e,
              field: `params.${e.field}`
            })));
          }
        }
      }

      // Valider query
      if (options.query) {
        try {
          const result = await options.query.parseAsync(req.query);
          req.validatedQuery = result;
        } catch (error) {
          if (error instanceof ZodError) {
            allErrors.push(...formatZodErrors(error).map(e => ({
              ...e,
              field: `query.${e.field}`
            })));
          }
        }
      }

      // Valider body
      if (options.body) {
        try {
          const result = await options.body.parseAsync(req.body);
          req.validatedBody = result;
          req.body = result;
        } catch (error) {
          if (error instanceof ZodError) {
            allErrors.push(...formatZodErrors(error).map(e => ({
              ...e,
              field: `body.${e.field}`
            })));
          }
        }
      }

      // Si erreurs, les retourner toutes
      if (allErrors.length > 0) {
        return res.status(400).json({
          error: 'Données invalides',
          message: formatErrorMessage(allErrors),
          details: allErrors
        });
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

// ============================================
// HELPERS DE SANITIZATION
// ============================================

/**
 * Middleware de sanitization globale des entrées
 * À utiliser avant la validation pour nettoyer les strings
 */
export function sanitizeInputs() {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.body && typeof req.body === 'object') {
      req.body = deepSanitize(req.body);
    }
    if (req.query && typeof req.query === 'object') {
      req.query = deepSanitize(req.query) as typeof req.query;
    }
    next();
  };
}

/**
 * Sanitize récursif d'un objet
 */
function deepSanitize(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map(deepSanitize);
  }

  if (typeof obj === 'object') {
    const result: any = {};
    for (const key of Object.keys(obj)) {
      // Ignorer les clés suspectes
      if (isValidKey(key)) {
        result[key] = deepSanitize(obj[key]);
      }
    }
    return result;
  }

  return obj;
}

/**
 * Sanitize une string
 */
function sanitizeString(str: string): string {
  // Ne pas modifier les base64 (images)
  if (str.length > 1000 && /^[A-Za-z0-9+/=]+$/.test(str.replace(/^data:image\/\w+;base64,/, ''))) {
    return str;
  }

  return str
    // Supprime les caractères nuls
    .replace(/\0/g, '')
    // Normalise les espaces
    .replace(/\s+/g, ' ')
    // Limite la longueur
    .slice(0, 10000)
    .trim();
}

/**
 * Vérifie si une clé est valide (pas d'injection prototype)
 */
function isValidKey(key: string): boolean {
  const blacklist = ['__proto__', 'constructor', 'prototype'];
  return !blacklist.includes(key);
}

// ============================================
// MIDDLEWARE DE RATE LIMITING PAR VALIDATION
// ============================================

const validationAttempts = new Map<string, { count: number; resetAt: number }>();

/**
 * Limite le nombre de tentatives de validation échouées
 * Prévient les attaques par enumeration
 */
export function rateLimit(options: {
  windowMs?: number;
  maxAttempts?: number;
  keyGenerator?: (req: Request) => string;
} = {}) {
  const {
    windowMs = 15 * 60 * 1000, // 15 minutes
    maxAttempts = 100,
    keyGenerator = (req) => req.ip || 'unknown'
  } = options;

  return (req: Request, res: Response, next: NextFunction) => {
    const key = keyGenerator(req);
    const now = Date.now();
    
    let record = validationAttempts.get(key);
    
    if (!record || record.resetAt < now) {
      record = { count: 0, resetAt: now + windowMs };
      validationAttempts.set(key, record);
    }

    record.count++;

    if (record.count > maxAttempts) {
      return res.status(429).json({
        error: 'Trop de requêtes',
        message: 'Veuillez réessayer plus tard',
        retryAfter: Math.ceil((record.resetAt - now) / 1000)
      });
    }

    next();
  };
}

// ============================================
// EXPORTS
// ============================================

export default {
  validateBody,
  validateParams,
  validateQuery,
  validate,
  sanitizeInputs,
  rateLimit
};
