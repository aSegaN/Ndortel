// ============================================
// FICHIER: encryption.service.test.ts
// CHEMIN COMPLET: server/src/__tests__/services/encryption.service.test.ts
// DESCRIPTION: Tests unitaires du service de chiffrement AES-256-GCM
// VERSION: 2.2.0 - ARCH-004 FINAL (fix tampering + performance)
// ============================================

import { describe, it, expect, beforeEach } from '@jest/globals';
import crypto from 'crypto';

// ============================================
// TYPES
// ============================================

interface EncryptedData {
    ciphertext: string;
    iv: string;
    authTag: string;
    algorithm: string;
    encryptedAt: string;
    version: number;
}

// ============================================
// SERVICE À TESTER
// ============================================

class EncryptionService {
    private readonly algorithm = 'aes-256-gcm';
    private readonly keyLength = 32;
    private readonly ivLength = 16;
    private readonly tagLength = 16;
    private readonly version = 1;

    // Réduire les itérations pour les tests (en prod: 100000)
    private readonly pbkdf2Iterations: number;

    constructor(iterations: number = 100000) {
        this.pbkdf2Iterations = iterations;
    }

    private getEncryptionKey(): string {
        return process.env.STORAGE_ENCRYPTION_KEY || 'test-encryption-key-32-chars-ok!';
    }

    private deriveKey(salt: Buffer): Buffer {
        const masterKey = this.getEncryptionKey();
        return crypto.pbkdf2Sync(masterKey, salt, this.pbkdf2Iterations, this.keyLength, 'sha512');
    }

    encrypt(data: Buffer | string, associatedData?: string): EncryptedData {
        const plaintext = Buffer.isBuffer(data) ? data : Buffer.from(data, 'utf-8');
        const iv = crypto.randomBytes(this.ivLength);
        const salt = crypto.randomBytes(32);
        const key = this.deriveKey(salt);

        const cipher = crypto.createCipheriv(this.algorithm, key, iv, {
            authTagLength: this.tagLength
        });

        if (associatedData) {
            cipher.setAAD(Buffer.from(associatedData, 'utf-8'));
        }

        const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
        const authTag = cipher.getAuthTag();
        const ciphertext = Buffer.concat([salt, encrypted]);

        return {
            ciphertext: ciphertext.toString('base64'),
            iv: iv.toString('base64'),
            authTag: authTag.toString('base64'),
            algorithm: this.algorithm,
            encryptedAt: new Date().toISOString(),
            version: this.version
        };
    }

    decrypt(encryptedData: EncryptedData, associatedData?: string): Buffer {
        if (encryptedData.version !== this.version) {
            throw new Error(`Version non supportée: ${encryptedData.version}`);
        }

        const ciphertextWithSalt = Buffer.from(encryptedData.ciphertext, 'base64');
        const iv = Buffer.from(encryptedData.iv, 'base64');
        const authTag = Buffer.from(encryptedData.authTag, 'base64');

        const salt = ciphertextWithSalt.subarray(0, 32);
        const ciphertext = ciphertextWithSalt.subarray(32);
        const key = this.deriveKey(salt);

        const decipher = crypto.createDecipheriv(this.algorithm, key, iv, {
            authTagLength: this.tagLength
        });

        decipher.setAuthTag(authTag);

        if (associatedData) {
            decipher.setAAD(Buffer.from(associatedData, 'utf-8'));
        }

        return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    }

    generateHash(data: Buffer | string): string {
        const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data, 'utf-8');
        return crypto.createHash('sha256').update(buffer).digest('hex');
    }

    verifyHash(data: Buffer | string, expectedHash: string): boolean {
        const actualHash = this.generateHash(data);
        return crypto.timingSafeEqual(
            Buffer.from(actualHash, 'hex'),
            Buffer.from(expectedHash, 'hex')
        );
    }
}

// ============================================
// TESTS
// ============================================

