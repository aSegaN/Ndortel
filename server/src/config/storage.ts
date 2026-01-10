// ============================================
// FICHIER: storage.ts
// CHEMIN COMPLET: server/src/config/storage.ts
// DESCRIPTION: Configuration du stockage MinIO/S3
// VERSION: 1.0.0 - SEC-004
// ============================================

import dotenv from 'dotenv';
dotenv.config();

// ============================================
// TYPES
// ============================================

export interface StorageConfig {
    endpoint: string;
    port: number;
    useSSL: boolean;
    accessKey: string;
    secretKey: string;
    region: string;
    buckets: {
        biometric: string;
        hospital: string;
        audit: string;
    };
    encryption: {
        algorithm: 'aes-256-gcm';
        keyLength: 32;
        ivLength: 16;
        tagLength: 16;
        masterKey: string;
    };
    retention: {
        years: number;
        days: number;
    };
}

// ============================================
// CONFIGURATION
// ============================================

function getStorageConfig(): StorageConfig {
    const masterKey = process.env.STORAGE_ENCRYPTION_KEY;

    if (process.env.NODE_ENV === 'production' && !masterKey) {
        console.error('❌ FATAL: STORAGE_ENCRYPTION_KEY non défini en production');
        process.exit(1);
    }

    const effectiveMasterKey = masterKey || 'dev-only-key-32-bytes-long-here!';

    return {
        endpoint: process.env.MINIO_ENDPOINT || 'localhost',
        port: parseInt(process.env.MINIO_PORT || '9000'),
        useSSL: process.env.MINIO_USE_SSL === 'true',
        accessKey: process.env.MINIO_ACCESS_KEY || 'ndortel-admin',
        secretKey: process.env.MINIO_SECRET_KEY || 'SecureMinioPass2025!',
        region: process.env.MINIO_REGION || 'sn-dakar-1',

        buckets: {
            biometric: process.env.MINIO_BUCKET_BIOMETRIC || 'biometric-documents',
            hospital: process.env.MINIO_BUCKET_HOSPITAL || 'hospital-certificates',
            audit: process.env.MINIO_BUCKET_AUDIT || 'audit-logs'
        },

        encryption: {
            algorithm: 'aes-256-gcm',
            keyLength: 32,
            ivLength: 16,
            tagLength: 16,
            masterKey: effectiveMasterKey
        },

        retention: {
            years: 7,
            days: 2557
        }
    };
}

// ============================================
// VALIDATION
// ============================================

export function validateStorageConfig(config: StorageConfig): void {
    const errors: string[] = [];

    if (!config.endpoint) {
        errors.push('MINIO_ENDPOINT manquant');
    }

    if (!config.accessKey || !config.secretKey) {
        errors.push('Credentials MinIO manquants');
    }

    if (config.encryption.masterKey.length < 32) {
        errors.push('STORAGE_ENCRYPTION_KEY trop court (min 32 caractères)');
    }

    if (errors.length > 0) {
        console.error('❌ Configuration stockage invalide:');
        errors.forEach(e => console.error(`   - ${e}`));
        if (process.env.NODE_ENV === 'production') {
            process.exit(1);
        }
    }
}

// ============================================
// EXPORT
// ============================================

export const storageConfig = getStorageConfig();
validateStorageConfig(storageConfig);

export default storageConfig;