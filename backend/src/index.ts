// ============================================
// FICHIER: backend/src/index.ts
// VERSION: 3.1.0 - Routes corrigées
// ============================================

import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { Pool } from 'pg';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { z, ZodError, ZodSchema, ZodIssue } from 'zod';

// ============================================
// IMPORTS LOGGING (ARCH-001)
// ============================================
import logger from './config/logger.js';
import { httpLoggerMiddleware, errorLoggerMiddleware } from './middleware/httpLogger.middleware.js';
import {
  audit,
  AuditAction,
  authLogger,
  logSecurityWarning,
  logBusinessEvent,
  RequestLogger
} from './utils/logger.utils.js';

// ============================================
// IMPORTS CDP (COMP-002)
// ============================================
import {
  createCDPRouter,
  createCDPAdminRouter,
  PersonalDataAccessLogger
} from './services/cdp-compliance.service.js';

// Charger les variables d'environnement
dotenv.config();

// ============================================
// VALIDATION ZOD INTÉGRÉE (SEC-003)
// ============================================

// Schéma de login
const loginSchema = z.object({
  email: z.string()
    .email({ message: 'Format email invalide' })
    .max(255)
    .transform(val => val.toLowerCase().trim()),
  password: z.string()
    .min(1, { message: 'Mot de passe requis' })
    .max(128)
});

// Schéma création utilisateur
const createUserSchema = z.object({
  name: z.string()
    .min(2, { message: 'Nom trop court' })
    .max(100)
    .regex(/^[\p{L}\s'-]+$/u, { message: 'Nom invalide' }),
  email: z.string()
    .email({ message: 'Format email invalide' })
    .transform(val => val.toLowerCase().trim()),
  password: z.string()
    .min(8, { message: 'Mot de passe trop court (min 8)' })
    .max(128)
    .refine(
      val => /[A-Z]/.test(val) && /[a-z]/.test(val) && /\d/.test(val),
      { message: 'Le mot de passe doit contenir majuscule, minuscule et chiffre' }
    ),
  role: z.enum(['ADMINISTRATEUR', 'AGENT_SAISIE', 'VALIDATEUR', 'RESPONSABLE']),
  centerId: z.string().uuid().optional().nullable(),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  registrationNumber: z.string().regex(/^[A-Z]{2,4}-\d{4}-\d{3}$/, { message: 'Format matricule invalide' })
});

// Schéma mise à jour utilisateur
const updateUserSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  email: z.string().email().transform(val => val.toLowerCase()).optional(),
  password: z.string().min(8).max(128).optional(),
  role: z.enum(['ADMINISTRATEUR', 'AGENT_SAISIE', 'VALIDATEUR', 'RESPONSABLE']).optional(),
  centerId: z.string().uuid().optional().nullable(),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  registrationNumber: z.string().optional(),
  active: z.boolean().optional()
});

// UUID param schema
const idParamSchema = z.object({
  id: z.string().uuid({ message: 'Format UUID invalide' })
});

// Helper pour formater les erreurs Zod
function formatZodIssues(issues: ZodIssue[]): Array<{ field: string; message: string }> {
  return issues.map((issue: ZodIssue) => ({
    field: issue.path.join('.') || 'unknown',
    message: issue.message
  }));
}

// Middleware de validation générique
function validateBody<T>(schema: ZodSchema<T>) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      req.body = await schema.parseAsync(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = formatZodIssues(error.issues);
        logger.warn('Validation failed', {
          path: req.path,
          errors,
          requestId: (req as any).requestId
        });
        res.status(400).json({
          error: 'Données invalides',
          message: errors.length === 1 ? errors[0].message : `${errors.length} erreurs`,
          details: errors
        });
        return;
      }
      logger.error('Validation error', { error: (error as Error).message });
      res.status(500).json({ error: 'Erreur de validation' });
    }
  };
}

function validateParams<T>(schema: ZodSchema<T>) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await schema.parseAsync(req.params);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = formatZodIssues(error.issues);
        logger.warn('Params validation failed', {
          path: req.path,
          errors,
          requestId: (req as any).requestId
        });
        res.status(400).json({
          error: 'Paramètres invalides',
          details: errors
        });
        return;
      }
      res.status(500).json({ error: 'Erreur de validation' });
    }
  };
}

