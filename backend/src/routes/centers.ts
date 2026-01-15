// ============================================
// FICHIER: server/src/routes/centers.ts
// VERSION: 2.0.0 - SEC-003 Validation Zod
// ============================================

import { Router, Response } from 'express';
import { pool, authenticate, authorizeRoles, AuthRequest } from '../index';
import { validateBody, validateParams } from '../middleware/validate';
import { 
  createCenterSchema, 
  updateCenterSchema, 
  idParamSchema 
} from '../validation/schemas';

const router = Router();

// ============================================
// GET all centers
// ============================================
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT * FROM centers ORDER BY region, name'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Get centers error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ============================================
// GET single center - VALIDÉ
// ============================================
router.get('/:id', 
  authenticate, 
  validateParams(idParamSchema),  // SEC-003
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const result = await pool.query('SELECT * FROM centers WHERE id = $1', [id]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Centre introuvable' });
      }
      
      res.json(result.rows[0]);
    } catch (error) {
      console.error('Get center error:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }
);

// ============================================
// CREATE center (Admin only) - VALIDÉ
// ============================================
router.post('/', 
  authenticate, 
  authorizeRoles('ADMINISTRATEUR'),
  validateBody(createCenterSchema),  // SEC-003
  async (req: AuthRequest, res: Response) => {
    try {
      // req.body est validé et sanitizé par Zod
      const { code, name, region, department, commune, address, arrondissement } = req.body;

      // Vérifier que le code n'existe pas déjà
      const existing = await pool.query('SELECT id FROM centers WHERE code = $1', [code]);
      if (existing.rows.length > 0) {
        return res.status(409).json({ error: 'Ce code de centre existe déjà' });
      }

      const result = await pool.query(
        `INSERT INTO centers (code, name, region, department, arrondissement, commune, address) 
         VALUES ($1, $2, $3, $4, $5, $6, $7) 
         RETURNING *`,
        [code, name, region, department, arrondissement || null, commune, address]
      );

      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error('Create center error:', error);
      res.status(500).json({ error: 'Erreur serveur lors de la création' });
    }
  }
);

// ============================================
// UPDATE center (Admin only) - VALIDÉ
// ============================================
router.put('/:id', 
  authenticate, 
  authorizeRoles('ADMINISTRATEUR'),
  validateParams(idParamSchema),     // SEC-003
  validateBody(updateCenterSchema),   // SEC-003
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { code, name, region, department, commune, address, arrondissement } = req.body;

      let query = 'UPDATE centers SET';
      const values: any[] = [];
      let paramCounter = 1;
      const updates: string[] = [];

      if (code) {
        // Vérifier que le nouveau code n'existe pas déjà
        const existing = await pool.query(
          'SELECT id FROM centers WHERE code = $1 AND id != $2', 
          [code, id]
        );
        if (existing.rows.length > 0) {
          return res.status(409).json({ error: 'Ce code de centre existe déjà' });
        }
        updates.push(` code = $${paramCounter}`);
        values.push(code);
        paramCounter++;
      }
      if (name) {
        updates.push(` name = $${paramCounter}`);
        values.push(name);
        paramCounter++;
      }
      if (region) {
        updates.push(` region = $${paramCounter}`);
        values.push(region);
        paramCounter++;
      }
      if (department) {
        updates.push(` department = $${paramCounter}`);
        values.push(department);
        paramCounter++;
      }
      if (commune) {
        updates.push(` commune = $${paramCounter}`);
        values.push(commune);
        paramCounter++;
      }
      if (address) {
        updates.push(` address = $${paramCounter}`);
        values.push(address);
        paramCounter++;
      }
      if (arrondissement !== undefined) {
        updates.push(` arrondissement = $${paramCounter}`);
        values.push(arrondissement || null);
        paramCounter++;
      }

      if (updates.length === 0) {
        return res.status(400).json({ error: 'Aucune modification fournie' });
      }

      query += updates.join(',') + ` WHERE id = $${paramCounter} RETURNING *`;
      values.push(id);

      const result = await pool.query(query, values);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Centre introuvable' });
      }

      res.json(result.rows[0]);
    } catch (error) {
      console.error('Update center error:', error);
      res.status(500).json({ error: 'Erreur serveur lors de la mise à jour' });
    }
  }
);

// ============================================
// GET center statistics - VALIDÉ
// ============================================
router.get('/:id/statistics', 
  authenticate, 
  validateParams(idParamSchema),  // SEC-003
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      
      const result = await pool.query(
        'SELECT * FROM center_statistics WHERE id = $1',
        [id]
      );
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Centre introuvable' });
      }
      
      res.json(result.rows[0]);
    } catch (error) {
      console.error('Get center stats error:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }
);

export default router;
