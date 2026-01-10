// ============================================
// COMP-002 — GUIDE D'IMPLÉMENTATION TECHNIQUE
// Conformité CDP (Commission des Données Personnelles)
// ============================================

/**
 * Ce fichier contient les APIs et utilitaires à implémenter
 * pour la conformité avec la Loi n° 2008-12 du 25 janvier 2008
 */

import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import logger from '../config/logger.js';
import { audit, AuditAction } from '../utils/logger.utils.js';

// ============================================
// TYPES ET INTERFACES
// ============================================

/**
 * Types de demandes de droits des personnes concernées
 */
export enum DataSubjectRequestType {
    ACCESS = 'ACCESS',           // Article 62 - Droit d'accès
    RECTIFICATION = 'RECTIFICATION', // Article 68 - Droit de rectification
    OPPOSITION = 'OPPOSITION',   // Article 69 - Droit d'opposition
    INFORMATION = 'INFORMATION', // Demande d'information générale
}

/**
 * Statut d'une demande
 */
export enum RequestStatus {
    PENDING = 'PENDING',
    IN_PROGRESS = 'IN_PROGRESS',
    COMPLETED = 'COMPLETED',
    REJECTED = 'REJECTED',
}

/**
 * Structure d'une demande de droits
 */
export interface DataSubjectRequest {
    id: string;
    type: DataSubjectRequestType;
    status: RequestStatus;
    requesterName: string;
    requesterEmail: string;
    requesterIdDocument: string; // Référence au document d'identité
    requestDate: Date;
    responseDate?: Date;
    responseContent?: string;
    processedBy?: string;
    relatedDataIds?: string[]; // IDs des données concernées
}

/**
 * Consentement explicite (pour traitements non obligatoires)
 */
export interface Consent {
    id: string;
    userId: string;
    purpose: string;
    granted: boolean;
    grantedAt?: Date;
    revokedAt?: Date;
    ipAddress?: string;
    userAgent?: string;
}

// ============================================
// SCHÉMA SQL À AJOUTER
// ============================================

export const CDP_COMPLIANCE_SCHEMA = `
-- Table des demandes de droits des personnes concernées
CREATE TABLE IF NOT EXISTS data_subject_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(20) NOT NULL CHECK (type IN ('ACCESS', 'RECTIFICATION', 'OPPOSITION', 'INFORMATION')),
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'REJECTED')),
  requester_name VARCHAR(255) NOT NULL,
  requester_email VARCHAR(255) NOT NULL,
  requester_id_document VARCHAR(255), -- Référence au document d'identité stocké
  request_details TEXT,
  request_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  response_date TIMESTAMP WITH TIME ZONE,
  response_content TEXT,
  processed_by UUID REFERENCES users(id),
  related_data_ids TEXT[], -- Array des IDs de données concernées
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table des consentements (pour traitements optionnels)
CREATE TABLE IF NOT EXISTS consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_identifier VARCHAR(255) NOT NULL, -- Email ou autre identifiant
  purpose VARCHAR(100) NOT NULL, -- 'STATISTICS', 'NEWSLETTER', etc.
  granted BOOLEAN NOT NULL DEFAULT FALSE,
  granted_at TIMESTAMP WITH TIME ZONE,
  revoked_at TIMESTAMP WITH TIME ZONE,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_identifier, purpose)
);

-- Table de l'historique des accès aux données personnelles
CREATE TABLE IF NOT EXISTS personal_data_access_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  data_subject_id VARCHAR(255), -- ID de la personne concernée
  data_type VARCHAR(100) NOT NULL, -- 'CERTIFICATE', 'USER_PROFILE', etc.
  data_id UUID NOT NULL, -- ID de l'enregistrement accédé
  action VARCHAR(50) NOT NULL, -- 'VIEW', 'EXPORT', 'PRINT', 'MODIFY'
  accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT,
  justification TEXT -- Motif de l'accès (obligatoire pour certaines données)
);

-- Index pour les recherches
CREATE INDEX IF NOT EXISTS idx_dsr_status ON data_subject_requests(status);
CREATE INDEX IF NOT EXISTS idx_dsr_type ON data_subject_requests(type);
CREATE INDEX IF NOT EXISTS idx_dsr_email ON data_subject_requests(requester_email);
CREATE INDEX IF NOT EXISTS idx_consents_user ON consents(user_identifier);
CREATE INDEX IF NOT EXISTS idx_pda_log_user ON personal_data_access_log(user_id);
CREATE INDEX IF NOT EXISTS idx_pda_log_subject ON personal_data_access_log(data_subject_id);
CREATE INDEX IF NOT EXISTS idx_pda_log_date ON personal_data_access_log(accessed_at);

-- Vue pour le rapport d'activité CDP
CREATE OR REPLACE VIEW cdp_activity_report AS
SELECT 
  DATE_TRUNC('month', request_date) as month,
  type,
  status,
  COUNT(*) as count,
  AVG(EXTRACT(EPOCH FROM (response_date - request_date))/86400)::numeric(10,2) as avg_response_days
FROM data_subject_requests
GROUP BY DATE_TRUNC('month', request_date), type, status
ORDER BY month DESC;
`;