// ============================================
// CONFIGURATION SÉCURITÉ (SEC-002)
// ============================================

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_ALGORITHM = 'HS512' as const;
const JWT_EXPIRES_IN = 28800; // 8h en secondes
const BCRYPT_ROUNDS = 12;

logger.info('Starting Ndortel API Server...', {
  timestamp: new Date().toISOString(),
  nodeVersion: process.version,
  pid: process.pid
});

// Vérification JWT_SECRET en production
if (process.env.NODE_ENV === 'production' && !JWT_SECRET) {
  logger.error('FATAL: JWT_SECRET non défini en production');
  process.exit(1);
}

const effectiveSecret = JWT_SECRET || 'dev-secret-change-in-production';

logger.info('Security initialized', {
  environment: process.env.NODE_ENV || 'development',
  jwtSecretLoaded: !!JWT_SECRET,
  jwtAlgorithm: JWT_ALGORITHM,
  jwtExpiresIn: `${JWT_EXPIRES_IN}s`,
  bcryptRounds: BCRYPT_ROUNDS
});

// ============================================
// DATABASE CONNECTION
// ============================================

logger.info('Connecting to database...');

export const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'ndortel_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

// Exposer globalement
(global as any).dbPool = pool;

pool.on('connect', () => {
  logger.info('PostgreSQL connected', {
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'ndortel_db'
  });
});

pool.on('error', (err) => {
  logger.error('Database pool error', {
    errorMessage: err.message,
    errorStack: err.stack
  });
});

// ============================================
// EXPRESS APP
// ============================================

const app: Express = express();
const PORT = process.env.PORT || 5001;
const isProduction = process.env.NODE_ENV === 'production';

// ============================================
// MIDDLEWARES (ORDRE IMPORTANT)
// ============================================

// 1. Sécurité de base
app.use(helmet({ contentSecurityPolicy: isProduction }));

app.use(cors({
  origin: isProduction
    ? (process.env.FRONTEND_URL || 'https://ndortel.sn')
    : ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true
}));

// 2. LOGGING HTTP (ARCH-001) - Remplace Morgan
app.use(httpLoggerMiddleware);

// 3. Rate limiting avec logging
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Trop de requêtes' },
  handler: (req, res) => {
    logSecurityWarning('Rate limit exceeded', {
      ip: req.ip,
      path: req.path,
      requestId: (req as any).requestId
    });
    res.status(429).json({ error: 'Trop de requêtes' });
  }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Trop de tentatives de connexion' },
  skipSuccessfulRequests: true,
  handler: (req, res) => {
    audit({
      action: AuditAction.RATE_LIMIT_EXCEEDED,
      userId: null,
      ip: req.ip,
      success: false,
      reason: 'Too many login attempts',
      details: { email: req.body?.email }
    });
    res.status(429).json({ error: 'Trop de tentatives de connexion' });
  }
});

app.use('/api/', generalLimiter);
app.use('/api/auth/login', authLimiter);

// 4. Body parsing
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

logger.info('Middlewares configured', {
  rateLimit: true,
  cors: true,
  helmet: true,
  httpLogging: true
});

// ============================================
// AUTHENTICATION MIDDLEWARE
// ============================================

export interface AuthRequest extends Request {
  user?: {
    id: string;
    name: string;
    email: string;
    role: string;
    centerId?: string;
  };
  requestId: string;
}

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  const reqLogger = new RequestLogger(req.requestId);

  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      reqLogger.warn('Missing or invalid auth header');
      res.status(401).json({ error: 'Token manquant' });
      return;
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, effectiveSecret, {
      algorithms: [JWT_ALGORITHM]
    }) as any;

    const result = await pool.query(
      'SELECT id, name, email, role, center_id, active FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (result.rows.length === 0 || !result.rows[0].active) {
      reqLogger.warn('User not found or inactive', { userId: decoded.userId });

      audit({
        action: AuditAction.ACCESS_DENIED,
        userId: decoded.userId,
        success: false,
        reason: 'User not found or inactive',
        ip: req.ip
      });

      res.status(401).json({ error: 'Utilisateur non autorisé' });
      return;
    }

    req.user = {
      id: result.rows[0].id,
      name: result.rows[0].name,
      email: result.rows[0].email,
      role: result.rows[0].role,
      centerId: result.rows[0].center_id
    };

    next();
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      reqLogger.warn('Token expired');
      res.status(401).json({ error: 'Session expirée' });
      return;
    }
    reqLogger.warn('Invalid token', { error: error.message });
    res.status(401).json({ error: 'Token invalide' });
  }
};

