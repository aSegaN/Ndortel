// ============================================
// FICHIER: server/src/validation/schemas.ts
// DESCRIPTION: Schémas de validation Zod
// VERSION: 1.0.0 - SEC-003 Correction
// ============================================

import { z } from 'zod';

// ============================================
// PATTERNS DE VALIDATION SÉNÉGAL
// ============================================

/**
 * NIN (Numéro d'Identification Nationale) - 13 chiffres
 * Format: 1XXXXXXXXXX ou 2XXXXXXXXXX (1=homme, 2=femme)
 */
export const NIN_PATTERN = /^[12]\d{12}$/;

/**
 * Code de centre d'état civil
 * Format: XX-XXXX (région-numéro)
 */
export const CENTER_CODE_PATTERN = /^[A-Z]{2}-\d{4}$/;

/**
 * Numéro d'enregistrement d'acte
 * Format: YYYY-CENTRE-NNNNN
 */
export const REGISTRATION_NUMBER_PATTERN = /^\d{4}-[A-Z]{2}-\d{4}-\d{5}$/;

/**
 * Matricule agent
 * Format: XXX-YYYY-NNN
 */
export const AGENT_MATRICULE_PATTERN = /^[A-Z]{2,4}-\d{4}-\d{3}$/;

// ============================================
// SCHÉMAS DE BASE RÉUTILISABLES
// ============================================

// UUID v4
export const uuidSchema = z.string().uuid({ message: 'Format UUID invalide' });

// Email normalisé
export const emailSchema = z
  .string()
  .email({ message: 'Format email invalide' })
  .max(255, { message: 'Email trop long (max 255 caractères)' })
  .transform(val => val.toLowerCase().trim());

// Mot de passe sécurisé
export const passwordSchema = z
  .string()
  .min(8, { message: 'Mot de passe trop court (min 8 caractères)' })
  .max(128, { message: 'Mot de passe trop long (max 128 caractères)' })
  .refine(
    val => /[A-Z]/.test(val) && /[a-z]/.test(val) && /\d/.test(val),
    { message: 'Le mot de passe doit contenir au moins une majuscule, une minuscule et un chiffre' }
  );

// Mot de passe optionnel (pour mise à jour)
export const passwordOptionalSchema = z
  .string()
  .min(8, { message: 'Mot de passe trop court (min 8 caractères)' })
  .max(128, { message: 'Mot de passe trop long (max 128 caractères)' })
  .refine(
    val => /[A-Z]/.test(val) && /[a-z]/.test(val) && /\d/.test(val),
    { message: 'Le mot de passe doit contenir au moins une majuscule, une minuscule et un chiffre' }
  )
  .optional();

// Nom de personne (prénom, nom)
export const nameSchema = z
  .string()
  .min(2, { message: 'Nom trop court (min 2 caractères)' })
  .max(100, { message: 'Nom trop long (max 100 caractères)' })
  .regex(/^[\p{L}\s'-]+$/u, { message: 'Nom invalide (caractères alphabétiques uniquement)' })
  .transform(val => val.trim());

// Date au format ISO
export const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'Format de date invalide (YYYY-MM-DD)' })
  .refine(
    val => {
      const date = new Date(val);
      return !isNaN(date.getTime());
    },
    { message: 'Date invalide' }
  );

// Date de naissance (doit être dans le passé)
export const birthDateSchema = dateSchema.refine(
  val => new Date(val) < new Date(),
  { message: 'La date de naissance doit être dans le passé' }
);

// Heure au format HH:MM
export const timeSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'Format d\'heure invalide (HH:MM)' });

// NIN sénégalais
export const ninSchema = z
  .string()
  .regex(NIN_PATTERN, { message: 'NIN invalide (13 chiffres, commence par 1 ou 2)' })
  .optional();

// Genre
export const genderSchema = z.enum(['M', 'F'], { 
  errorMap: () => ({ message: 'Genre invalide (M ou F)' })
});

// Texte libre sécurisé (adresse, lieu, etc.)
export const textSchema = z
  .string()
  .min(1, { message: 'Champ requis' })
  .max(500, { message: 'Texte trop long (max 500 caractères)' })
  .transform(val => sanitizeText(val));

// Texte optionnel
export const textOptionalSchema = z
  .string()
  .max(500, { message: 'Texte trop long (max 500 caractères)' })
  .transform(val => val ? sanitizeText(val) : val)
  .optional()
  .nullable();

// Image base64
export const base64ImageSchema = z
  .string()
  .max(13_400_000, { message: 'Image trop volumineuse (max 10Mo)' })
  .refine(
    val => {
      if (!val) return true;
      // Accepte avec ou sans préfixe data:
      const base64Pattern = /^(data:image\/(jpeg|jpg|png|gif|webp);base64,)?[A-Za-z0-9+/=]+$/;
      return base64Pattern.test(val);
    },
    { message: 'Format d\'image base64 invalide' }
  )
  .optional()
  .nullable();

