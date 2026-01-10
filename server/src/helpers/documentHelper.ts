// ============================================
// FICHIER: documentHelper.ts
// CHEMIN COMPLET: server/src/helpers/documentHelper.ts
// DESCRIPTION: Helpers pour gestion des images biométriques
// VERSION: 1.0.1 - SEC-004
// ============================================

import { storageService, StoredDocument, DocumentType } from '../services/storage.service';
import { Pool } from 'pg';

// ============================================
// TYPES
// ============================================

export interface DocumentReferences {
    fatherCniRecto?: StoredDocument;
    fatherCniVerso?: StoredDocument;
    motherCniRecto?: StoredDocument;
    motherCniVerso?: StoredDocument;
    hospitalCertificate?: StoredDocument;
}

export interface CertificateImages {
    fatherCniRecto?: string;
    fatherCniVerso?: string;
    motherCniRecto?: string;
    motherCniVerso?: string;
    hospitalCertificateScan?: string;
}

// ============================================
// DOCUMENT HELPER
// ============================================

class DocumentHelper {

    async storeAllImages(
        certificateId: string,
        images: CertificateImages
    ): Promise<DocumentReferences> {
        const references: DocumentReferences = {};

        const imageMapping: Array<{
            field: keyof CertificateImages;
            type: DocumentType;
            refKey: keyof DocumentReferences;
        }> = [
                { field: 'fatherCniRecto', type: 'father_cni_recto', refKey: 'fatherCniRecto' },
                { field: 'fatherCniVerso', type: 'father_cni_verso', refKey: 'fatherCniVerso' },
                { field: 'motherCniRecto', type: 'mother_cni_recto', refKey: 'motherCniRecto' },
                { field: 'motherCniVerso', type: 'mother_cni_verso', refKey: 'motherCniVerso' },
                { field: 'hospitalCertificateScan', type: 'hospital_certificate', refKey: 'hospitalCertificate' }
            ];

        for (const { field, type, refKey } of imageMapping) {
            const imageData = images[field];
            if (imageData && imageData.length > 100) {
                try {
                    const stored = await storageService.storeDocument(imageData, certificateId, type);
                    references[refKey] = stored;
                    console.log(`   ✅ ${type} stocké: ${stored.reference}`);
                } catch (error) {
                    console.error(`   ❌ Erreur stockage ${type}:`, error);
                    throw error;
                }
            }
        }

        return references;
    }

    async retrieveAllImages(references: DocumentReferences): Promise<CertificateImages> {
        const images: CertificateImages = {};

        const refMapping: Array<{
            refKey: keyof DocumentReferences;
            imageKey: keyof CertificateImages;
        }> = [
                { refKey: 'fatherCniRecto', imageKey: 'fatherCniRecto' },
                { refKey: 'fatherCniVerso', imageKey: 'fatherCniVerso' },
                { refKey: 'motherCniRecto', imageKey: 'motherCniRecto' },
                { refKey: 'motherCniVerso', imageKey: 'motherCniVerso' },
                { refKey: 'hospitalCertificate', imageKey: 'hospitalCertificateScan' }
            ];

        for (const { refKey, imageKey } of refMapping) {
            const storedDoc = references[refKey];
            if (storedDoc) {
                try {
                    const retrieved = await storageService.retrieveDocument(storedDoc);
                    images[imageKey] = retrieved.data;
                } catch (error) {
                    console.error(`❌ Erreur récupération ${refKey}:`, error);
                }
            }
        }

        return images;
    }

    async saveReferences(
        pool: Pool,
        certificateId: string,
        references: DocumentReferences
    ): Promise<void> {
        const refsJson = JSON.stringify(references);

        await pool.query(
            `UPDATE birth_certificates 
       SET document_references = $1,
           images_migrated = TRUE,
           father_cni_recto = NULL,
           father_cni_verso = NULL,
           mother_cni_recto = NULL,
           mother_cni_verso = NULL,
           hospital_certificate_scan = NULL
       WHERE id = $2`,
            [refsJson, certificateId]
        );
    }

    async loadReferences(pool: Pool, certificateId: string): Promise<DocumentReferences | null> {
        const result = await pool.query(
            'SELECT document_references FROM birth_certificates WHERE id = $1',
            [certificateId]
        );

        if (result.rows.length === 0 || !result.rows[0].document_references) {
            return null;
        }

        return result.rows[0].document_references as DocumentReferences;
    }

    async hasMigratedImages(pool: Pool, certificateId: string): Promise<boolean> {
        const result = await pool.query(
            'SELECT images_migrated FROM birth_certificates WHERE id = $1',
            [certificateId]
        );

        return result.rows.length > 0 && result.rows[0].images_migrated === true;
    }

    async getCertificateImages(
        pool: Pool,
        certificateId: string,
        certificateRow: any
    ): Promise<CertificateImages> {
        if (certificateRow.images_migrated && certificateRow.document_references) {
            return this.retrieveAllImages(certificateRow.document_references);
        }

        return {
            fatherCniRecto: certificateRow.father_cni_recto,
            fatherCniVerso: certificateRow.father_cni_verso,
            motherCniRecto: certificateRow.mother_cni_recto,
            motherCniVerso: certificateRow.mother_cni_verso,
            hospitalCertificateScan: certificateRow.hospital_certificate_scan
        };
    }
}

export const documentHelper = new DocumentHelper();
export default documentHelper;