export const authorizeRoles = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      audit({
        action: AuditAction.ACCESS_DENIED,
        userId: req.user?.id || null,
        success: false,
        reason: `Role ${req.user?.role} not in ${roles.join(', ')}`,
        ip: req.ip,
        details: { requiredRoles: roles, userRole: req.user?.role }
      });

      logger.warn('Access denied - insufficient role', {
        userId: req.user?.id,
        userRole: req.user?.role,
        requiredRoles: roles,
        path: req.path,
        requestId: req.requestId
      });

      res.status(403).json({ error: 'Accès refusé' });
      return;
    }
    next();
  };
};

// ============================================
// ROUTES STATIQUES (définies avant start())
// ============================================

// Health Check
app.get('/health', async (req: Request, res: Response) => {
  try {
    await pool.query('SELECT 1');
    res.json({
      status: 'healthy',
      database: 'connected',
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString(),
      version: '3.1.0',
      security: {
        jwtConfigured: !!JWT_SECRET,
        rateLimitEnabled: true,
        corsConfigured: true,
        inputValidation: true,
        loggingEnabled: true
      }
    });
  } catch (error) {
    logger.error('Health check failed', { error: (error as Error).message });
    res.status(503).json({ status: 'unhealthy', database: 'disconnected' });
  }
});

// ============================================
// AUTH ROUTES
// ============================================