// ============================================
// SANITIZATION
// ============================================

/**
 * Nettoie le texte contre XSS et injections
 */
function sanitizeText(text: string): string {
  return text
    .replace(/[<>]/g, '') // Supprime < et >
    .replace(/javascript:/gi, '') // Supprime javascript:
    .replace(/on\w+=/gi, '') // Supprime les handlers d'événements
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '') // Supprime les caractères de contrôle
    .trim();
}

// ============================================
// SCHÉMAS D'AUTHENTIFICATION
// ============================================

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, { message: 'Mot de passe requis' }).max(128)
});

export type LoginInput = z.infer<typeof loginSchema>;

// ============================================
// SCHÉMAS UTILISATEURS
// ============================================

export const roleSchema = z.enum(
  ['ADMINISTRATEUR', 'AGENT_SAISIE', 'VALIDATEUR', 'RESPONSABLE'],
  { errorMap: () => ({ message: 'Rôle invalide' }) }
);

export const createUserSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: passwordSchema,
  role: roleSchema,
  centerId: uuidSchema.optional().nullable(),
  birthDate: birthDateSchema,
  registrationNumber: z
    .string()
    .regex(AGENT_MATRICULE_PATTERN, { message: 'Format matricule invalide (ex: ADM-2025-001)' })
});

export const updateUserSchema = z.object({
  name: nameSchema.optional(),
  email: emailSchema.optional(),
  password: passwordOptionalSchema,
  role: roleSchema.optional(),
  centerId: uuidSchema.optional().nullable(),
  birthDate: birthDateSchema.optional(),
  registrationNumber: z
    .string()
    .regex(AGENT_MATRICULE_PATTERN, { message: 'Format matricule invalide' })
    .optional(),
  active: z.boolean().optional()
}).refine(
  data => Object.values(data).some(v => v !== undefined),
  { message: 'Au moins un champ à modifier est requis' }
);

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;

// ============================================
// SCHÉMAS CENTRES
// ============================================

export const createCenterSchema = z.object({
  code: z
    .string()
    .regex(CENTER_CODE_PATTERN, { message: 'Format code invalide (ex: DK-0001)' }),
  name: z
    .string()
    .min(3, { message: 'Nom trop court' })
    .max(200, { message: 'Nom trop long' })
    .transform(sanitizeText),
  region: textSchema,
  department: textSchema,
  arrondissement: textOptionalSchema,
  commune: textSchema,
  address: textSchema
});

export const updateCenterSchema = z.object({
  code: z
    .string()
    .regex(CENTER_CODE_PATTERN, { message: 'Format code invalide' })
    .optional(),
  name: z
    .string()
    .min(3)
    .max(200)
    .transform(sanitizeText)
    .optional(),
  region: textSchema.optional(),
  department: textSchema.optional(),
  arrondissement: textOptionalSchema,
  commune: textSchema.optional(),
  address: textSchema.optional()
}).refine(
  data => Object.values(data).some(v => v !== undefined),
  { message: 'Au moins un champ à modifier est requis' }
);

export type CreateCenterInput = z.infer<typeof createCenterSchema>;
export type UpdateCenterInput = z.infer<typeof updateCenterSchema>;

// ============================================
// SCHÉMAS CERTIFICATS DE NAISSANCE
// ============================================

export const certificateStatusSchema = z.enum(
  ['DRAFT', 'PENDING', 'SIGNED', 'DELIVERED'],
  { errorMap: () => ({ message: 'Statut invalide' }) }
);

export const createCertificateSchema = z.object({
  // Informations enfant
  childFirstName: nameSchema,
  childLastName: nameSchema,
  childGender: genderSchema,
  birthDate: birthDateSchema,
  birthTime: timeSchema,
  birthPlace: textSchema,
  hospital: textSchema,
  hospitalCertificateScan: base64ImageSchema,

  // Informations père
  fatherFirstName: nameSchema,
  fatherLastName: nameSchema,
  fatherBirthDate: birthDateSchema,
  fatherOccupation: textSchema,
  fatherBirthPlace: textSchema,
  fatherAddress: textSchema,
  fatherNin: ninSchema,
  fatherCniRecto: base64ImageSchema,
  fatherCniVerso: base64ImageSchema,

  // Informations mère
  motherFirstName: nameSchema,
  motherLastName: nameSchema,
  motherBirthDate: birthDateSchema,
  motherOccupation: textSchema,
  motherBirthPlace: textSchema,
  motherAddress: textSchema,
  motherNin: ninSchema,
  motherCniRecto: base64ImageSchema,
  motherCniVerso: base64ImageSchema,

  // Déclaration
  declarationDate: dateSchema,
  centerId: uuidSchema,

  // Inscription tardive
  isLateRegistration: z.boolean().default(false),
  judgmentCourt: textOptionalSchema,
  judgmentDate: dateSchema.optional().nullable(),
  judgmentNumber: z.string().max(50).optional().nullable(),
  judgmentRegistrationDate: dateSchema.optional().nullable()
}).refine(
  data => {
    // Si inscription tardive, les champs jugement sont requis
    if (data.isLateRegistration) {
      return data.judgmentCourt && data.judgmentDate && data.judgmentNumber;
    }
    return true;
  },
  { 
    message: 'Pour une inscription tardive, les informations du jugement sont requises',
    path: ['judgmentCourt']
  }
);