// ============================================
// SERVICE DE GESTION DES DEMANDES
// ============================================

export class DataSubjectRequestService {
    constructor(private pool: Pool) { }

    /**
     * Créer une nouvelle demande de droits
     */
    async createRequest(data: {
        type: DataSubjectRequestType;
        requesterName: string;
        requesterEmail: string;
        requesterIdDocument?: string;
        requestDetails?: string;
    }): Promise<DataSubjectRequest> {
        const result = await this.pool.query(
            `INSERT INTO data_subject_requests 
       (type, requester_name, requester_email, requester_id_document, request_details)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
            [data.type, data.requesterName, data.requesterEmail, data.requesterIdDocument, data.requestDetails]
        );

        logger.info('Data subject request created', {
            requestId: result.rows[0].id,
            type: data.type,
            email: data.requesterEmail
        });

        // TODO: Envoyer email de confirmation au demandeur
        // await this.sendConfirmationEmail(result.rows[0]);

        return this.mapToRequest(result.rows[0]);
    }

    /**
     * Traiter une demande d'accès (Article 62)
     */
    async processAccessRequest(
        requestId: string,
        processedBy: string
    ): Promise<{ request: DataSubjectRequest; data: any }> {
        // 1. Récupérer la demande
        const request = await this.getRequestById(requestId);
        if (!request) {
            throw new Error('Demande non trouvée');
        }

        // 2. Mettre à jour le statut
        await this.pool.query(
            `UPDATE data_subject_requests SET status = 'IN_PROGRESS', updated_at = NOW() WHERE id = $1`,
            [requestId]
        );

        // 3. Collecter toutes les données de la personne
        const personalData = await this.collectPersonalData(request.requesterEmail);

        // 4. Générer le rapport
        const report = this.generateAccessReport(personalData);

        // 5. Mettre à jour la demande comme complétée
        await this.pool.query(
            `UPDATE data_subject_requests 
       SET status = 'COMPLETED', 
           response_date = NOW(),
           response_content = $1,
           processed_by = $2,
           updated_at = NOW()
       WHERE id = $3`,
            [JSON.stringify(report), processedBy, requestId]
        );

        // 6. Audit
        audit({
            action: AuditAction.ACCESS_GRANTED,
            userId: processedBy,
            targetId: requestId,
            targetType: 'data_subject_request',
            success: true,
            details: { type: 'ACCESS', email: request.requesterEmail }
        });

        return { request, data: report };
    }

    /**
     * Traiter une demande de rectification (Article 68)
     */
    async processRectificationRequest(
        requestId: string,
        processedBy: string,
        corrections: Record<string, any>
    ): Promise<DataSubjectRequest> {
        const request = await this.getRequestById(requestId);
        if (!request) {
            throw new Error('Demande non trouvée');
        }

        // Appliquer les corrections selon le type de données
        // Note: Implémentation spécifique selon les tables concernées

        await this.pool.query(
            `UPDATE data_subject_requests 
       SET status = 'COMPLETED',
           response_date = NOW(),
           response_content = $1,
           processed_by = $2,
           updated_at = NOW()
       WHERE id = $3`,
            [JSON.stringify({ corrections, appliedAt: new Date() }), processedBy, requestId]
        );

        audit({
            action: AuditAction.DATA_RECTIFIED,
            userId: processedBy,
            targetId: requestId,
            targetType: 'data_subject_request',
            success: true,
            details: { corrections }
        });

        return this.getRequestById(requestId) as Promise<DataSubjectRequest>;
    }

    /**
     * Collecter toutes les données personnelles d'une personne
     */
    private async collectPersonalData(email: string): Promise<any> {
        const data: any = {
            collectedAt: new Date(),
            categories: {}
        };

        // 1. Données utilisateur (si c'est un utilisateur du système)
        const userResult = await this.pool.query(
            `SELECT id, name, email, role, birth_date, registration_number, created_at, active
       FROM users WHERE email = $1`,
            [email]
        );
        if (userResult.rows.length > 0) {
            data.categories.userAccount = userResult.rows[0];
        }

        // 2. Certificats où la personne est impliquée
        const certificatesResult = await this.pool.query(
            `SELECT c.id, c.type, c.status, c.child_last_name, c.child_first_name,
              c.declaration_date, c.created_at
       FROM certificates c
       WHERE c.declarant_email = $1
          OR c.mother_email = $1
          OR c.father_email = $1`,
            [email]
        );
        if (certificatesResult.rows.length > 0) {
            data.categories.certificates = certificatesResult.rows;
        }

        // 3. Logs d'accès aux données
        const accessLogsResult = await this.pool.query(
            `SELECT data_type, action, accessed_at
       FROM personal_data_access_log
       WHERE data_subject_id = $1
       ORDER BY accessed_at DESC
       LIMIT 100`,
            [email]
        );
        if (accessLogsResult.rows.length > 0) {
            data.categories.accessLogs = accessLogsResult.rows;
        }

        // 4. Consentements
        const consentsResult = await this.pool.query(
            `SELECT purpose, granted, granted_at, revoked_at
       FROM consents
       WHERE user_identifier = $1`,
            [email]
        );
        if (consentsResult.rows.length > 0) {
            data.categories.consents = consentsResult.rows;
        }

        return data;
    }

    /**
     * Générer un rapport d'accès formaté
     */
    private generateAccessReport(data: any): any {
        return {
            generatedAt: new Date().toISOString(),
            legalBasis: 'Article 62 - Loi n° 2008-12 du 25 janvier 2008',
            responsibleEntity: '[Nom de l\'organisme]',
            dpoContact: 'dpo@ndortel.sn',
            dataCategories: Object.keys(data.categories),
            data: data.categories,
            retentionPolicies: {
                userAccount: 'Durée de la fonction + 5 ans',
                certificates: 'Conservation permanente (obligation légale)',
                accessLogs: '1 an',
                consents: '5 ans après révocation'
            },
            rights: {
                rectification: 'Vous pouvez demander la rectification de données inexactes',
                opposition: 'Vous pouvez vous opposer au traitement pour motifs légitimes',
                note: 'Le droit à l\'effacement ne s\'applique pas aux actes d\'état civil (obligation légale)'
            }
        };
    }

    async getRequestById(id: string): Promise<DataSubjectRequest | null> {
        const result = await this.pool.query(
            'SELECT * FROM data_subject_requests WHERE id = $1',
            [id]
        );
        return result.rows.length > 0 ? this.mapToRequest(result.rows[0]) : null;
    }

    async listRequests(filters?: {
        status?: RequestStatus;
        type?: DataSubjectRequestType;
        limit?: number;
        offset?: number;
    }): Promise<DataSubjectRequest[]> {
        let query = 'SELECT * FROM data_subject_requests WHERE 1=1';
        const params: any[] = [];
        let paramIndex = 1;

        if (filters?.status) {
            query += ` AND status = $${paramIndex++}`;
            params.push(filters.status);
        }
        if (filters?.type) {
            query += ` AND type = $${paramIndex++}`;
            params.push(filters.type);
        }

        query += ` ORDER BY request_date DESC`;

        if (filters?.limit) {
            query += ` LIMIT $${paramIndex++}`;
            params.push(filters.limit);
        }
        if (filters?.offset) {
            query += ` OFFSET $${paramIndex++}`;
            params.push(filters.offset);
        }

        const result = await this.pool.query(query, params);
        return result.rows.map(this.mapToRequest);
    }

    private mapToRequest(row: any): DataSubjectRequest {
        return {
            id: row.id,
            type: row.type,
            status: row.status,
            requesterName: row.requester_name,
            requesterEmail: row.requester_email,
            requesterIdDocument: row.requester_id_document,
            requestDate: row.request_date,
            responseDate: row.response_date,
            responseContent: row.response_content,
            processedBy: row.processed_by,
            relatedDataIds: row.related_data_ids
        };
    }
}

// ============================================
// SERVICE DE GESTION DES CONSENTEMENTS
// ============================================

export class ConsentService {
    constructor(private pool: Pool) { }

    /**
     * Enregistrer un consentement
     */
    async grantConsent(data: {
        userIdentifier: string;
        purpose: string;
        ipAddress?: string;
        userAgent?: string;
    }): Promise<Consent> {
        const result = await this.pool.query(
            `INSERT INTO consents (user_identifier, purpose, granted, granted_at, ip_address, user_agent)
       VALUES ($1, $2, TRUE, NOW(), $3, $4)
       ON CONFLICT (user_identifier, purpose) 
       DO UPDATE SET granted = TRUE, granted_at = NOW(), revoked_at = NULL, 
                     ip_address = $3, user_agent = $4, updated_at = NOW()
       RETURNING *`,
            [data.userIdentifier, data.purpose, data.ipAddress, data.userAgent]
        );

        logger.info('Consent granted', {
            userIdentifier: data.userIdentifier,
            purpose: data.purpose
        });

        return this.mapToConsent(result.rows[0]);
    }

    /**
     * Révoquer un consentement
     */
    async revokeConsent(userIdentifier: string, purpose: string): Promise<Consent | null> {
        const result = await this.pool.query(
            `UPDATE consents 
       SET granted = FALSE, revoked_at = NOW(), updated_at = NOW()
       WHERE user_identifier = $1 AND purpose = $2
       RETURNING *`,
            [userIdentifier, purpose]
        );

        if (result.rows.length > 0) {
            logger.info('Consent revoked', { userIdentifier, purpose });
            return this.mapToConsent(result.rows[0]);
        }
        return null;
    }

    /**
     * Vérifier si un consentement est actif
     */
    async hasConsent(userIdentifier: string, purpose: string): Promise<boolean> {
        const result = await this.pool.query(
            `SELECT granted FROM consents 
       WHERE user_identifier = $1 AND purpose = $2 AND granted = TRUE`,
            [userIdentifier, purpose]
        );
        return result.rows.length > 0;
    }

    /**
     * Lister tous les consentements d'un utilisateur
     */
    async listUserConsents(userIdentifier: string): Promise<Consent[]> {
        const result = await this.pool.query(
            'SELECT * FROM consents WHERE user_identifier = $1 ORDER BY purpose',
            [userIdentifier]
        );
        return result.rows.map(this.mapToConsent);
    }

    private mapToConsent(row: any): Consent {
        return {
            id: row.id,
            userId: row.user_identifier,
            purpose: row.purpose,
            granted: row.granted,
            grantedAt: row.granted_at,
            revokedAt: row.revoked_at,
            ipAddress: row.ip_address,
            userAgent: row.user_agent
        };
    }
}

// ============================================
// SERVICE DE JOURNALISATION DES ACCÈS
// ============================================

export class PersonalDataAccessLogger {
    constructor(private pool: Pool) { }

    /**
     * Enregistrer un accès aux données personnelles
     */
    async logAccess(data: {
        userId: string;
        dataSubjectId: string;
        dataType: string;
        dataId: string;
        action: 'VIEW' | 'EXPORT' | 'PRINT' | 'MODIFY';
        ipAddress?: string;
        userAgent?: string;
        justification?: string;
    }): Promise<void> {
        await this.pool.query(
            `INSERT INTO personal_data_access_log 
       (user_id, data_subject_id, data_type, data_id, action, ip_address, user_agent, justification)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [data.userId, data.dataSubjectId, data.dataType, data.dataId,
            data.action, data.ipAddress, data.userAgent, data.justification]
        );
    }

