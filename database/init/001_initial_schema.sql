-- ============================================
-- NDORTEL - Script d'Initialisation Base de Données
-- Version: 1.0.0
-- Description: Schéma initial pour PostgreSQL
-- ============================================
-- Ce script est exécuté automatiquement au premier démarrage
-- du conteneur PostgreSQL via docker-entrypoint-initdb.d
-- ============================================

-- ============================================
-- EXTENSIONS
-- ============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- TYPES ÉNUMÉRÉS
-- ============================================

-- Rôles utilisateurs
CREATE TYPE user_role AS ENUM (
    'AGENT_SAISIE',
    'VALIDATEUR', 
    'RESPONSABLE',
    'ADMINISTRATEUR'
);

-- Statuts des certificats
CREATE TYPE certificate_status AS ENUM (
    'DRAFT',
    'PENDING',
    'SIGNED',
    'DELIVERED',
    'REJECTED'
);

-- Genre
CREATE TYPE gender_type AS ENUM ('M', 'F');

-- Types de demandes CDP
CREATE TYPE cdp_request_type AS ENUM (
    'ACCESS',
    'RECTIFICATION',
    'OPPOSITION',
    'DELETION',
    'PORTABILITY'
);

-- Statuts des demandes CDP
CREATE TYPE cdp_request_status AS ENUM (
    'PENDING',
    'PROCESSING',
    'COMPLETED',
    'REJECTED'
);

