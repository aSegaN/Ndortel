// ============================================
// FICHIER: app.integration.example.ts
// CHEMIN COMPLET: server/src/app.integration.example.ts
// DESCRIPTION: Exemple d'intégration du logging dans Express
// VERSION: 1.0.0 - ARCH-001
// ============================================

import express, { Express, Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';

// Import du système de logging
import logger from './config/logger.js';
import { httpLoggerMiddleware, errorLoggerMiddleware } from './middleware/httpLogger.middleware.js';
import {
    audit,
    AuditAction,
    authLogger,
    certificateLogger,
    logBusinessEvent,
    RequestLogger
} from './utils/logger.utils.js';

// ============================================
// CONFIGURATION EXPRESS AVEC LOGGING
// ============================================

export function createApp(): Express {
    const app = express();

    // ============================================
    // MIDDLEWARES DE BASE
    // ============================================

    // Sécurité
    app.use(helmet());
    app.use(cors({
        origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:5173'],
        credentials: true,
    }));

    // Parsing
    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true }));
    app.use(compression());

    // ============================================
    // MIDDLEWARE DE LOGGING HTTP (PREMIER)
    // ============================================
    app.use(httpLoggerMiddleware);

    // ============================================
    // ROUTES
    // ============================================

    // Health check (exclu du logging détaillé)
    app.get('/health', (req, res) => {
        res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });

    // Exemple: Route de login avec logging d'audit
    app.post('/api/auth/login', async (req: Request, res: Response) => {
        const reqLogger = new RequestLogger(req.requestId);

        try {
            const { email, password } = req.body;

            reqLogger.info('Login attempt', { email });

            // Simuler la vérification (remplacer par votre AuthService)
            const user = await mockAuthService.login(email, password);

            if (user) {
                // Audit: connexion réussie
                audit({
                    action: AuditAction.LOGIN_SUCCESS,
                    userId: user.id,
                    ip: req.ip,
                    userAgent: req.headers['user-agent'],
                    success: true,
                    details: { email },
                });

                authLogger.info(`User logged in: ${email}`, { userId: user.id });

                res.json({ success: true, user, token: 'jwt-token' });
            } else {
                // Audit: échec de connexion
                audit({
                    action: AuditAction.LOGIN_FAILURE,
                    userId: null,
                    ip: req.ip,
                    userAgent: req.headers['user-agent'],
                    success: false,
                    reason: 'Invalid credentials',
                    details: { email },
                });

                authLogger.warn(`Failed login attempt: ${email}`, { ip: req.ip });

                res.status(401).json({ success: false, error: 'Invalid credentials' });
            }
        } catch (error) {
            reqLogger.error('Login error', error as Error);
            res.status(500).json({ success: false, error: 'Internal error' });
        }
    });

    // Exemple: Route de création de certificat avec logging
    app.post('/api/certificates', async (req: Request, res: Response) => {
        const reqLogger = new RequestLogger(req.requestId, (req as any).user?.id);

        try {
            reqLogger.info('Creating new certificate', { type: req.body.type });

            const startTime = Date.now();

            // Simuler la création (remplacer par votre service)
            const certificate = await mockCertificateService.create(req.body);

            const duration = Date.now() - startTime;

            // Log métier
            logBusinessEvent('CERTIFICATE_CREATED', {
                certificateId: certificate.id,
                type: certificate.type,
                duration,
            });

            // Audit
            audit({
                action: AuditAction.CERTIFICATE_CREATE,
                userId: (req as any).user?.id,
                targetId: certificate.id,
                targetType: 'certificate',
                success: true,
                details: { type: certificate.type },
            });

            certificateLogger.info(`Certificate created: ${certificate.id}`, {
                type: certificate.type,
                duration,
            });

            res.status(201).json({ success: true, certificate });
        } catch (error) {
            reqLogger.error('Certificate creation failed', error as Error);

            audit({
                action: AuditAction.CERTIFICATE_CREATE,
                userId: (req as any).user?.id,
                success: false,
                reason: (error as Error).message,
            });

            res.status(500).json({ success: false, error: 'Creation failed' });
        }
    });

    // ============================================
    // MIDDLEWARE D'ERREUR (DERNIER)
    // ============================================
    app.use(errorLoggerMiddleware);

    // Handler d'erreur final
    app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
        res.status(500).json({
            success: false,
            error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error',
            requestId: req.requestId,
        });
    });

    return app;
}

// ============================================
// DÉMARRAGE AVEC LOGGING
// ============================================

export async function startServer(): Promise<void> {
    const app = createApp();
    const port = process.env.PORT || 3000;

    // Log de démarrage
    logger.info('Starting NDORTEL API server...', {
        nodeVersion: process.version,
        environment: process.env.NODE_ENV,
        port,
    });

    app.listen(port, () => {
        logger.info(`Server running on port ${port}`, {
            port,
            environment: process.env.NODE_ENV,
            pid: process.pid,
        });
    });

    // Gestion de l'arrêt gracieux
    process.on('SIGTERM', () => {
        logger.info('SIGTERM received, shutting down gracefully...');
        process.exit(0);
    });

    process.on('SIGINT', () => {
        logger.info('SIGINT received, shutting down gracefully...');
        process.exit(0);
    });
}

// ============================================
// MOCKS POUR L'EXEMPLE
// ============================================

const mockAuthService = {
    async login(email: string, password: string) {
        if (email === 'admin@ndortel.sn' && password === 'password') {
            return { id: 'user-123', email, role: 'admin' };
        }
        return null;
    },
};

const mockCertificateService = {
    async create(data: any) {
        return { id: 'cert-' + Date.now(), type: data.type, ...data };
    },
};