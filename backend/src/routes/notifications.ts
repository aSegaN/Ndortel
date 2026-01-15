// ============================================
// FICHIER: server/src/routes/notifications.ts
// VERSION: 2.0.0 - SEC-003 Validation Zod
// ============================================

import { Router, Response } from 'express';
import { pool, authenticate, AuthRequest } from '../index';
import { validateBody, validateParams } from '../middleware/validate';
import { createNotificationSchema, idParamSchema } from '../validation/schemas';

const router = Router();

// ============================================
// GET notifications for current user
// ============================================
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;

    // Récupérer les notifications ciblées pour cet utilisateur
    const result = await pool.query(`
      SELECT * FROM notifications
      WHERE 
        (user_id = $1) OR
        (role = $2 AND center_id = $3) OR
        (role = $2 AND center_id IS NULL)
      ORDER BY timestamp DESC
      LIMIT 100
    `, [user.id, user.role, user.centerId || null]);

    res.json(result.rows);
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ============================================
// MARK notification as read - VALIDÉ
// ============================================
router.patch('/:id/read', 
  authenticate, 
  validateParams(idParamSchema),  // SEC-003
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const user = req.user!;
      
      // Vérifier que la notification appartient à l'utilisateur
      const notif = await pool.query(
        `SELECT id FROM notifications 
         WHERE id = $1 AND (
           user_id = $2 OR
           (role = $3 AND center_id = $4) OR
           (role = $3 AND center_id IS NULL)
         )`,
        [id, user.id, user.role, user.centerId || null]
      );

      if (notif.rows.length === 0) {
        return res.status(404).json({ error: 'Notification introuvable' });
      }

      await pool.query(
        'UPDATE notifications SET read = TRUE WHERE id = $1',
        [id]
      );

      res.json({ message: 'Notification marquée comme lue' });
    } catch (error) {
      console.error('Mark notification error:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }
);

// ============================================
// CLEAR all read notifications
// ============================================
router.delete('/clear-read', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    
    const result = await pool.query(`
      DELETE FROM notifications
      WHERE read = TRUE AND (
        user_id = $1 OR
        (role = $2 AND center_id = $3) OR
        (role = $2 AND center_id IS NULL)
      )
      RETURNING id
    `, [user.id, user.role, user.centerId || null]);

    res.json({ 
      message: 'Notifications lues supprimées',
      count: result.rowCount 
    });
  } catch (error) {
    console.error('Clear notifications error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ============================================
// CREATE notification - VALIDÉ
// ============================================
router.post('/', 
  authenticate,
  validateBody(createNotificationSchema),  // SEC-003
  async (req: AuthRequest, res: Response) => {
    try {
      // req.body est validé et sanitizé par Zod
      const { userId, role, centerId, title, message, type, relatedId } = req.body;

      const result = await pool.query(`
        INSERT INTO notifications (user_id, role, center_id, title, message, type, related_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `, [userId || null, role || null, centerId || null, title, message, type, relatedId || null]);

      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error('Create notification error:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }
);

export default router;
