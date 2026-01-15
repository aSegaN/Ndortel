// ============================================
// FICHIER: migrate-images.ts
// CHEMIN COMPLET: server/src/migrations/migrate-images.ts
// DESCRIPTION: Migration des images PostgreSQL → MinIO
// VERSION: 1.0.1 - SEC-004
// USAGE: npx tsx src/migrations/migrate-images.ts
// ============================================

import { Pool } from 'pg';
import dotenv from 'dotenv';
import { storageService } from '../services/storage.service';
import { documentHelper, CertificateImages } from '../helpers/documentHelper';

dotenv.config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'ndortel_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
});

interface MigrationStats {
  total: number;
  migrated: number;
  skipped: number;
  errors: number;
  documents: number;
}

async function migrateImages(): Promise<MigrationStats> {
  const stats: MigrationStats = {
    total: 0,
    migrated: 0,
    skipped: 0,
    errors: 0,
    documents: 0
  };

  console.log('═'.repeat(60));
  console.log('🔄 MIGRATION DES IMAGES BIOMÉTRIQUES');
  console.log('   PostgreSQL → MinIO (Chiffrement AES-256-GCM)');
  console.log('═'.repeat(60));
  console.log();

  try {
    console.log('📦 Initialisation du stockage MinIO...');
    await storageService.initialize();
    console.log('   ✅ MinIO prêt\n');

    console.log('🔧 Vérification du schéma...');
    await ensureSchema();
    console.log('   ✅ Schéma prêt\n');

    console.log('📊 Recherche des certificats à migrer...');
    const result = await pool.query(`
      SELECT id, registration_number,
             father_cni_recto, father_cni_verso,
             mother_cni_recto, mother_cni_verso,
             hospital_certificate_scan,
             images_migrated
      FROM birth_certificates
      WHERE images_migrated IS NOT TRUE
        AND (
          father_cni_recto IS NOT NULL OR
          father_cni_verso IS NOT NULL OR
          mother_cni_recto IS NOT NULL OR
          mother_cni_verso IS NOT NULL OR
          hospital_certificate_scan IS NOT NULL
        )
      ORDER BY created_at ASC
    `);

    stats.total = result.rows.length;
    console.log(`   📋 ${stats.total} certificats à migrer\n`);

    if (stats.total === 0) {
      console.log('✅ Aucun certificat à migrer!\n');
      return stats;
    }

    console.log('🚀 Démarrage de la migration...\n');

    for (let i = 0; i < result.rows.length; i++) {
      const cert = result.rows[i];
      const progress = `[${i + 1}/${stats.total}]`;

      console.log(`${progress} Certificat ${cert.registration_number || cert.id}`);

      try {
        const images: CertificateImages = {
          fatherCniRecto: cert.father_cni_recto,
          fatherCniVerso: cert.father_cni_verso,
          motherCniRecto: cert.mother_cni_recto,
          motherCniVerso: cert.mother_cni_verso,
          hospitalCertificateScan: cert.hospital_certificate_scan
        };

        const imageCount = Object.values(images).filter(v => v && v.length > 100).length;

        if (imageCount === 0) {
          console.log(`   ⏭️  Pas d'images, ignoré`);
          stats.skipped++;
          continue;
        }

        const references = await documentHelper.storeAllImages(cert.id, images);
        await documentHelper.saveReferences(pool, cert.id, references);

        stats.migrated++;
        stats.documents += imageCount;
        console.log(`   ✅ ${imageCount} document(s) migré(s)`);

      } catch (error: any) {
        console.error(`   ❌ Erreur: ${error.message}`);
        stats.errors++;
      }

      if (i % 10 === 0 && i > 0) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

  } catch (error) {
    console.error('❌ Erreur fatale:', error);
    throw error;
  }

  return stats;
}

async function ensureSchema(): Promise<void> {
  const alterQueries = [
    `ALTER TABLE birth_certificates 
     ADD COLUMN IF NOT EXISTS images_migrated BOOLEAN DEFAULT FALSE`,

    `ALTER TABLE birth_certificates 
     ADD COLUMN IF NOT EXISTS document_references JSONB`,

    `CREATE INDEX IF NOT EXISTS idx_certificates_images_migrated 
     ON birth_certificates(images_migrated)`
  ];

  for (const query of alterQueries) {
    try {
      await pool.query(query);
    } catch (error: any) {
      if (!error.message.includes('already exists')) {
        console.error(`   ⚠️  ${error.message}`);
      }
    }
  }
}

async function printReport(stats: MigrationStats): Promise<void> {
  console.log();
  console.log('═'.repeat(60));
  console.log('📊 RAPPORT DE MIGRATION');
  console.log('═'.repeat(60));
  console.log(`   Total certificats: ${stats.total}`);
  console.log(`   ✅ Migrés:         ${stats.migrated}`);
  console.log(`   ⏭️  Ignorés:        ${stats.skipped}`);
  console.log(`   ❌ Erreurs:        ${stats.errors}`);
  console.log(`   📄 Documents:      ${stats.documents}`);
  console.log('═'.repeat(60));
}

async function main(): Promise<void> {
  console.log();
  console.log('🔐 SEC-004: Migration des Images Biométriques');
  console.log(`📅 ${new Date().toISOString()}`);
  console.log();

  try {
    const stats = await migrateImages();
    await printReport(stats);
    process.exit(stats.errors > 0 ? 1 : 0);
  } catch (error) {
    console.error('❌ Migration échouée:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();