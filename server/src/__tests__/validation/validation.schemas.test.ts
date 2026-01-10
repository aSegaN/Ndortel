// ============================================
// FICHIER: validation.schemas.test.ts
// CHEMIN COMPLET: server/src/__tests__/validation/validation.schemas.test.ts
// DESCRIPTION: Tests unitaires des schémas de validation Zod
// VERSION: 2.3.0 - ARCH-004 FINAL (fix Zod v4 preprocess)
// ============================================

import { describe, it, expect } from '@jest/globals';
import { z } from 'zod';

// ============================================
// SCHÉMAS À TESTER (Compatible Zod v4)
// ============================================

// Zod v4: utiliser preprocess pour nettoyer AVANT validation
const loginSchema = z.object({
    email: z.preprocess(
        (val) => typeof val === 'string' ? val.toLowerCase().trim() : val,
        z.string().email('Email invalide').min(5, 'Email trop court').max(100, 'Email trop long')
    ),
    password: z.string()
        .min(8, 'Mot de passe trop court (min 8 caractères)')
        .max(100, 'Mot de passe trop long')
});

const cniSchema = z.string()
    .regex(/^[12][0-9]{12}$/, 'Numéro CNI invalide (format: 1 ou 2 suivi de 12 chiffres)');

const phoneSchema = z.string()
    .regex(/^(\+221)?(77|78|76|75|70|33)[0-9]{7}$/, 'Numéro de téléphone sénégalais invalide');

