// ============================================
// FICHIER: server/src/routes/certificates.ts
// VERSION: 2.0.0 - SEC-003 Validation Zod
// ============================================
// Cette route gère les actes de naissance
// Validation stricte pour prévenir:
// - Injection SQL
// - XSS stocké
// - Données malformées
// - Manipulation de NIN
// ============================================

import { Router, Response } from 'express';
import { validateBody, validateParams, validateQuery } from '../middleware/validate';
import { 
  createCertificateSchema, 
  updateCertificateSchema,
  signCertificateSchema,
  idParamSchema,
  searchSchema,
  paginationSchema
} from '../validation/schemas';

const router = Router();

// ============================================
// HELPERS - Accès DB et Auth
// ============================================

function getPool() {
  const pool = (global as any).dbPool;
  if (!pool) throw new Error('Database pool not initialized');
  return pool;
}

// Types
interface AuthRequest extends Request {
  user?: {
    id: string;
    name: string;
    email: string;
    role: string;
    centerId?: string;
  };
}

// Middleware d'authentification local
import jwt, { Algorithm } from 'jsonwebtoken';

function getJwtSecret(): string {
  return process.env.JWT_SECRET || '';
}

function getJwtAlgorithm(): Algorithm {
  return 'HS512';
}

const authenticate = async (req: any, res: Response, next: Function) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token manquant' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, getJwtSecret(), {
      algorithms: [getJwtAlgorithm()]
    }) as any;

    const pool = getPool();
    const result = await pool.query(
      'SELECT id, name, email, role, center_id, active FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (result.rows.length === 0 || !result.rows[0].active) {
      return res.status(401).json({ error: 'Utilisateur non autorisé' });
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
      return res.status(401).json({ error: 'Session expirée' });
    }
    return res.status(401).json({ error: 'Token invalide' });
  }
};

const authorizeRoles = (...roles: string[]) => {
  return (req: any, res: Response, next: Function) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Accès refusé' });
    }
    next();
  };
};

// ============================================
// GÉNÉRATION NUMÉRO D'ENREGISTREMENT
// ============================================

async function generateRegistrationNumber(centerId: string): Promise<string> {
  const pool = getPool();
  const year = new Date().getFullYear();
  
  // Récupérer le code du centre
  const centerResult = await pool.query('SELECT code FROM centers WHERE id = $1', [centerId]);
  if (centerResult.rows.length === 0) {
    throw new Error('Centre introuvable');
  }
  const centerCode = centerResult.rows[0].code;

  // Compter les actes de l'année pour ce centre
  const countResult = await pool.query(
    `SELECT COUNT(*) FROM birth_certificates 
     WHERE center_id = $1 AND registration_year = $2`,
    [centerId, year]
  );
  
  const count = parseInt(countResult.rows[0].count) + 1;
  const paddedCount = count.toString().padStart(5, '0');
  
  return `${year}-${centerCode}-${paddedCount}`;
}

// ============================================
// CRÉATION LOG D'AUDIT
// ============================================

