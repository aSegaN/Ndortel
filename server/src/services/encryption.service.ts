// ============================================
// FICHIER: encryption.service.ts
// CHEMIN COMPLET: server/src/services/encryption.service.ts
// DESCRIPTION: Service de chiffrement AES-256-GCM
// VERSION: 1.0.1 - SEC-004 (import corrigé)
// ============================================

import crypto from 'crypto';

// ============================================
// CONFIG INLINE (évite les problèmes d'import)
// ============================================

function getEncryptionKey(): string {
    const key = process.env.STORAGE_ENCRYPTION_KEY;
    if (process.env.NODE_ENV === 'production' && !key) {
        throw new Error('STORAGE_ENCRYPTION_KEY requis en production');
    }
    return key || 'dev-only-key-32-bytes-long-here!';
}

// ============================================
// TYPES
// ============================================

export interface EncryptedData {
    ciphertext: string;
    iv: string;
    authTag: string;
    algorithm: string;
    encryptedAt: string;
    version: number;
}

export interface DecryptedData {
    data: Buffer;
    metadata: {
        decryptedAt: string;
        originalSize: number;
    };
}

// ============================================
// SERVICE DE CHIFFREMENT
// ============================================

class EncryptionService {
    private readonly algorithm = 'aes-256-gcm';
    private readonly keyLength = 32;
    private readonly ivLength = 16;
    private readonly tagLength = 16;
    private readonly version = 1;

    private deriveKey(salt: Buffer): Buffer {
        const masterKey = getEncryptionKey();
        return crypto.pbkdf2Sync(masterKey, salt, 100000, this.keyLength, 'sha512');
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

    decrypt(encryptedData: EncryptedData, associatedData?: string): DecryptedData {
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

        try {
            const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
            return {
                data: decrypted,
                metadata: {
                    decryptedAt: new Date().toISOString(),
                    originalSize: decrypted.length
                }
            };
        } catch (error: any) {
            if (error.message.includes('Unsupported state') || error.message.includes('auth')) {
                throw new Error('Échec authentification - données corrompues ou clé incorrecte');
            }
            throw error;
        }
    }

    encryptImage(base64Image: string, documentId: string): EncryptedData {
        let imageData = base64Image;
        let mimeType = 'image/jpeg';

        if (base64Image.startsWith('data:')) {
            const match = base64Image.match(/^data:([^;]+);base64,(.+)$/);
            if (match) {
                mimeType = match[1];
                imageData = match[2];
            }
        }

        const imageBuffer = Buffer.from(imageData, 'base64');
        const encrypted = this.encrypt(imageBuffer, documentId);

        return {
            ...encrypted,
            algorithm: `${this.algorithm}:${mimeType}`
        };
    }

    decryptImage(encryptedData: EncryptedData, documentId: string): string {
        const [algorithm, mimeType] = encryptedData.algorithm.split(':');

        const dataToDecrypt: EncryptedData = {
            ...encryptedData,
            algorithm
        };

        const decrypted = this.decrypt(dataToDecrypt, documentId);
        const effectiveMimeType = mimeType || 'image/jpeg';
        return `data:${effectiveMimeType};base64,${decrypted.data.toString('base64')}`;
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

export const encryptionService = new EncryptionService();
export default encryptionService;