export const updateCertificateSchema = createCertificateSchema.partial().extend({
  status: certificateStatusSchema.optional()
});

export const signCertificateSchema = z.object({
  signature: z.object({
    algorithm: z.string(),
    signatureValue: z.string(),
    publicKey: z.string(),
    certificateId: z.string(),
    timestamp: z.string(),
    legalNotice: z.string(),
    issuer: z.string()
  })
});

export type CreateCertificateInput = z.infer<typeof createCertificateSchema>;
export type UpdateCertificateInput = z.infer<typeof updateCertificateSchema>;

// ============================================
// SCHÉMAS NOTIFICATIONS
// ============================================

export const notificationTypeSchema = z.enum(
  ['info', 'success', 'warning', 'error'],
  { errorMap: () => ({ message: 'Type de notification invalide' }) }
);

export const createNotificationSchema = z.object({
  userId: uuidSchema.optional().nullable(),
  role: roleSchema.optional().nullable(),
  centerId: uuidSchema.optional().nullable(),
  title: z
    .string()
    .min(1, { message: 'Titre requis' })
    .max(200, { message: 'Titre trop long' })
    .transform(sanitizeText),
  message: z
    .string()
    .min(1, { message: 'Message requis' })
    .max(1000, { message: 'Message trop long' })
    .transform(sanitizeText),
  type: notificationTypeSchema,
  relatedId: uuidSchema.optional().nullable()
});

export type CreateNotificationInput = z.infer<typeof createNotificationSchema>;

// ============================================
// SCHÉMAS AI / OCR
// ============================================

export const documentTypeSchema = z.enum(
  ['CNI_RECTO', 'CNI_VERSO', 'BULLETIN_HOSPITAL'],
  { errorMap: () => ({ message: 'Type de document invalide' }) }
);

export const ocrRequestSchema = z.object({
  imageBase64: z
    .string()
    .min(100, { message: 'Image invalide' })
    .max(13_400_000, { message: 'Image trop volumineuse (max 10Mo)' }),
  documentType: documentTypeSchema
});

export const fraudCheckRequestSchema = z.object({
  documents: z.object({
    hospitalBulletin: base64ImageSchema,
    fatherCniRecto: base64ImageSchema,
    fatherCniVerso: base64ImageSchema,
    motherCniRecto: base64ImageSchema,
    motherCniVerso: base64ImageSchema
  }).refine(
    data => Object.values(data).some(v => v),
    { message: 'Au moins un document est requis' }
  ),
  metadata: z.object({
    childBirthDate: dateSchema,
    declarationDate: dateSchema,
    fatherNin: ninSchema,
    motherNin: ninSchema
  })
});

export type OCRRequestInput = z.infer<typeof ocrRequestSchema>;
export type FraudCheckRequestInput = z.infer<typeof fraudCheckRequestSchema>;

// ============================================
// SCHÉMAS DE PARAMÈTRES D'URL
// ============================================

export const idParamSchema = z.object({
  id: uuidSchema
});

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.string().max(50).optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
});

export const searchSchema = z.object({
  q: z
    .string()
    .min(2, { message: 'Recherche trop courte (min 2 caractères)' })
    .max(100, { message: 'Recherche trop longue' })
    .transform(sanitizeText)
    .optional(),
  status: certificateStatusSchema.optional(),
  centerId: uuidSchema.optional(),
  startDate: dateSchema.optional(),
  endDate: dateSchema.optional()
});

export type PaginationInput = z.infer<typeof paginationSchema>;
export type SearchInput = z.infer<typeof searchSchema>;

// ============================================
// EXPORT PAR DÉFAUT
// ============================================

export default {
  // Auth
  loginSchema,
  
  // Users
  createUserSchema,
  updateUserSchema,
  
  // Centers
  createCenterSchema,
  updateCenterSchema,
  
  // Certificates
  createCertificateSchema,
  updateCertificateSchema,
  signCertificateSchema,
  
  // Notifications
  createNotificationSchema,
  
  // AI
  ocrRequestSchema,
  fraudCheckRequestSchema,
  
  // Params
  idParamSchema,
  paginationSchema,
  searchSchema
};