    /**
     * Obtenir l'historique des accès pour une personne concernée
     */
    async getAccessHistory(dataSubjectId: string, limit = 100): Promise<any[]> {
        const result = await this.pool.query(
            `SELECT pda.*, u.name as user_name, u.email as user_email
       FROM personal_data_access_log pda
       LEFT JOIN users u ON pda.user_id = u.id
       WHERE pda.data_subject_id = $1
       ORDER BY pda.accessed_at DESC
       LIMIT $2`,
            [dataSubjectId, limit]
        );
        return result.rows;
    }

    /**
     * Statistiques d'accès pour le rapport CDP
     */
    async getAccessStatistics(startDate: Date, endDate: Date): Promise<any> {
        const result = await this.pool.query(
            `SELECT 
         data_type,
         action,
         COUNT(*) as count,
         COUNT(DISTINCT user_id) as unique_users,
         COUNT(DISTINCT data_subject_id) as unique_subjects
       FROM personal_data_access_log
       WHERE accessed_at BETWEEN $1 AND $2
       GROUP BY data_type, action
       ORDER BY count DESC`,
            [startDate, endDate]
        );
        return result.rows;
    }
}

// ============================================
// ROUTES API CDP
// ============================================

export function createCDPRouter(pool: Pool): Router {
    const router = Router();
    const dsrService = new DataSubjectRequestService(pool);
    const consentService = new ConsentService(pool);

    /**
     * POST /api/cdp/requests
     * Créer une demande de droits (accès public)
     */
    router.post('/requests', async (req: Request, res: Response) => {
        try {
            const { type, name, email, idDocument, details } = req.body;

            if (!type || !name || !email) {
                res.status(400).json({ error: 'Type, nom et email requis' });
                return;
            }

            const request = await dsrService.createRequest({
                type,
                requesterName: name,
                requesterEmail: email,
                requesterIdDocument: idDocument,
                requestDetails: details
            });

            res.status(201).json({
                message: 'Votre demande a été enregistrée. Vous recevrez une réponse dans un délai d\'un mois.',
                requestId: request.id,
                status: request.status
            });
        } catch (error) {
            logger.error('Error creating DSR', { error: (error as Error).message });
            res.status(500).json({ error: 'Erreur lors de la création de la demande' });
        }
    });

    /**
     * GET /api/cdp/requests/:id
     * Consulter le statut d'une demande (avec l'email comme vérification)
     */
    router.get('/requests/:id', async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            const { email } = req.query;

            const request = await dsrService.getRequestById(id);

            if (!request) {
                res.status(404).json({ error: 'Demande non trouvée' });
                return;
            }

            // Vérifier que l'email correspond
            if (request.requesterEmail !== email) {
                res.status(403).json({ error: 'Accès non autorisé' });
                return;
            }

            res.json({
                id: request.id,
                type: request.type,
                status: request.status,
                requestDate: request.requestDate,
                responseDate: request.responseDate
            });
        } catch (error) {
            logger.error('Error fetching DSR', { error: (error as Error).message });
            res.status(500).json({ error: 'Erreur serveur' });
        }
    });

    /**
     * POST /api/cdp/consents
     * Enregistrer un consentement
     */
    router.post('/consents', async (req: Request, res: Response) => {
        try {
            const { email, purpose, granted } = req.body;

            if (!email || !purpose) {
                res.status(400).json({ error: 'Email et finalité requis' });
                return;
            }

            let consent;
            if (granted) {
                consent = await consentService.grantConsent({
                    userIdentifier: email,
                    purpose,
                    ipAddress: req.ip,
                    userAgent: req.headers['user-agent']
                });
            } else {
                consent = await consentService.revokeConsent(email, purpose);
            }

            res.json({
                message: granted ? 'Consentement enregistré' : 'Consentement retiré',
                consent
            });
        } catch (error) {
            logger.error('Error managing consent', { error: (error as Error).message });
            res.status(500).json({ error: 'Erreur serveur' });
        }
    });

    /**
     * GET /api/cdp/consents
     * Lister les consentements d'un utilisateur
     */
    router.get('/consents', async (req: Request, res: Response) => {
        try {
            const { email } = req.query;

            if (!email) {
                res.status(400).json({ error: 'Email requis' });
                return;
            }

            const consents = await consentService.listUserConsents(email as string);
            res.json(consents);
        } catch (error) {
            logger.error('Error fetching consents', { error: (error as Error).message });
            res.status(500).json({ error: 'Erreur serveur' });
        }
    });

    return router;
}

