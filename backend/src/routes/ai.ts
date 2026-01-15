// ============================================
// FICHIER: backend/src/routes/ai.ts
// VERSION: 2.2.0 - SEC-003 Validation Zod + Fix TypeScript
// ============================================
// Proxy sécurisé pour l'API Gemini
// - La clé API reste côté serveur (SEC-001)
// - Validation stricte des entrées (SEC-003)
// ============================================

import { Router, Request, Response } from 'express';
import jwt, { Algorithm } from 'jsonwebtoken';
import { validateBody } from '../middleware/validate';
import { ocrRequestSchema, fraudCheckRequestSchema } from '../validation/schemas';

const router = Router();

// ============================================
// CONFIGURATION
// ============================================

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.API_KEY;
const GEMINI_MODEL = 'gemini-1.5-flash';
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

// ============================================
// TYPES
// ============================================

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
}

// ============================================
// HELPERS
// ============================================

function getPool() {
  const pool = (global as any).dbPool;
  if (!pool) throw new Error('Database pool not initialized');
  return pool;
}

function getJwtSecret(): string {
  return process.env.JWT_SECRET || '';
}

function getJwtAlgorithm(): Algorithm {
  return 'HS512';
}

// Middleware d'authentification
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

    req.user = result.rows[0];
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token invalide' });
  }
};

