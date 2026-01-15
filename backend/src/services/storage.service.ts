// ============================================
// FICHIER: storage.service.ts
// CHEMIN COMPLET: server/src/services/storage.service.ts
// DESCRIPTION: Service de stockage MinIO avec chiffrement
// VERSION: 1.0.1 - SEC-004
// ============================================

import { Client as MinioClient } from 'minio';
import { encryptionService, EncryptedData } from './encryption.service';

// ============================================
// CONFIG
// ============================================

const storageConfig = {
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
    }
};

// ============================================
// TYPES
// ============================================

export type DocumentType =
    | 'father_cni_recto'
    | 'father_cni_verso'
    | 'mother_cni_recto'
    | 'mother_cni_verso'
    | 'hospital_certificate';

export interface StoredDocument {
    reference: string;
    type: DocumentType;
    certificateId: string;
    bucket: string;
    objectPath: string;
    hash: string;
    encryptedSize: number;
    storedAt: string;
    encryption: {
        iv: string;
        authTag: string;
        algorithm: string;
        version: number;
    };
}

export interface RetrievedDocument {
    data: string;
    metadata: StoredDocument;
    retrievedAt: string;
}

// ============================================
// SERVICE DE STOCKAGE
// ============================================

class StorageService {
    private client: MinioClient;
    private initialized = false;

    constructor() {
        this.client = new MinioClient({
            endPoint: storageConfig.endpoint,
            port: storageConfig.port,
            useSSL: storageConfig.useSSL,
            accessKey: storageConfig.accessKey,
            secretKey: storageConfig.secretKey,
            region: storageConfig.region
        });
    }

    async initialize(): Promise<void> {
        if (this.initialized) return;

        try {
            const buckets = Object.values(storageConfig.buckets);

            for (const bucket of buckets) {
                const exists = await this.client.bucketExists(bucket);
                if (!exists) {
                    console.log(`📦 Création du bucket: ${bucket}`);
                    await this.client.makeBucket(bucket, storageConfig.region);
                }
            }

            this.initialized = true;
            console.log('✅ Service de stockage MinIO initialisé');
        } catch (error) {
            console.error('❌ Erreur initialisation MinIO:', error);
            throw error;
        }
    }

    private getBucket(type: DocumentType): string {
        if (type === 'hospital_certificate') {
            return storageConfig.buckets.hospital;
        }
        return storageConfig.buckets.biometric;
    }

    private generateObjectPath(certificateId: string, type: DocumentType): string {
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        return `${year}/${month}/${certificateId}/${type}.enc`;
    }

    private generateReference(): string {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substring(2, 10);
        return `DOC-${timestamp}-${random}`.toUpperCase();
    }

    async storeDocument(
        base64Data: string,
        certificateId: string,
        type: DocumentType
    ): Promise<StoredDocument> {
        await this.initialize();

        const cleanBase64 = base64Data.replace(/^data:[^;]+;base64,/, '');
        const originalBuffer = Buffer.from(cleanBase64, 'base64');
        const hash = encryptionService.generateHash(originalBuffer);

        const encrypted = encryptionService.encryptImage(base64Data, certificateId);
        const encryptedBuffer = Buffer.from(JSON.stringify(encrypted), 'utf-8');

        const bucket = this.getBucket(type);
        const objectPath = this.generateObjectPath(certificateId, type);
        const reference = this.generateReference();

        const metadata = {
            'x-amz-meta-certificate-id': certificateId,
            'x-amz-meta-document-type': type,
            'x-amz-meta-reference': reference,
            'x-amz-meta-hash': hash,
            'Content-Type': 'application/octet-stream'
        };

        await this.client.putObject(
            bucket,
            objectPath,
            encryptedBuffer,
            encryptedBuffer.length,
            metadata
        );

        const storedDocument: StoredDocument = {
            reference,
            type,
            certificateId,
            bucket,
            objectPath,
            hash,
            encryptedSize: encryptedBuffer.length,
            storedAt: new Date().toISOString(),
            encryption: {
                iv: encrypted.iv,
                authTag: encrypted.authTag,
                algorithm: encrypted.algorithm,
                version: encrypted.version
            }
        };

        console.log(`📤 Document stocké: ${reference} -> ${bucket}/${objectPath}`);

        return storedDocument;
    }

    async retrieveDocument(storedDoc: StoredDocument): Promise<RetrievedDocument> {
        await this.initialize();

        try {
            const stream = await this.client.getObject(storedDoc.bucket, storedDoc.objectPath);

            const chunks: Buffer[] = [];
            for await (const chunk of stream) {
                chunks.push(chunk);
            }
            const encryptedBuffer = Buffer.concat(chunks);

            const encrypted: EncryptedData = JSON.parse(encryptedBuffer.toString('utf-8'));
            const decryptedData = encryptionService.decryptImage(encrypted, storedDoc.certificateId);

            const cleanBase64 = decryptedData.replace(/^data:[^;]+;base64,/, '');
            const decryptedBuffer = Buffer.from(cleanBase64, 'base64');

            if (!encryptionService.verifyHash(decryptedBuffer, storedDoc.hash)) {
                throw new Error('Échec vérification intégrité - document corrompu');
            }

            return {
                data: decryptedData,
                metadata: storedDoc,
                retrievedAt: new Date().toISOString()
            };
        } catch (error: any) {
            console.error(`❌ Erreur récupération document ${storedDoc.reference}:`, error.message);
            throw error;
        }
    }

    async deleteDocument(storedDoc: StoredDocument): Promise<void> {
        await this.initialize();

        const auditPath = `deleted/${storedDoc.objectPath}`;

        await this.client.copyObject(
            storageConfig.buckets.audit,
            auditPath,
            `/${storedDoc.bucket}/${storedDoc.objectPath}`
        );

        await this.client.removeObject(storedDoc.bucket, storedDoc.objectPath);

        console.log(`🗑️ Document ${storedDoc.reference} supprimé (archivé)`);
    }

    async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; details: Record<string, boolean> }> {
        try {
            const details: Record<string, boolean> = {};

            for (const [name, bucket] of Object.entries(storageConfig.buckets)) {
                details[`bucket_${name}`] = await this.client.bucketExists(bucket);
            }

            const allHealthy = Object.values(details).every(v => v);

            return {
                status: allHealthy ? 'healthy' : 'unhealthy',
                details
            };
        } catch (error) {
            return {
                status: 'unhealthy',
                details: { connection: false }
            };
        }
    }
}

export const storageService = new StorageService();
export default storageService;