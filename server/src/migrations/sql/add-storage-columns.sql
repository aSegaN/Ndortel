-- ============================================
-- FICHIER: add-storage-columns.sql
-- CHEMIN COMPLET: server/src/migrations/sql/add-storage-columns.sql
-- DESCRIPTION: Ajout des colonnes pour SEC-004
-- VERSION: 1.0.0
-- ============================================

-- ============================================
-- 1. AJOUTER LES COLONNES DE MIGRATION
-- ============================================

-- Indicateur de migration
ALTER TABLE birth_certificates 
ADD COLUMN IF NOT EXISTS images_migrated BOOLEAN DEFAULT FALSE;

-- Références aux documents stockés dans MinIO
ALTER TABLE birth_certificates 
ADD COLUMN IF NOT EXISTS document_references JSONB;

-- Index pour les requêtes de migration
CREATE INDEX IF NOT EXISTS idx_certificates_images_migrated 
ON birth_certificates(images_migrated);

-- Index GIN pour les requêtes JSONB
CREATE INDEX IF NOT EXISTS idx_certificates_doc_refs 
ON birth_certificates USING GIN (document_references);

-- ============================================
-- 2. TABLE D'ERREURS DE MIGRATION
-- ============================================

CREATE TABLE IF NOT EXISTS migration_errors (
    id SERIAL PRIMARY KEY,
    certificate_id UUID REFERENCES birth_certificates(id),
    error_message TEXT NOT NULL,
    stack_trace TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 3. TABLE D'AUDIT DES DOCUMENTS
-- ============================================

CREATE TABLE IF NOT EXISTS document_audit (
    id SERIAL PRIMARY KEY,
    certificate_id UUID NOT NULL REFERENCES birth_certificates(id),
    document_type VARCHAR(50) NOT NULL,
    action VARCHAR(20) NOT NULL, -- 'STORE', 'RETRIEVE', 'DELETE'
    reference VARCHAR(50),
    performed_by UUID REFERENCES users(id),
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_doc_audit_certificate 
ON document_audit(certificate_id);

CREATE INDEX IF NOT EXISTS idx_doc_audit_created 
ON document_audit(created_at);

-- ============================================
-- 4. COMMENTAIRES
-- ============================================

COMMENT ON COLUMN birth_certificates.images_migrated IS 
'Indique si les images ont été migrées vers MinIO (SEC-004)';

COMMENT ON COLUMN birth_certificates.document_references IS 
'Références JSON des documents stockés dans MinIO avec métadonnées de chiffrement';

COMMENT ON TABLE document_audit IS 
'Journal d''audit des accès aux documents biométriques (SEC-004)';

-- ============================================
-- 5. VÉRIFICATION
-- ============================================

DO $$
BEGIN
    RAISE NOTICE 'Migration SEC-004 appliquée avec succès';
    RAISE NOTICE 'Colonnes ajoutées: images_migrated, document_references';
    RAISE NOTICE 'Tables créées: migration_errors, document_audit';
END $$;