async function createAuditLog(
  certificateId: string, 
  action: string, 
  performedBy: string, 
  details?: string
): Promise<void> {
  const pool = getPool();
  const crypto = await import('crypto');
  
  // Récupérer le dernier hash
  const lastLog = await pool.query(
    'SELECT hash FROM audit_logs WHERE certificate_id = $1 ORDER BY timestamp DESC LIMIT 1',
    [certificateId]
  );
  
  const previousHash = lastLog.rows.length > 0 ? lastLog.rows[0].hash : '0';
  
  // Créer le hash du nouveau log
  const logData = `${certificateId}|${action}|${performedBy}|${new Date().toISOString()}|${details || ''}|${previousHash}`;
  const hash = crypto.createHash('sha256').update(logData).digest('hex');
  
  await pool.query(
    `INSERT INTO audit_logs (certificate_id, action, performed_by, details, hash, previous_hash)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [certificateId, action, performedBy, details, hash, previousHash]
  );
}

// ============================================
// GET ALL CERTIFICATES - VALIDÉ
// ============================================
router.get('/', 
  authenticate,
  validateQuery(searchSchema.merge(paginationSchema)),  // SEC-003
  async (req: any, res: Response) => {
    try {
      const pool = getPool();
      const user = req.user!;
      const { q, status, centerId, startDate, endDate, page = 1, limit = 20 } = req.query;

      let query = `
        SELECT bc.*, c.name as center_name, c.code as center_code,
               u.name as created_by_name
        FROM birth_certificates bc
        LEFT JOIN centers c ON bc.center_id = c.id
        LEFT JOIN users u ON bc.created_by = u.id
        WHERE 1=1
      `;
      const values: any[] = [];
      let paramCounter = 1;

      // Filtrage par rôle
      if (user.role !== 'ADMINISTRATEUR' && user.centerId) {
        query += ` AND bc.center_id = $${paramCounter}`;
        values.push(user.centerId);
        paramCounter++;
      }

      // Filtres optionnels
      if (q) {
        query += ` AND (
          bc.registration_number ILIKE $${paramCounter} OR
          bc.child_first_name ILIKE $${paramCounter} OR
          bc.child_last_name ILIKE $${paramCounter} OR
          bc.father_nin ILIKE $${paramCounter} OR
          bc.mother_nin ILIKE $${paramCounter}
        )`;
        values.push(`%${q}%`);
        paramCounter++;
      }

      if (status) {
        query += ` AND bc.status = $${paramCounter}`;
        values.push(status);
        paramCounter++;
      }

      if (centerId) {
        query += ` AND bc.center_id = $${paramCounter}`;
        values.push(centerId);
        paramCounter++;
      }

      if (startDate) {
        query += ` AND bc.created_at >= $${paramCounter}`;
        values.push(startDate);
        paramCounter++;
      }

      if (endDate) {
        query += ` AND bc.created_at <= $${paramCounter}`;
        values.push(endDate);
        paramCounter++;
      }

      // Pagination
      const offset = (page - 1) * limit;
      query += ` ORDER BY bc.created_at DESC LIMIT $${paramCounter} OFFSET $${paramCounter + 1}`;
      values.push(limit, offset);

      const result = await pool.query(query, values);

      // Compter le total
      let countQuery = 'SELECT COUNT(*) FROM birth_certificates bc WHERE 1=1';
      const countValues: any[] = [];
      let countParam = 1;

      if (user.role !== 'ADMINISTRATEUR' && user.centerId) {
        countQuery += ` AND bc.center_id = $${countParam}`;
        countValues.push(user.centerId);
        countParam++;
      }

      if (status) {
        countQuery += ` AND bc.status = $${countParam}`;
        countValues.push(status);
      }

      const countResult = await pool.query(countQuery, countValues);
      const total = parseInt(countResult.rows[0].count);

      res.json({
        data: result.rows.map(mapCertificateToResponse),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      console.error('Get certificates error:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }
);

// ============================================
// GET SINGLE CERTIFICATE - VALIDÉ
// ============================================
router.get('/:id', 
  authenticate,
  validateParams(idParamSchema),  // SEC-003
  async (req: any, res: Response) => {
    try {
      const pool = getPool();
      const { id } = req.params;
      const user = req.user!;

      const result = await pool.query(`
        SELECT bc.*, c.name as center_name, c.code as center_code,
               u.name as created_by_name, s.name as signed_by_name
        FROM birth_certificates bc
        LEFT JOIN centers c ON bc.center_id = c.id
        LEFT JOIN users u ON bc.created_by = u.id
        LEFT JOIN users s ON bc.signed_by = s.id
        WHERE bc.id = $1
      `, [id]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Acte introuvable' });
      }

      const certificate = result.rows[0];

      // Vérifier l'accès
      if (user.role !== 'ADMINISTRATEUR' && certificate.center_id !== user.centerId) {
        return res.status(403).json({ error: 'Accès refusé à cet acte' });
      }

      // Récupérer l'historique
      const historyResult = await pool.query(`
        SELECT al.*, u.name as performed_by_name
        FROM audit_logs al
        LEFT JOIN users u ON al.performed_by = u.id
        WHERE al.certificate_id = $1
        ORDER BY al.timestamp ASC
      `, [id]);

      res.json({
        ...mapCertificateToResponse(certificate),
        history: historyResult.rows
      });
    } catch (error) {
      console.error('Get certificate error:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }
);

// ============================================
// CREATE CERTIFICATE - VALIDÉ (CRITIQUE)
// ============================================
router.post('/', 
  authenticate,
  authorizeRoles('AGENT_SAISIE', 'ADMINISTRATEUR'),
  validateBody(createCertificateSchema),  // SEC-003: Validation complète
  async (req: any, res: Response) => {
    try {
      const pool = getPool();
      const user = req.user!;
      
      // req.body est maintenant entièrement validé et sanitizé
      const data = req.body;

      // Déterminer le centre
      const centerId = user.role === 'ADMINISTRATEUR' ? data.centerId : user.centerId;
      if (!centerId) {
        return res.status(400).json({ error: 'Centre non spécifié' });
      }

      // Générer le numéro d'enregistrement
      const registrationNumber = await generateRegistrationNumber(centerId);
      const registrationYear = new Date().getFullYear();

      // Insertion
      const result = await pool.query(`
        INSERT INTO birth_certificates (
          registration_number, registration_year, status, center_id, created_by,
          declaration_date, child_first_name, child_last_name, child_gender,
          birth_date, birth_time, birth_place, hospital, hospital_certificate_scan,
          father_first_name, father_last_name, father_birth_date, father_occupation,
          father_birth_place, father_address, father_nin, father_cni_recto, father_cni_verso,
          mother_first_name, mother_last_name, mother_birth_date, mother_occupation,
          mother_birth_place, mother_address, mother_nin, mother_cni_recto, mother_cni_verso,
          is_late_registration, judgment_court, judgment_date, judgment_number, judgment_registration_date
        ) VALUES (
          $1, $2, 'DRAFT', $3, $4,
          $5, $6, $7, $8,
          $9, $10, $11, $12, $13,
          $14, $15, $16, $17,
          $18, $19, $20, $21, $22,
          $23, $24, $25, $26,
          $27, $28, $29, $30, $31,
          $32, $33, $34, $35, $36
        ) RETURNING *
      `, [
        registrationNumber, registrationYear, centerId, user.id,
        data.declarationDate, data.childFirstName, data.childLastName, data.childGender,
        data.birthDate, data.birthTime, data.birthPlace, data.hospital, data.hospitalCertificateScan || null,
        data.fatherFirstName, data.fatherLastName, data.fatherBirthDate, data.fatherOccupation,
        data.fatherBirthPlace, data.fatherAddress, data.fatherNin || null, data.fatherCniRecto || null, data.fatherCniVerso || null,
        data.motherFirstName, data.motherLastName, data.motherBirthDate, data.motherOccupation,
        data.motherBirthPlace, data.motherAddress, data.motherNin || null, data.motherCniRecto || null, data.motherCniVerso || null,
        data.isLateRegistration, data.judgmentCourt || null, data.judgmentDate || null, 
        data.judgmentNumber || null, data.judgmentRegistrationDate || null
      ]);

      const certificate = result.rows[0];

      // Créer le log d'audit
      await createAuditLog(
        certificate.id,
        'CREATION',
        user.id,
        `Acte créé par ${user.name}`
      );

      res.status(201).json(mapCertificateToResponse(certificate));
    } catch (error) {
      console.error('Create certificate error:', error);
      res.status(500).json({ error: 'Erreur serveur lors de la création' });
    }
  }
);

// ============================================
// UPDATE CERTIFICATE - VALIDÉ
// ============================================
router.put('/:id', 
  authenticate,
  authorizeRoles('AGENT_SAISIE', 'VALIDATEUR', 'ADMINISTRATEUR'),
  validateParams(idParamSchema),           // SEC-003
  validateBody(updateCertificateSchema),   // SEC-003
  async (req: any, res: Response) => {
    try {
      const pool = getPool();
      const { id } = req.params;
      const user = req.user!;
      const data = req.body;

      // Vérifier que l'acte existe et est modifiable
      const existing = await pool.query(
        'SELECT * FROM birth_certificates WHERE id = $1',
        [id]
      );

      if (existing.rows.length === 0) {
        return res.status(404).json({ error: 'Acte introuvable' });
      }

      const certificate = existing.rows[0];

      // Vérifier l'accès
      if (user.role !== 'ADMINISTRATEUR' && certificate.center_id !== user.centerId) {
        return res.status(403).json({ error: 'Accès refusé' });
      }

      // Seuls DRAFT et PENDING peuvent être modifiés
      if (!['DRAFT', 'PENDING'].includes(certificate.status)) {
        return res.status(400).json({ error: 'Cet acte ne peut plus être modifié' });
      }

      // Construire la requête de mise à jour dynamique
      const updates: string[] = [];
      const values: any[] = [];
      let paramCounter = 1;

      const fieldMapping: Record<string, string> = {
        declarationDate: 'declaration_date',
        childFirstName: 'child_first_name',
        childLastName: 'child_last_name',
        childGender: 'child_gender',
        birthDate: 'birth_date',
        birthTime: 'birth_time',
        birthPlace: 'birth_place',
        hospital: 'hospital',
        hospitalCertificateScan: 'hospital_certificate_scan',
        fatherFirstName: 'father_first_name',
        fatherLastName: 'father_last_name',
        fatherBirthDate: 'father_birth_date',
        fatherOccupation: 'father_occupation',
        fatherBirthPlace: 'father_birth_place',
        fatherAddress: 'father_address',
        fatherNin: 'father_nin',
        fatherCniRecto: 'father_cni_recto',
        fatherCniVerso: 'father_cni_verso',
        motherFirstName: 'mother_first_name',
        motherLastName: 'mother_last_name',
        motherBirthDate: 'mother_birth_date',
        motherOccupation: 'mother_occupation',
        motherBirthPlace: 'mother_birth_place',
        motherAddress: 'mother_address',
        motherNin: 'mother_nin',
        motherCniRecto: 'mother_cni_recto',
        motherCniVerso: 'mother_cni_verso',
        isLateRegistration: 'is_late_registration',
        judgmentCourt: 'judgment_court',
        judgmentDate: 'judgment_date',
        judgmentNumber: 'judgment_number',
        judgmentRegistrationDate: 'judgment_registration_date',
        status: 'status'
      };

      for (const [jsKey, dbKey] of Object.entries(fieldMapping)) {
        if (data[jsKey] !== undefined) {
          updates.push(`${dbKey} = $${paramCounter}`);
          values.push(data[jsKey]);
          paramCounter++;
        }
      }

      if (updates.length === 0) {
        return res.status(400).json({ error: 'Aucune modification fournie' });
      }

      values.push(id);
      const query = `UPDATE birth_certificates SET ${updates.join(', ')} WHERE id = $${paramCounter} RETURNING *`;

      const result = await pool.query(query, values);

      // Log d'audit
      await createAuditLog(
        id,
        'MODIFICATION',
        user.id,
        `Acte modifié par ${user.name}`
      );

      res.json(mapCertificateToResponse(result.rows[0]));
    } catch (error) {
      console.error('Update certificate error:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }
);

// ============================================
// SUBMIT FOR VALIDATION
// ============================================
router.post('/:id/submit', 
  authenticate,
  authorizeRoles('AGENT_SAISIE', 'ADMINISTRATEUR'),
  validateParams(idParamSchema),  // SEC-003
  async (req: any, res: Response) => {
    try {
      const pool = getPool();
      const { id } = req.params;
      const user = req.user!;

      const existing = await pool.query(
        'SELECT * FROM birth_certificates WHERE id = $1',
        [id]
      );

      if (existing.rows.length === 0) {
        return res.status(404).json({ error: 'Acte introuvable' });
      }

      const certificate = existing.rows[0];

      if (certificate.status !== 'DRAFT') {
        return res.status(400).json({ error: 'Seuls les brouillons peuvent être soumis' });
      }

      const result = await pool.query(
        'UPDATE birth_certificates SET status = $1 WHERE id = $2 RETURNING *',
        ['PENDING', id]
      );

      await createAuditLog(id, 'SOUMISSION', user.id, `Soumis pour validation par ${user.name}`);

      res.json(mapCertificateToResponse(result.rows[0]));
    } catch (error) {
      console.error('Submit certificate error:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }
);

// ============================================
// SIGN CERTIFICATE - VALIDÉ
// ============================================
router.post('/:id/sign', 
  authenticate,
  authorizeRoles('VALIDATEUR', 'RESPONSABLE', 'ADMINISTRATEUR'),
  validateParams(idParamSchema),           // SEC-003
  validateBody(signCertificateSchema),     // SEC-003
  async (req: any, res: Response) => {
    try {
      const pool = getPool();
      const { id } = req.params;
      const user = req.user!;
      const { signature } = req.body;

      const existing = await pool.query(
        'SELECT * FROM birth_certificates WHERE id = $1',
        [id]
      );

      if (existing.rows.length === 0) {
        return res.status(404).json({ error: 'Acte introuvable' });
      }

      const certificate = existing.rows[0];

      if (certificate.status !== 'PENDING') {
        return res.status(400).json({ error: 'Cet acte ne peut pas être signé' });
      }

      const result = await pool.query(`
        UPDATE birth_certificates 
        SET status = 'SIGNED', 
            signed_by = $1, 
            signed_at = NOW(),
            pki_signature = $2
        WHERE id = $3 
        RETURNING *
      `, [user.id, JSON.stringify(signature), id]);

      await createAuditLog(
        id, 
        'SIGNATURE', 
        user.id, 
        `Signé électroniquement par ${user.name} (${signature.algorithm})`
      );

      res.json(mapCertificateToResponse(result.rows[0]));
    } catch (error) {
      console.error('Sign certificate error:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }
);

// ============================================
// DELIVER CERTIFICATE
// ============================================
router.post('/:id/deliver', 
  authenticate,
  authorizeRoles('AGENT_SAISIE', 'RESPONSABLE', 'ADMINISTRATEUR'),
  validateParams(idParamSchema),  // SEC-003
  async (req: any, res: Response) => {
    try {
      const pool = getPool();
      const { id } = req.params;
      const user = req.user!;

      const existing = await pool.query(
        'SELECT * FROM birth_certificates WHERE id = $1',
        [id]
      );

      if (existing.rows.length === 0) {
        return res.status(404).json({ error: 'Acte introuvable' });
      }

      if (existing.rows[0].status !== 'SIGNED') {
        return res.status(400).json({ error: 'Seuls les actes signés peuvent être délivrés' });
      }

      const result = await pool.query(
        'UPDATE birth_certificates SET status = $1 WHERE id = $2 RETURNING *',
        ['DELIVERED', id]
      );

      await createAuditLog(id, 'DÉLIVRANCE', user.id, `Délivré par ${user.name}`);

      res.json(mapCertificateToResponse(result.rows[0]));
    } catch (error) {
      console.error('Deliver certificate error:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }
);

// ============================================
// HELPER - Mapping DB vers Response
// ============================================
function mapCertificateToResponse(row: any) {
  return {
    id: row.id,
    registrationNumber: row.registration_number,
    registrationYear: row.registration_year,
    status: row.status,
    centerId: row.center_id,
    centerName: row.center_name,
    centerCode: row.center_code,
    createdBy: row.created_by,
    createdByName: row.created_by_name,
    createdAt: row.created_at,
    
    declarationDate: row.declaration_date,
    childFirstName: row.child_first_name,
    childLastName: row.child_last_name,
    childGender: row.child_gender,
    birthDate: row.birth_date,
    birthTime: row.birth_time,
    birthPlace: row.birth_place,
    hospital: row.hospital,
    hospitalCertificateScan: row.hospital_certificate_scan,
    
    fatherFirstName: row.father_first_name,
    fatherLastName: row.father_last_name,
    fatherBirthDate: row.father_birth_date,
    fatherOccupation: row.father_occupation,
    fatherBirthPlace: row.father_birth_place,
    fatherAddress: row.father_address,
    fatherNin: row.father_nin,
    fatherCniRecto: row.father_cni_recto,
    fatherCniVerso: row.father_cni_verso,
    
    motherFirstName: row.mother_first_name,
    motherLastName: row.mother_last_name,
    motherBirthDate: row.mother_birth_date,
    motherOccupation: row.mother_occupation,
    motherBirthPlace: row.mother_birth_place,
    motherAddress: row.mother_address,
    motherNin: row.mother_nin,
    motherCniRecto: row.mother_cni_recto,
    motherCniVerso: row.mother_cni_verso,
    
    isLateRegistration: row.is_late_registration,
    judgmentCourt: row.judgment_court,
    judgmentDate: row.judgment_date,
    judgmentNumber: row.judgment_number,
    judgmentRegistrationDate: row.judgment_registration_date,
    
    signedBy: row.signed_by,
    signedByName: row.signed_by_name,
    signedAt: row.signed_at,
    pkiSignature: row.pki_signature ? JSON.parse(row.pki_signature) : null
  };
}

export default router;