// ============================================
// OCR ENDPOINT - VALIDÉ (SEC-003)
// ============================================
router.post('/ocr',
  authenticate,
  validateBody(ocrRequestSchema),  // SEC-003: Validation stricte
  async (req: Request, res: Response) => {
    try {
      if (!GEMINI_API_KEY) {
        return res.status(503).json({
          error: 'Service OCR non configuré',
          message: 'La clé API Gemini n\'est pas configurée sur le serveur'
        });
      }

      const { imageBase64, documentType } = req.body;

      // Construire le prompt selon le type de document
      let prompt: string;
      switch (documentType) {
        case 'CNI_RECTO':
          prompt = `Analysez cette image de CNI sénégalaise (recto) et extrayez les informations suivantes au format JSON:
{
  "nom": "NOM DE FAMILLE",
  "prenoms": "PRÉNOMS",
  "dateNaissance": "JJ/MM/AAAA",
  "lieuNaissance": "LIEU",
  "nin": "NUMÉRO NIN (13 chiffres)",
  "sexe": "M ou F",
  "adresse": "ADRESSE SI VISIBLE"
}
Retournez UNIQUEMENT le JSON, sans texte supplémentaire.`;
          break;

        case 'CNI_VERSO':
          prompt = `Analysez cette image de CNI sénégalaise (verso) et extrayez les informations suivantes au format JSON:
{
  "dateEmission": "JJ/MM/AAAA",
  "dateExpiration": "JJ/MM/AAAA",
  "lieuEmission": "LIEU D'ÉMISSION",
  "profession": "PROFESSION SI VISIBLE"
}
Retournez UNIQUEMENT le JSON, sans texte supplémentaire.`;
          break;

        case 'BULLETIN_HOSPITAL':
          prompt = `Analysez ce bulletin/certificat hospitalier de naissance et extrayez les informations suivantes au format JSON:
{
  "nomEnfant": "NOM SI INDIQUÉ",
  "prenomsEnfant": "PRÉNOMS SI INDIQUÉS",
  "dateNaissance": "JJ/MM/AAAA",
  "heureNaissance": "HH:MM",
  "lieuNaissance": "NOM DE L'ÉTABLISSEMENT",
  "sexe": "M ou F",
  "poids": "POIDS EN GRAMMES",
  "nomMere": "NOM DE LA MÈRE",
  "nomPere": "NOM DU PÈRE SI INDIQUÉ"
}
Retournez UNIQUEMENT le JSON, sans texte supplémentaire.`;
          break;

        default:
          return res.status(400).json({ error: 'Type de document non supporté' });
      }

      // Préparer l'image
      let imageData = imageBase64;
      let mimeType = 'image/jpeg';

      if (imageBase64.startsWith('data:')) {
        const match = imageBase64.match(/^data:([^;]+);base64,(.+)$/);
        if (match) {
          mimeType = match[1];
          imageData = match[2];
        }
      }

      // Appel à Gemini
      const response = await fetch(`${GEMINI_ENDPOINT}?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: prompt },
              {
                inline_data: {
                  mime_type: mimeType,
                  data: imageData
                }
              }
            ]
          }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 1024
          }
        })
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('Gemini API error:', error);
        return res.status(502).json({
          error: 'Erreur du service OCR',
          details: 'Le service d\'analyse d\'image a rencontré une erreur'
        });
      }

      // Type assertion pour éviter l'erreur TypeScript
      const data = await response.json() as GeminiResponse;

      // Extraire le texte de la réponse
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

      // Parser le JSON
      try {
        // Nettoyer le texte (enlever les backticks markdown si présents)
        const cleanJson = text.replace(/```json\n?|\n?```/g, '').trim();
        const extracted = JSON.parse(cleanJson);

        res.json({
          success: true,
          documentType,
          data: extracted,
          raw: text
        });
      } catch (parseError) {
        // Si le parsing échoue, retourner le texte brut
        res.json({
          success: true,
          documentType,
          data: null,
          raw: text,
          warning: 'Extraction partielle - vérification manuelle requise'
        });
      }

    } catch (error) {
      console.error('OCR error:', error);
      res.status(500).json({ error: 'Erreur lors de l\'analyse du document' });
    }
  }
);

// ============================================
// FRAUD CHECK ENDPOINT - VALIDÉ (SEC-003)
// ============================================
router.post('/fraud-check',
  authenticate,
  validateBody(fraudCheckRequestSchema),  // SEC-003: Validation stricte
  async (req: Request, res: Response) => {
    try {
      if (!GEMINI_API_KEY) {
        return res.status(503).json({
          error: 'Service de vérification non configuré'
        });
      }

      const { documents, metadata } = req.body;

      // Construire le prompt d'analyse de fraude
      const prompt = `Vous êtes un expert en détection de fraude documentaire pour l'état civil sénégalais.

Analysez les documents fournis pour détecter des anomalies potentielles:
- Incohérences visuelles (retouches, collages, tampons suspects)
- Incohérences de données (dates impossibles, NIU invalides)
- Incohérences temporelles (dates de naissance vs dates de déclaration)

Métadonnées du dossier:
- Date de naissance de l'enfant: ${metadata.childBirthDate}
- Date de déclaration: ${metadata.declarationDate}
- NIN du père: ${metadata.fatherNin || 'Non fourni'}
- NIN de la mère: ${metadata.motherNin || 'Non fourni'}

Retournez votre analyse au format JSON:
{
  "riskLevel": "LOW" | "MEDIUM" | "HIGH",
  "confidenceScore": 0-100,
  "findings": [
    {
      "category": "VISUAL" | "DATA" | "TEMPORAL" | "STAMP",
      "detail": "Description de l'anomalie",
      "severity": "INFO" | "WARNING" | "CRITICAL"
    }
  ],
  "summary": "Résumé de l'analyse"
}

Retournez UNIQUEMENT le JSON.`;

      // Préparer les images
      const imageParts: Array<{ inline_data: { mime_type: string; data: string } }> = [];

      for (const [key, value] of Object.entries(documents)) {
        if (value && typeof value === 'string') {
          let imageData = value;
          let mimeType = 'image/jpeg';

          if (value.startsWith('data:')) {
            const match = value.match(/^data:([^;]+);base64,(.+)$/);
            if (match) {
              mimeType = match[1];
              imageData = match[2];
            }
          }

          imageParts.push({
            inline_data: {
              mime_type: mimeType,
              data: imageData
            }
          });
        }
      }

      if (imageParts.length === 0) {
        return res.status(400).json({ error: 'Aucun document à analyser' });
      }

      // Appel à Gemini
      const response = await fetch(`${GEMINI_ENDPOINT}?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: prompt },
              ...imageParts
            ]
          }],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 2048
          }
        })
      });

      if (!response.ok) {
        console.error('Gemini API error:', await response.text());
        return res.status(502).json({ error: 'Erreur du service d\'analyse' });
      }

      // Type assertion pour éviter l'erreur TypeScript
      const data = await response.json() as GeminiResponse;
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

      try {
        const cleanJson = text.replace(/```json\n?|\n?```/g, '').trim();
        const analysis = JSON.parse(cleanJson);

        res.json({
          success: true,
          analysis: {
            ...analysis,
            analyzedAt: new Date().toISOString()
          }
        });
      } catch (parseError) {
        // Analyse par défaut si parsing échoue
        res.json({
          success: true,
          analysis: {
            riskLevel: 'LOW',
            confidenceScore: 50,
            findings: [{
              category: 'DATA',
              detail: 'Analyse automatique non concluante - vérification manuelle recommandée',
              severity: 'INFO'
            }],
            summary: 'Analyse incomplète',
            analyzedAt: new Date().toISOString()
          },
          warning: 'Analyse partielle'
        });
      }

    } catch (error) {
      console.error('Fraud check error:', error);
      res.status(500).json({ error: 'Erreur lors de l\'analyse de fraude' });
    }
  }
);

// ============================================
// HEALTH CHECK
// ============================================
router.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    geminiConfigured: !!GEMINI_API_KEY,
    model: GEMINI_MODEL,
    features: ['ocr', 'fraud-check'],
    validation: 'zod'  // SEC-003
  });
});

export default router;