const birthCertificateSchema = z.object({
    childLastName: z.string()
        .min(2, 'Nom trop court')
        .max(50, 'Nom trop long')
        .regex(/^[A-Za-zÀ-ÿ\s'-]+$/, 'Nom invalide'),
    childFirstName: z.string()
        .min(2, 'Prénom trop court')
        .max(50, 'Prénom trop long')
        .regex(/^[A-Za-zÀ-ÿ\s'-]+$/, 'Prénom invalide'),
    childGender: z.enum(['M', 'F']),
    birthDate: z.string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format de date invalide (YYYY-MM-DD)')
        .refine(date => {
            const d = new Date(date);
            return d <= new Date() && d >= new Date('1900-01-01');
        }, 'Date de naissance invalide'),
    birthPlace: z.string().min(2).max(100),
    birthTime: z.string()
        .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Format d'heure invalide (HH:MM)")
        .optional(),
    fatherLastName: z.string().min(2).max(50).optional(),
    fatherFirstName: z.string().min(2).max(50).optional(),
    fatherCni: cniSchema.optional(),
    fatherPhone: phoneSchema.optional(),
    motherLastName: z.string().min(2).max(50),
    motherFirstName: z.string().min(2).max(50),
    motherCni: cniSchema.optional(),
    motherPhone: phoneSchema.optional(),
    centerId: z.string().uuid('ID de centre invalide')
});

// ============================================
// TESTS
// ============================================

describe('Validation Schemas', () => {

    // ----------------------------------------
    // loginSchema
    // ----------------------------------------
    describe('loginSchema', () => {
        it('devrait valider un email et mot de passe corrects', () => {
            const result = loginSchema.safeParse({
                email: 'Agent@NDORTEL.sn',
                password: 'SecurePass123!'
            });
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.email).toBe('agent@ndortel.sn');
            }
        });

        it('devrait rejeter un email invalide', () => {
            const result = loginSchema.safeParse({
                email: 'invalid-email',
                password: 'password123'
            });
            expect(result.success).toBe(false);
        });

        it('devrait rejeter un mot de passe trop court', () => {
            const result = loginSchema.safeParse({
                email: 'test@test.sn',
                password: '1234567'
            });
            expect(result.success).toBe(false);
        });

        it('devrait trimmer et normaliser l\'email', () => {
            const result = loginSchema.safeParse({
                email: '  TEST@Test.SN  ',
                password: 'password123'
            });
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.email).toBe('test@test.sn');
            }
        });

        it('devrait accepter un email avec espaces (trim appliqué)', () => {
            const result = loginSchema.safeParse({
                email: '  user@example.com  ',
                password: 'password123'
            });
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.email).toBe('user@example.com');
            }
        });
    });

    // ----------------------------------------
    // cniSchema
    // ----------------------------------------
    describe('cniSchema', () => {
        it('devrait valider un CNI commençant par 1', () => {
            expect(cniSchema.safeParse('1234567890123').success).toBe(true);
        });

        it('devrait valider un CNI commençant par 2', () => {
            expect(cniSchema.safeParse('2987654321098').success).toBe(true);
        });

        it('devrait rejeter un CNI ne commençant pas par 1 ou 2', () => {
            expect(cniSchema.safeParse('0123456789012').success).toBe(false);
        });

        it('devrait rejeter un CNI trop court', () => {
            expect(cniSchema.safeParse('123456789012').success).toBe(false);
        });

        it('devrait rejeter un CNI avec des lettres', () => {
            expect(cniSchema.safeParse('1234567890ABC').success).toBe(false);
        });
    });

    // ----------------------------------------
    // phoneSchema
    // ----------------------------------------
    describe('phoneSchema', () => {
        it('devrait valider 771234567', () => {
            expect(phoneSchema.safeParse('771234567').success).toBe(true);
        });

        it('devrait valider 781234567', () => {
            expect(phoneSchema.safeParse('781234567').success).toBe(true);
        });

        it('devrait valider 761234567', () => {
            expect(phoneSchema.safeParse('761234567').success).toBe(true);
        });

        it('devrait valider +221771234567', () => {
            expect(phoneSchema.safeParse('+221771234567').success).toBe(true);
        });

        it('devrait rejeter 123456789', () => {
            expect(phoneSchema.safeParse('123456789').success).toBe(false);
        });

        it('devrait rejeter 7712345678 (trop long)', () => {
            expect(phoneSchema.safeParse('7712345678').success).toBe(false);
        });

        it('devrait rejeter 77123456 (trop court)', () => {
            expect(phoneSchema.safeParse('77123456').success).toBe(false);
        });

        it('devrait rejeter +33771234567 (mauvais indicatif)', () => {
            expect(phoneSchema.safeParse('+33771234567').success).toBe(false);
        });
    });

    // ----------------------------------------
    // birthCertificateSchema
    // ----------------------------------------
    describe('birthCertificateSchema', () => {
        const validCertificate = {
            childLastName: 'Diallo',
            childFirstName: 'Amadou',
            childGender: 'M' as const,
            birthDate: '2025-01-15',
            birthPlace: 'Dakar',
            motherLastName: 'Ndiaye',
            motherFirstName: 'Fatou',
            centerId: '550e8400-e29b-41d4-a716-446655440000'
        };

        it('devrait valider un certificat complet', () => {
            const result = birthCertificateSchema.safeParse(validCertificate);
            expect(result.success).toBe(true);
        });

        it('devrait rejeter un genre invalide', () => {
            const invalid = { ...validCertificate, childGender: 'X' };
            const result = birthCertificateSchema.safeParse(invalid);
            expect(result.success).toBe(false);
        });

        it('devrait rejeter une date future', () => {
            const futureDate = new Date();
            futureDate.setFullYear(futureDate.getFullYear() + 1);
            const invalid = {
                ...validCertificate,
                birthDate: futureDate.toISOString().split('T')[0]
            };
            const result = birthCertificateSchema.safeParse(invalid);
            expect(result.success).toBe(false);
        });

        it('devrait rejeter un centerId non-UUID', () => {
            const invalid = { ...validCertificate, centerId: 'not-a-uuid' };
            const result = birthCertificateSchema.safeParse(invalid);
            expect(result.success).toBe(false);
        });

        it('devrait accepter les noms avec accents', () => {
            const valid = {
                ...validCertificate,
                childLastName: "N'Diaye-Gueye",
                childFirstName: 'Sékou-Oumar'
            };
            const result = birthCertificateSchema.safeParse(valid);
            expect(result.success).toBe(true);
        });
    });

    // ----------------------------------------
    // Sécurité
    // ----------------------------------------
    describe('sécurité', () => {
        it('devrait rejeter les injections SQL', () => {
            const result = loginSchema.safeParse({
                email: "'; DROP TABLE users; --@test.com",
                password: 'password123'
            });
            expect(result.success).toBe(false);
        });

        it('devrait rejeter les scripts XSS', () => {
            const result = birthCertificateSchema.safeParse({
                childLastName: '<script>alert("XSS")</script>',
                childFirstName: 'Test',
                childGender: 'M',
                birthDate: '2025-01-15',
                birthPlace: 'Dakar',
                motherLastName: 'Test',
                motherFirstName: 'Test',
                centerId: '550e8400-e29b-41d4-a716-446655440000'
            });
            expect(result.success).toBe(false);
        });
    });
});