// ============================================
// ROUTES ADMIN CDP (protégées)
// ============================================

export function createCDPAdminRouter(pool: Pool): Router {
    const router = Router();
    const dsrService = new DataSubjectRequestService(pool);
    const accessLogger = new PersonalDataAccessLogger(pool);

    /**
     * GET /api/admin/cdp/requests
     * Lister toutes les demandes (admin/DPO)
     */
    router.get('/requests', async (req: Request, res: Response) => {
        try {
            const { status, type, limit, offset } = req.query;

            const requests = await dsrService.listRequests({
                status: status as RequestStatus,
                type: type as DataSubjectRequestType,
                limit: limit ? parseInt(limit as string) : 50,
                offset: offset ? parseInt(offset as string) : 0
            });

            res.json(requests);
        } catch (error) {
            logger.error('Error listing DSRs', { error: (error as Error).message });
            res.status(500).json({ error: 'Erreur serveur' });
        }
    });

    /**
     * POST /api/admin/cdp/requests/:id/process
     * Traiter une demande
     */
    router.post('/requests/:id/process', async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            const userId = (req as any).user?.id;

            const request = await dsrService.getRequestById(id);
            if (!request) {
                res.status(404).json({ error: 'Demande non trouvée' });
                return;
            }

            let result;
            switch (request.type) {
                case DataSubjectRequestType.ACCESS:
                    result = await dsrService.processAccessRequest(id, userId);
                    break;
                case DataSubjectRequestType.RECTIFICATION:
                    result = await dsrService.processRectificationRequest(id, userId, req.body.corrections);
                    break;
                default:
                    res.status(400).json({ error: 'Type de demande non supporté' });
                    return;
            }

            res.json(result);
        } catch (error) {
            logger.error('Error processing DSR', { error: (error as Error).message });
            res.status(500).json({ error: 'Erreur serveur' });
        }
    });

    /**
     * GET /api/admin/cdp/statistics
     * Statistiques pour le rapport CDP annuel
     */
    router.get('/statistics', async (req: Request, res: Response) => {
        try {
            const { startDate, endDate } = req.query;

            const start = startDate ? new Date(startDate as string) : new Date(new Date().getFullYear(), 0, 1);
            const end = endDate ? new Date(endDate as string) : new Date();

            // Statistiques des demandes
            const requestStats = await pool.query(
                `SELECT type, status, COUNT(*) as count
         FROM data_subject_requests
         WHERE request_date BETWEEN $1 AND $2
         GROUP BY type, status`,
                [start, end]
            );

            // Statistiques des accès
            const accessStats = await accessLogger.getAccessStatistics(start, end);

            // Temps de réponse moyen
            const responseTime = await pool.query(
                `SELECT 
           AVG(EXTRACT(EPOCH FROM (response_date - request_date))/86400)::numeric(10,2) as avg_days,
           MAX(EXTRACT(EPOCH FROM (response_date - request_date))/86400)::numeric(10,2) as max_days
         FROM data_subject_requests
         WHERE response_date IS NOT NULL AND request_date BETWEEN $1 AND $2`,
                [start, end]
            );

            res.json({
                period: { start, end },
                requests: requestStats.rows,
                accessStatistics: accessStats,
                responseTime: responseTime.rows[0],
                complianceStatus: {
                    allRequestsUnder30Days: parseFloat(responseTime.rows[0]?.max_days || '0') <= 30,
                    dpoDesignated: true, // À vérifier
                    registryUpdated: true // À vérifier
                }
            });
        } catch (error) {
            logger.error('Error generating CDP stats', { error: (error as Error).message });
            res.status(500).json({ error: 'Erreur serveur' });
        }
    });

    return router;
}

// ============================================
// EXPORT
// ============================================

export default {
    CDP_COMPLIANCE_SCHEMA,
    DataSubjectRequestService,
    ConsentService,
    PersonalDataAccessLogger,
    createCDPRouter,
    createCDPAdminRouter,
    DataSubjectRequestType,
    RequestStatus
};