-- ============================================
-- TABLE: centers (Centres d'état civil)
-- ============================================
CREATE TABLE IF NOT EXISTS centers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(20) NOT NULL UNIQUE,
    name VARCHAR(200) NOT NULL,
    region VARCHAR(100) NOT NULL,
    department VARCHAR(100) NOT NULL,
    arrondissement VARCHAR(100),
    commune VARCHAR(100) NOT NULL,
    address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_centers_code ON centers(code);
CREATE INDEX idx_centers_region ON centers(region);

-- ============================================
-- TABLE: users (Utilisateurs)
-- ============================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(200) NOT NULL,
    role user_role NOT NULL DEFAULT 'AGENT_SAISIE',
    center_id UUID REFERENCES centers(id),
    registration_number VARCHAR(50),
    birth_date DATE,
    active BOOLEAN DEFAULT TRUE,
    pki_certificate_id VARCHAR(255),
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_center_id ON users(center_id);
CREATE INDEX idx_users_role ON users(role);

-- ============================================
-- TABLE: birth_certificates (Actes de naissance)
-- ============================================
CREATE TABLE IF NOT EXISTS birth_certificates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    registration_number VARCHAR(50) NOT NULL UNIQUE,
    registration_year INTEGER NOT NULL,
    center_id UUID NOT NULL REFERENCES centers(id),
    
    -- Enfant
    child_first_name VARCHAR(200) NOT NULL,
    child_last_name VARCHAR(200) NOT NULL,
    child_gender gender_type NOT NULL,
    birth_date DATE NOT NULL,
    birth_time TIME,
    birth_place VARCHAR(200) NOT NULL,
    hospital VARCHAR(200),
    
    -- Père
    father_first_name VARCHAR(200),
    father_last_name VARCHAR(200),
    father_birth_date DATE,
    father_birth_place VARCHAR(200),
    father_occupation VARCHAR(200),
    father_address TEXT,
    father_nin VARCHAR(20),
    
    -- Mère
    mother_first_name VARCHAR(200),
    mother_last_name VARCHAR(200),
    mother_birth_date DATE,
    mother_birth_place VARCHAR(200),
    mother_occupation VARCHAR(200),
    mother_address TEXT,
    mother_nin VARCHAR(20),
    
    -- Déclarant
    declarant_name VARCHAR(200),
    declarant_relationship VARCHAR(100),
    declarant_address TEXT,
    declaration_date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- Témoins
    witness1_name VARCHAR(200),
    witness1_occupation VARCHAR(200),
    witness1_address TEXT,
    witness2_name VARCHAR(200),
    witness2_occupation VARCHAR(200),
    witness2_address TEXT,
    
    -- Inscription tardive (jugement)
    is_late_registration BOOLEAN DEFAULT FALSE,
    judgment_court VARCHAR(200),
    judgment_date DATE,
    judgment_number VARCHAR(100),
    judgment_registration_date DATE,
    
    -- Documents numérisés (références MinIO)
    father_cni_recto_url TEXT,
    father_cni_verso_url TEXT,
    mother_cni_recto_url TEXT,
    mother_cni_verso_url TEXT,
    hospital_certificate_url TEXT,
    
    -- Workflow
    status certificate_status DEFAULT 'DRAFT',
    created_by UUID NOT NULL REFERENCES users(id),
    validated_by UUID REFERENCES users(id),
    signed_by UUID REFERENCES users(id),
    signed_at TIMESTAMP WITH TIME ZONE,
    
    -- Analyse fraude IA
    fraud_score DECIMAL(5,2),
    fraud_findings JSONB,
    
    -- Métadonnées
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_certificates_registration_number ON birth_certificates(registration_number);
CREATE INDEX idx_certificates_center_id ON birth_certificates(center_id);
CREATE INDEX idx_certificates_status ON birth_certificates(status);
CREATE INDEX idx_certificates_year ON birth_certificates(registration_year);
CREATE INDEX idx_certificates_child_name ON birth_certificates(child_last_name, child_first_name);
CREATE INDEX idx_certificates_created_by ON birth_certificates(created_by);

-- ============================================
-- TABLE: certificate_audit_log (Journal d'audit)
-- ============================================
CREATE TABLE IF NOT EXISTS certificate_audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    certificate_id UUID NOT NULL REFERENCES birth_certificates(id),
    action VARCHAR(50) NOT NULL,
    performed_by UUID NOT NULL REFERENCES users(id),
    previous_status certificate_status,
    new_status certificate_status,
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_audit_certificate_id ON certificate_audit_log(certificate_id);
CREATE INDEX idx_audit_performed_by ON certificate_audit_log(performed_by);
CREATE INDEX idx_audit_created_at ON certificate_audit_log(created_at);

-- ============================================
-- TABLE: notifications
-- ============================================
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'info',
    read BOOLEAN DEFAULT FALSE,
    certificate_id UUID REFERENCES birth_certificates(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(user_id, read);

-- ============================================
-- TABLES CDP (Conformité Protection des Données)
-- ============================================

-- Demandes des personnes concernées
CREATE TABLE IF NOT EXISTS data_subject_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_type cdp_request_type NOT NULL,
    requester_email VARCHAR(255) NOT NULL,
    requester_name VARCHAR(200),
    requester_nin VARCHAR(20),
    description TEXT,
    status cdp_request_status DEFAULT 'PENDING',
    response TEXT,
    processed_by UUID REFERENCES users(id),
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_cdp_requests_email ON data_subject_requests(requester_email);
CREATE INDEX idx_cdp_requests_status ON data_subject_requests(status);

-- Consentements
CREATE TABLE IF NOT EXISTS consents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_identifier VARCHAR(255) NOT NULL,
    purpose VARCHAR(200) NOT NULL,
    purpose_description TEXT,
    granted BOOLEAN DEFAULT FALSE,
    granted_at TIMESTAMP WITH TIME ZONE,
    revoked_at TIMESTAMP WITH TIME ZONE,
    collection_method VARCHAR(100),
    ip_address INET,
    user_agent TEXT,
    consent_text TEXT,
    consent_version VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_consents_user ON consents(user_identifier);

-- Journal d'accès aux données personnelles
CREATE TABLE IF NOT EXISTS personal_data_access_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    data_subject_id VARCHAR(255) NOT NULL,
    data_type VARCHAR(100) NOT NULL,
    action VARCHAR(50) NOT NULL,
    accessed_by UUID REFERENCES users(id),
    access_reason TEXT,
    ip_address INET,
    user_agent TEXT,
    request_id VARCHAR(255),
    accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_data_access_subject ON personal_data_access_log(data_subject_id);
CREATE INDEX idx_data_access_date ON personal_data_access_log(accessed_at);

-- Politiques de conservation
CREATE TABLE IF NOT EXISTS data_retention_policies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    data_category VARCHAR(100) NOT NULL UNIQUE,
    data_description TEXT,
    retention_period INTERVAL,
    retention_period_description VARCHAR(255),
    is_permanent BOOLEAN DEFAULT FALSE,
    legal_basis TEXT NOT NULL,
    legal_reference VARCHAR(255),
    expiry_action VARCHAR(50) DEFAULT 'ARCHIVE',
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Registre des activités de traitement (Article 49 - Loi 2008-12)
CREATE TABLE IF NOT EXISTS data_processing_activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    activity_id VARCHAR(20) NOT NULL UNIQUE,
    activity_name VARCHAR(255) NOT NULL,
    purpose TEXT NOT NULL,
    legal_basis VARCHAR(100) NOT NULL,
    legal_basis_details TEXT,
    data_categories TEXT[] NOT NULL,
    sensitive_data BOOLEAN DEFAULT FALSE,
    sensitive_data_types TEXT[],
    data_subjects TEXT[] NOT NULL,
    estimated_volume VARCHAR(100),
    recipients TEXT[],
    third_party_processors TEXT[],
    transfers_outside_senegal BOOLEAN DEFAULT FALSE,
    transfer_destinations TEXT[],
    transfer_safeguards TEXT,
    retention_period VARCHAR(100),
    retention_policy_id UUID REFERENCES data_retention_policies(id),
    security_measures TEXT[],
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_review_date DATE,
    next_review_date DATE
);

-- ============================================
-- DONNÉES INITIALES
-- ============================================

-- Politiques de conservation par défaut
INSERT INTO data_retention_policies (data_category, data_description, is_permanent, legal_basis, legal_reference) VALUES
('CIVIL_STATUS_RECORDS', 'Actes d''état civil (naissance, mariage, décès)', TRUE, 'Obligation légale de conservation permanente des registres d''état civil', 'Code de la Famille, Loi n°72-61'),
('CIVIL_STATUS_DOCUMENTS', 'Documents numérisés liés aux actes d''état civil', TRUE, 'Conservation avec l''acte auquel ils sont rattachés', 'Code de la Famille'),
('USER_ACCOUNTS', 'Comptes utilisateurs du système', FALSE, 'Durée de la fonction + conservation pour audit', NULL),
('CONNECTION_LOGS', 'Logs de connexion', FALSE, 'Sécurité du système et traçabilité', 'Loi n° 2008-12, Art. 71'),
('AUDIT_LOGS', 'Logs d''audit des actions', FALSE, 'Traçabilité administrative et contrôle', 'Loi n° 2008-12')
ON CONFLICT (data_category) DO NOTHING;

UPDATE data_retention_policies SET retention_period = INTERVAL '5 years' WHERE data_category = 'USER_ACCOUNTS';
UPDATE data_retention_policies SET retention_period = INTERVAL '1 year' WHERE data_category = 'CONNECTION_LOGS';
UPDATE data_retention_policies SET retention_period = INTERVAL '5 years' WHERE data_category = 'AUDIT_LOGS';

-- Activités de traitement NDORTEL
INSERT INTO data_processing_activities (
    activity_id, activity_name, purpose, legal_basis, 
    data_categories, data_subjects, recipients, 
    transfers_outside_senegal, retention_period, security_measures
) VALUES
('TRT-001', 'Gestion des déclarations de naissance', 
 'Enregistrement et gestion des actes de naissance conformément au Code de la Famille',
 'Obligation légale',
 ARRAY['Identité', 'Filiation', 'Témoins'],
 ARRAY['Nouveau-nés', 'Parents', 'Témoins', 'Déclarants'],
 ARRAY['Officiers d''état civil', 'Ministère de la Justice', 'ANSD'],
 FALSE, 'Conservation permanente',
 ARRAY['Chiffrement AES-256', 'Contrôle RBAC', 'Journalisation']
),
('TRT-002', 'Authentification et gestion des utilisateurs',
 'Contrôle d''accès au système, traçabilité des actions',
 'Intérêt légitime',
 ARRAY['Identité professionnelle', 'Credentials', 'Logs connexion'],
 ARRAY['Agents d''état civil', 'Administrateurs', 'Validateurs'],
 ARRAY['Service informatique', 'Audit interne'],
 FALSE, 'Durée fonction + 5 ans',
 ARRAY['Hachage bcrypt', 'JWT sécurisé', 'Rate limiting', 'Audit trail']
),
('TRT-003', 'Stockage des documents numérisés',
 'Archivage sécurisé des pièces justificatives et photos',
 'Obligation légale',
 ARRAY['Photos d''identité', 'CNI numérisées', 'Certificats médicaux'],
 ARRAY['Déclarants', 'Nouveau-nés', 'Parents'],
 ARRAY['Officiers d''état civil autorisés'],
 FALSE, 'Conservation permanente',
 ARRAY['Chiffrement AES-256-GCM', 'Stockage MinIO isolé', 'Clés séparées']
),
('TRT-004', 'Signature électronique des actes',
 'Authentification et intégrité des actes d''état civil',
 'Obligation légale',
 ARRAY['Certificats signature', 'Horodatage', 'Hash documents'],
 ARRAY['Officiers d''état civil signataires'],
 ARRAY['Autorités de vérification', 'Tribunaux'],
 FALSE, 'Conservation permanente',
 ARRAY['PKI qualifiée', 'HSM pour clés privées']
),
('TRT-005', 'Journalisation et audit',
 'Traçabilité des opérations, détection d''anomalies, conformité',
 'Intérêt légitime / Obligation légale',
 ARRAY['Actions utilisateurs', 'Timestamps', 'Adresses IP'],
 ARRAY['Tous les utilisateurs'],
 ARRAY['Auditeurs internes', 'CDP sur demande'],
 FALSE, 'Logs app: 1 an, Audit: 5 ans',
 ARRAY['Logs immuables', 'Chiffrement', 'Accès restreint']
),
('TRT-006', 'Statistiques démographiques',
 'Production de statistiques anonymisées',
 'Mission d''intérêt public',
 ARRAY['Données agrégées anonymisées'],
 ARRAY['Aucune (données anonymisées)'],
 ARRAY['ANSD', 'Ministères'],
 FALSE, 'Conservation permanente',
 ARRAY['Anonymisation irréversible', 'Agrégation min 10 individus']
)
ON CONFLICT (activity_id) DO NOTHING;

-- Centre de test par défaut
INSERT INTO centers (code, name, region, department, commune, address) VALUES
('1755', 'Centre de Abass Ndao', 'Dakar', 'Dakar', 'Médina', 'Avenue Cheikh Anta Diop, Dann Gueule Tapée')
ON CONFLICT (code) DO NOTHING;

-- Utilisateur administrateur par défaut (mot de passe: Admin@2025!)
-- Hash bcrypt de 'Admin@2025!' avec 12 rounds
INSERT INTO users (email, password_hash, name, role, active) VALUES
('admin@ndortel.sn', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4FrPevQpPmVz.Lha', 'Administrateur Système', 'ADMINISTRATEUR', TRUE)
ON CONFLICT (email) DO NOTHING;

-- ============================================
-- TRIGGERS
-- ============================================

-- Fonction de mise à jour du timestamp updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers pour updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_centers_updated_at BEFORE UPDATE ON centers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_certificates_updated_at BEFORE UPDATE ON birth_certificates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cdp_requests_updated_at BEFORE UPDATE ON data_subject_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- FIN DU SCRIPT
-- ============================================
-- Utilisateur par défaut créé:
-- Email: admin@ndortel.sn
-- Mot de passe: Admin@2025!
-- ============================================