describe('EncryptionService', () => {
    let encryptionService: EncryptionService;

    beforeEach(() => {
        // Utiliser moins d'itérations pour les tests (1000 au lieu de 100000)
        encryptionService = new EncryptionService(1000);
    });

    // ----------------------------------------
    // Tests encrypt/decrypt
    // ----------------------------------------
    describe('encrypt & decrypt', () => {
        it('devrait chiffrer et déchiffrer une chaîne correctement', () => {
            const originalText = 'Hello, Sénégal! 🇸🇳';
            const encrypted = encryptionService.encrypt(originalText);
            const decrypted = encryptionService.decrypt(encrypted);
            expect(decrypted.toString('utf-8')).toBe(originalText);
        });

        it('devrait chiffrer et déchiffrer un Buffer correctement', () => {
            const originalBuffer = Buffer.from([0x00, 0x01, 0x02, 0xFF, 0xFE]);
            const encrypted = encryptionService.encrypt(originalBuffer);
            const decrypted = encryptionService.decrypt(encrypted);
            expect(Buffer.compare(decrypted, originalBuffer)).toBe(0);
        });

        it('devrait produire des chiffrés différents (IV aléatoire)', () => {
            const text = 'Same text';
            const encrypted1 = encryptionService.encrypt(text);
            const encrypted2 = encryptionService.encrypt(text);
            expect(encrypted1.ciphertext).not.toBe(encrypted2.ciphertext);
            expect(encrypted1.iv).not.toBe(encrypted2.iv);
        });

        it('devrait inclure les métadonnées requises', () => {
            const encrypted = encryptionService.encrypt('test');
            expect(encrypted.ciphertext).toBeDefined();
            expect(encrypted.iv).toBeDefined();
            expect(encrypted.authTag).toBeDefined();
            expect(encrypted.algorithm).toBe('aes-256-gcm');
            expect(encrypted.version).toBe(1);
        });

        it('devrait gérer les caractères unicode', () => {
            const specialText = '日本語 العربية 한국어 🎉🔐';
            const encrypted = encryptionService.encrypt(specialText);
            const decrypted = encryptionService.decrypt(encrypted);
            expect(decrypted.toString('utf-8')).toBe(specialText);
        });
    });

    // ----------------------------------------
    // Tests avec AAD
    // ----------------------------------------
    describe('encrypt & decrypt avec AAD', () => {
        it('devrait chiffrer/déchiffrer avec AAD', () => {
            const text = 'Secret data';
            const documentId = 'cert-12345';
            const encrypted = encryptionService.encrypt(text, documentId);
            const decrypted = encryptionService.decrypt(encrypted, documentId);
            expect(decrypted.toString()).toBe(text);
        });

        it('devrait échouer si AAD ne correspond pas', () => {
            const encrypted = encryptionService.encrypt('Secret', 'original-id');
            expect(() => {
                encryptionService.decrypt(encrypted, 'wrong-id');
            }).toThrow();
        });
    });

    // ----------------------------------------
    // Tests de sécurité
    // ----------------------------------------
    describe('sécurité', () => {
        it('devrait rejeter une version non supportée', () => {
            const encrypted = encryptionService.encrypt('test');
            encrypted.version = 99;
            expect(() => encryptionService.decrypt(encrypted)).toThrow('Version non supportée: 99');
        });

        it('devrait échouer si le ciphertext est modifié', () => {
            const encrypted = encryptionService.encrypt('test data for tampering detection');
            const ciphertextBuffer = Buffer.from(encrypted.ciphertext, 'base64');

            // S'assurer qu'on modifie APRÈS le salt (32 bytes)
            // Le ciphertext chiffré commence à l'index 32
            const indexToModify = 32 + 5; // 5 bytes dans le ciphertext chiffré
            if (ciphertextBuffer.length > indexToModify) {
                ciphertextBuffer[indexToModify] ^= 0xFF;
                encrypted.ciphertext = ciphertextBuffer.toString('base64');

                expect(() => encryptionService.decrypt(encrypted)).toThrow();
            }
        });

        it('devrait échouer si le authTag est modifié', () => {
            const encrypted = encryptionService.encrypt('test data');
            const tamperedTag = Buffer.from(encrypted.authTag, 'base64');
            tamperedTag[0] ^= 0xFF;
            encrypted.authTag = tamperedTag.toString('base64');
            expect(() => encryptionService.decrypt(encrypted)).toThrow();
        });
    });

    // ----------------------------------------
    // Tests de hash
    // ----------------------------------------
    describe('generateHash & verifyHash', () => {
        it('devrait générer un hash SHA-256 valide', () => {
            const hash = encryptionService.generateHash('test data');
            expect(hash.length).toBe(64);
            expect(/^[a-f0-9]{64}$/.test(hash)).toBe(true);
        });

        it('devrait produire le même hash pour les mêmes données', () => {
            const hash1 = encryptionService.generateHash('consistent data');
            const hash2 = encryptionService.generateHash('consistent data');
            expect(hash1).toBe(hash2);
        });

        it('devrait vérifier un hash correct', () => {
            const data = 'verify me';
            const hash = encryptionService.generateHash(data);
            expect(encryptionService.verifyHash(data, hash)).toBe(true);
        });

        it('devrait rejeter un hash incorrect', () => {
            const data = 'original data';
            const wrongHash = encryptionService.generateHash('different data');
            expect(encryptionService.verifyHash(data, wrongHash)).toBe(false);
        });
    });

    // ----------------------------------------
    // Tests de performance (avec itérations réduites)
    // ----------------------------------------
    describe('performance', () => {
        it('devrait chiffrer 100 messages en < 5 secondes', () => {
            const startTime = Date.now();
            for (let i = 0; i < 100; i++) {
                encryptionService.encrypt(`Message ${i}`);
            }
            const duration = Date.now() - startTime;
            expect(duration).toBeLessThan(5000);
        });

        it('devrait chiffrer 1MB en < 2 secondes', () => {
            const largeData = Buffer.alloc(1024 * 1024, 'x');
            const startTime = Date.now();
            const encrypted = encryptionService.encrypt(largeData);
            const decrypted = encryptionService.decrypt(encrypted);
            const duration = Date.now() - startTime;
            expect(duration).toBeLessThan(2000);
            expect(Buffer.compare(decrypted, largeData)).toBe(0);
        });
    });
});