// Login
app.post('/api/auth/login',
  validateBody(loginSchema),
  async (req: AuthRequest, res: Response) => {
    const reqLogger = new RequestLogger(req.requestId);
    const { email, password } = req.body;

    reqLogger.info('Login attempt', { email });

    try {
      const result = await pool.query(
        'SELECT * FROM users WHERE email = $1',
        [email]
      );

      if (result.rows.length === 0) {
        await bcrypt.compare(password, '$2b$12$dummy.hash.for.timing.attack');

        audit({
          action: AuditAction.LOGIN_FAILURE,
          userId: null,
          ip: req.ip,
          userAgent: req.headers['user-agent'],
          success: false,
          reason: 'User not found',
          details: { email }
        });

        reqLogger.warn('Login failed - user not found', { email });
        res.status(401).json({ error: 'Identifiants invalides' });
        return;
      }

      const user = result.rows[0];

      if (!user.active) {
        audit({
          action: AuditAction.LOGIN_FAILURE,
          userId: user.id,
          ip: req.ip,
          success: false,
          reason: 'Account disabled',
          details: { email }
        });

        reqLogger.warn('Login failed - account disabled', { userId: user.id, email });
        res.status(401).json({ error: 'Compte désactivé' });
        return;
      }

      const isValid = await bcrypt.compare(password, user.password_hash);
      if (!isValid) {
        audit({
          action: AuditAction.LOGIN_FAILURE,
          userId: user.id,
          ip: req.ip,
          userAgent: req.headers['user-agent'],
          success: false,
          reason: 'Invalid password',
          details: { email }
        });

        reqLogger.warn('Login failed - invalid password', { userId: user.id, email });
        res.status(401).json({ error: 'Identifiants invalides' });
        return;
      }

      const token = jwt.sign(
        { userId: user.id, email: user.email, role: user.role },
        effectiveSecret,
        { expiresIn: JWT_EXPIRES_IN, algorithm: JWT_ALGORITHM }
      );

      audit({
        action: AuditAction.LOGIN_SUCCESS,
        userId: user.id,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        success: true,
        details: { email, role: user.role }
      });

      authLogger.info('User logged in successfully', {
        userId: user.id,
        email,
        role: user.role,
        requestId: req.requestId
      });

      res.json({
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          centerId: user.center_id,
          registrationNumber: user.registration_number,
          birthDate: user.birth_date,
          active: user.active
        }
      });
    } catch (error) {
      reqLogger.error('Login error', error as Error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }
);

// Get Current User
app.get('/api/auth/me', authenticate, async (req: AuthRequest, res: Response) => {
  const reqLogger = new RequestLogger(req.requestId, req.user?.id);

  try {
    const result = await pool.query(
      'SELECT id, name, email, role, center_id, birth_date, registration_number, active FROM users WHERE id = $1',
      [req.user!.id]
    );

    if (result.rows.length === 0) {
      reqLogger.warn('User not found in /me');
      res.status(404).json({ error: 'Utilisateur non trouvé' });
      return;
    }

    const user = result.rows[0];
    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      centerId: user.center_id,
      birthDate: user.birth_date,
      registrationNumber: user.registration_number,
      active: user.active
    });
  } catch (error) {
    reqLogger.error('Get user error', error as Error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ============================================
// USERS ROUTES
// ============================================

app.get('/api/users', authenticate, authorizeRoles('ADMINISTRATEUR'), async (req: AuthRequest, res: Response) => {
  const reqLogger = new RequestLogger(req.requestId, req.user?.id);

  try {
    const result = await pool.query(
      'SELECT id, name, email, role, center_id, birth_date, registration_number, active, created_at FROM users ORDER BY created_at DESC'
    );

    reqLogger.debug('Users list retrieved', { count: result.rows.length });
    res.json(result.rows);
  } catch (error) {
    reqLogger.error('Get users error', error as Error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.post('/api/users',
  authenticate,
  authorizeRoles('ADMINISTRATEUR'),
  validateBody(createUserSchema),
  async (req: AuthRequest, res: Response) => {
    const reqLogger = new RequestLogger(req.requestId, req.user?.id);

    try {
      const { name, email, password, role, centerId, birthDate, registrationNumber } = req.body;

      reqLogger.info('Creating new user', { email, role });

      const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
      if (existing.rows.length > 0) {
        reqLogger.warn('User creation failed - email exists', { email });
        res.status(409).json({ error: 'Email déjà utilisé' });
        return;
      }

      const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

      const result = await pool.query(
        `INSERT INTO users (name, email, password_hash, role, center_id, birth_date, registration_number, active) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
         RETURNING id, name, email, role, center_id, birth_date, registration_number, active`,
        [name, email, passwordHash, role, centerId || null, birthDate, registrationNumber, true]
      );

      const newUser = result.rows[0];

      audit({
        action: AuditAction.USER_CREATE,
        userId: req.user!.id,
        targetId: newUser.id,
        targetType: 'user',
        success: true,
        details: { email: newUser.email, role: newUser.role }
      });

      logBusinessEvent('USER_CREATED', {
        userId: newUser.id,
        email: newUser.email,
        role: newUser.role,
        createdBy: req.user!.id
      });

      reqLogger.info('User created successfully', {
        newUserId: newUser.id,
        email: newUser.email
      });

      res.status(201).json(newUser);
    } catch (error) {
      reqLogger.error('Create user error', error as Error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }
);

app.put('/api/users/:id',
  authenticate,
  authorizeRoles('ADMINISTRATEUR'),
  validateParams(idParamSchema),
  validateBody(updateUserSchema),
  async (req: AuthRequest, res: Response) => {
    const reqLogger = new RequestLogger(req.requestId, req.user?.id);

    try {
      const { id } = req.params;
      const { name, email, role, centerId, birthDate, registrationNumber, active, password } = req.body;

      reqLogger.info('Updating user', { targetUserId: id });

      const updates: string[] = [];
      const values: any[] = [];
      let p = 1;

      if (name) { updates.push(`name = $${p++}`); values.push(name); }
      if (email) { updates.push(`email = $${p++}`); values.push(email); }
      if (role) { updates.push(`role = $${p++}`); values.push(role); }
      if (centerId !== undefined) { updates.push(`center_id = $${p++}`); values.push(centerId || null); }
      if (birthDate) { updates.push(`birth_date = $${p++}`); values.push(birthDate); }
      if (registrationNumber) { updates.push(`registration_number = $${p++}`); values.push(registrationNumber); }
      if (typeof active === 'boolean') { updates.push(`active = $${p++}`); values.push(active); }
      if (password) {
        updates.push(`password_hash = $${p++}`);
        values.push(await bcrypt.hash(password, BCRYPT_ROUNDS));
      }

      if (updates.length === 0) {
        reqLogger.warn('No updates provided');
        res.status(400).json({ error: 'Aucune modification' });
        return;
      }

      values.push(id);
      const result = await pool.query(
        `UPDATE users SET ${updates.join(', ')} WHERE id = $${p} RETURNING *`,
        values
      );

      if (result.rows.length === 0) {
        reqLogger.warn('User not found for update', { targetUserId: id });
        res.status(404).json({ error: 'Utilisateur non trouvé' });
        return;
      }

      audit({
        action: AuditAction.USER_UPDATE,
        userId: req.user!.id,
        targetId: id,
        targetType: 'user',
        success: true,
        details: { updatedFields: Object.keys(req.body) }
      });

      reqLogger.info('User updated successfully', {
        targetUserId: id,
        updatedFields: Object.keys(req.body)
      });

      res.json(result.rows[0]);
    } catch (error) {
      reqLogger.error('Update user error', error as Error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }
);

// ============================================
// LOAD EXTERNAL ROUTES (Fonction)
// ============================================

async function loadRoutes() {
  try {
    logger.info('Loading external routes...');

    const certificatesRouter = (await import('./routes/certificates.js')).default;
    const centersRouter = (await import('./routes/centers.js')).default;
    const notificationsRouter = (await import('./routes/notifications.js')).default;

    app.use('/api/certificates', certificatesRouter);
    app.use('/api/centers', centersRouter);
    app.use('/api/notifications', notificationsRouter);

    logger.info('External routes loaded: certificates, centers, notifications');

    // Charger AI router seulement s'il existe
    try {
      const aiRouter = (await import('./routes/ai.js')).default;
      app.use('/api/ai', aiRouter);
      logger.debug('AI routes loaded');
    } catch (e) {
      logger.warn('AI routes not loaded (optional)');
    }

  } catch (error) {
    logger.error('Error loading external routes', { error: (error as Error).message });
    throw error;
  }
}

// ============================================
// START SERVER
// ============================================

async function start() {
  try {
    // Test connexion DB
    await pool.query('SELECT NOW()');
    logger.info('Database connection verified');

    // ============================================
    // CHARGER LES ROUTES EXTERNES (DYNAMIQUES)
    // ============================================
    await loadRoutes();

    // ============================================
    // ROUTES CDP (COMP-002)
    // ============================================
    app.use('/api/cdp', createCDPRouter(pool));
    app.use('/api/admin/cdp',
      authenticate,
      authorizeRoles('ADMINISTRATEUR'),
      createCDPAdminRouter(pool)
    );
    logger.info('CDP routes loaded');

    // ============================================
    // ERROR HANDLERS (TOUJOURS EN DERNIER)
    // ============================================

    // Middleware de logging des erreurs
    app.use(errorLoggerMiddleware);

    // Handler d'erreur final
    app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
      res.status(500).json({
        error: isProduction ? 'Erreur serveur' : err.message,
        requestId: (req as any).requestId
      });
    });

    // 404 handler - ABSOLUMENT EN DERNIER
    app.use((req: Request, res: Response) => {
      logger.debug('Route not found', { path: req.path, method: req.method });
      res.status(404).json({ error: 'Endpoint non trouvé' });
    });

    // ============================================
    // DÉMARRER LE SERVEUR
    // ============================================
    app.listen(PORT, () => {
      logger.info('Ndortel API Server started', {
        port: PORT,
        environment: process.env.NODE_ENV || 'development',
        healthEndpoint: `http://localhost:${PORT}/health`,
        securityMode: isProduction ? 'PRODUCTION' : 'Development',
        loggingEnabled: true,
        version: '3.1.0'
      });

      if (!isProduction) {
        console.log('\n' + '═'.repeat(50));
        console.log('🚀 Ndortel API Server running');
        console.log('═'.repeat(50));
        console.log(`   📍 Port: ${PORT}`);
        console.log(`   🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
        console.log(`   🔗 Health: http://localhost:${PORT}/health`);
        console.log(`   📊 Logs: ./logs/`);
        console.log(`   ✅ Winston Logging: Enabled`);
        console.log(`   ✅ CDP Compliance: Enabled`);
        console.log('═'.repeat(50) + '\n');
      }
    });
  } catch (error) {
    logger.error('Failed to start server', { error: (error as Error).message });
    process.exit(1);
  }
}

// Lancer le serveur
start();

// ============================================
// GRACEFUL SHUTDOWN
// ============================================

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  await pool.end();
  logger.info('Database pool closed');
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully...');
  await pool.end();
  logger.info('Database pool closed');
  process.exit(0);
});

// Capture des erreurs non gérées
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', {
    errorMessage: error.message,
    errorStack: error.stack
  });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', {
    reason: String(reason),
    promise: String(promise)
  });
});

export default app;