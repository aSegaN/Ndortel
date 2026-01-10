-- ============================================
-- COMP-002 — MIGRATION CDP COMPLIANCE (CORRIGÉE)
-- Conformité Loi n° 2008-12 du 25 janvier 2008
-- ============================================

-- ============================================
-- TABLE: data_subject_requests
-- Demandes de droits des personnes concernées
-- ============================================

CREATE TABLE IF NOT EXISTS data_subject_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Type de demande (Article 62, 68, 69)
  type VARCHAR(20) NOT NULL CHECK (type IN ('ACCESS', 'RECTIFICATION', 'OPPOSITION', 'INFORMATION')),
  
  -- Statut de traitement
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'REJECTED')),
  
  -- Informations du demandeur
  requester_name VARCHAR(255) NOT NULL,
  requester_email VARCHAR(255) NOT NULL,
  requester_phone VARCHAR(50),
  requester_id_document VARCHAR(255),
  
  -- Détails de la demande
  request_details TEXT,
  
  -- Dates
  request_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  acknowledgment_date TIMESTAMP WITH TIME ZONE,
  response_date TIMESTAMP WITH TIME ZONE,
  response_deadline TIMESTAMP WITH TIME ZONE, -- Calculé par trigger
  
  -- Réponse
  response_content TEXT,
  response_documents TEXT[],
  rejection_reason TEXT,
  
  -- Traitement
  processed_by UUID,
  assigned_to UUID,
  
  -- Données concernées
  related_data_ids TEXT[],
  data_categories TEXT[],
  
  -- Métadonnées
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE data_subject_requests IS 'Demandes de droits des personnes concernées (CDP - Loi 2008-12)';
COMMENT ON COLUMN data_subject_requests.type IS 'ACCESS=Art.62, RECTIFICATION=Art.68, OPPOSITION=Art.69';
COMMENT ON COLUMN data_subject_requests.response_deadline IS 'Délai légal: 30 jours après réception';

-- ============================================
-- TABLE: consents
-- Gestion des consentements explicites
-- ============================================

CREATE TABLE IF NOT EXISTS consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  user_identifier VARCHAR(255) NOT NULL,
  purpose VARCHAR(100) NOT NULL,
  purpose_description TEXT,
  
  granted BOOLEAN NOT NULL DEFAULT FALSE,
  granted_at TIMESTAMP WITH TIME ZONE,
  revoked_at TIMESTAMP WITH TIME ZONE,
  
  collection_method VARCHAR(50) DEFAULT 'FORM',
  ip_address INET,
  user_agent TEXT,
  
  consent_text TEXT,
  consent_version VARCHAR(20),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_identifier, purpose)
);

COMMENT ON TABLE consents IS 'Registre des consentements pour traitements non obligatoires';

-- ============================================
-- TABLE: personal_data_access_log
-- Journal des accès aux données personnelles
-- ============================================

CREATE TABLE IF NOT EXISTS personal_data_access_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  user_id UUID,
  user_role VARCHAR(50),
  
  data_subject_id VARCHAR(255) NOT NULL,
  data_subject_type VARCHAR(50),
  
  data_type VARCHAR(100) NOT NULL,
  data_id UUID NOT NULL,
  data_fields TEXT[],
  
  action VARCHAR(50) NOT NULL CHECK (action IN ('VIEW', 'EXPORT', 'PRINT', 'MODIFY', 'DELETE', 'CREATE')),
  
  accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT,
  
  justification TEXT,
  legal_basis VARCHAR(100),
  request_id VARCHAR(255),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE personal_data_access_log IS 'Journal d''accès aux données personnelles pour audit CDP';

-- ============================================
-- TABLE: data_retention_policies
-- Politiques de conservation des données
-- ============================================

CREATE TABLE IF NOT EXISTS data_retention_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
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

COMMENT ON TABLE data_retention_policies IS 'Politiques de conservation selon les catégories de données';

-- Insertion des politiques par défaut
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

-- ============================================
-- TABLE: data_processing_activities
-- Registre des activités de traitement (Art. 49)
-- ============================================

CREATE TABLE IF NOT EXISTS data_processing_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
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

COMMENT ON TABLE data_processing_activities IS 'Registre des activités de traitement (Article 49 - Loi 2008-12)';

-- Insertion des activités de traitement NDORTEL
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

-- ============================================
-- INDEX
-- ============================================

CREATE INDEX IF NOT EXISTS idx_dsr_status ON data_subject_requests(status);
CREATE INDEX IF NOT EXISTS idx_dsr_type ON data_subject_requests(type);
CREATE INDEX IF NOT EXISTS idx_dsr_email ON data_subject_requests(requester_email);
CREATE INDEX IF NOT EXISTS idx_dsr_date ON data_subject_requests(request_date);
CREATE INDEX IF NOT EXISTS idx_dsr_deadline ON data_subject_requests(response_deadline) WHERE status = 'PENDING';

CREATE INDEX IF NOT EXISTS idx_consents_user ON consents(user_identifier);
CREATE INDEX IF NOT EXISTS idx_consents_purpose ON consents(purpose);
CREATE INDEX IF NOT EXISTS idx_consents_granted ON consents(granted) WHERE granted = TRUE;

CREATE INDEX IF NOT EXISTS idx_pda_log_user ON personal_data_access_log(user_id);
CREATE INDEX IF NOT EXISTS idx_pda_log_subject ON personal_data_access_log(data_subject_id);
CREATE INDEX IF NOT EXISTS idx_pda_log_date ON personal_data_access_log(accessed_at);
CREATE INDEX IF NOT EXISTS idx_pda_log_type ON personal_data_access_log(data_type);

-- ============================================
-- VUES POUR REPORTING CDP
-- ============================================

CREATE OR REPLACE VIEW cdp_monthly_requests_report AS
SELECT 
  DATE_TRUNC('month', request_date) as month,
  type,
  COUNT(*) as total_requests,
  COUNT(*) FILTER (WHERE status = 'COMPLETED') as completed,
  COUNT(*) FILTER (WHERE status = 'PENDING') as pending,
  COUNT(*) FILTER (WHERE status = 'REJECTED') as rejected,
  AVG(EXTRACT(EPOCH FROM (response_date - request_date))/86400)::numeric(10,2) as avg_response_days,
  COUNT(*) FILTER (WHERE response_date > response_deadline) as overdue_responses
FROM data_subject_requests
GROUP BY DATE_TRUNC('month', request_date), type
ORDER BY month DESC, type;

CREATE OR REPLACE VIEW cdp_overdue_requests AS
SELECT 
  id,
  type,
  requester_name,
  requester_email,
  request_date,
  response_deadline,
  NOW() - response_deadline as overdue_by,
  assigned_to
FROM data_subject_requests
WHERE status IN ('PENDING', 'IN_PROGRESS')
  AND response_deadline < NOW()
ORDER BY response_deadline;

CREATE OR REPLACE VIEW cdp_consent_statistics AS
SELECT 
  purpose,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE granted = TRUE) as granted,
  COUNT(*) FILTER (WHERE granted = FALSE OR revoked_at IS NOT NULL) as revoked,
  (COUNT(*) FILTER (WHERE granted = TRUE) * 100.0 / NULLIF(COUNT(*), 0))::numeric(5,2) as consent_rate
FROM consents
GROUP BY purpose
ORDER BY total DESC;

CREATE OR REPLACE VIEW cdp_data_access_statistics AS
SELECT 
  DATE_TRUNC('day', accessed_at) as day,
  data_type,
  action,
  COUNT(*) as access_count,
  COUNT(DISTINCT user_id) as unique_users,
  COUNT(DISTINCT data_subject_id) as unique_subjects
FROM personal_data_access_log
WHERE accessed_at > NOW() - INTERVAL '30 days'
GROUP BY DATE_TRUNC('day', accessed_at), data_type, action
ORDER BY day DESC, access_count DESC;

-- ============================================
-- FONCTIONS
-- ============================================

-- Fonction pour calculer le deadline à l'insertion
CREATE OR REPLACE FUNCTION set_response_deadline()
RETURNS TRIGGER AS $$
BEGIN
  NEW.response_deadline := NEW.request_date + INTERVAL '30 days';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Fonction: Vérifier les demandes en retard
CREATE OR REPLACE FUNCTION check_overdue_requests()
RETURNS TABLE (
  request_id UUID,
  days_overdue INTEGER,
  requester_email VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    dsr.id,
    EXTRACT(DAY FROM NOW() - dsr.response_deadline)::INTEGER,
    dsr.requester_email
  FROM data_subject_requests dsr
  WHERE dsr.status IN ('PENDING', 'IN_PROGRESS')
    AND dsr.response_deadline < NOW();
END;
$$ LANGUAGE plpgsql;

-- Fonction: Anonymiser les données expirées
CREATE OR REPLACE FUNCTION anonymize_expired_data()
RETURNS INTEGER AS $$
DECLARE
  anonymized_count INTEGER := 0;
BEGIN
  UPDATE personal_data_access_log
  SET 
    ip_address = NULL,
    user_agent = 'ANONYMIZED',
    data_subject_id = 'ANONYMIZED-' || id::text
  WHERE accessed_at < NOW() - INTERVAL '1 year'
    AND data_subject_id NOT LIKE 'ANONYMIZED-%';
  
  GET DIAGNOSTICS anonymized_count = ROW_COUNT;
  RETURN anonymized_count;
END;
$$ LANGUAGE plpgsql;

-- Fonction: Mise à jour de updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TRIGGERS
-- ============================================

-- Trigger pour calculer le deadline automatiquement
DROP TRIGGER IF EXISTS trg_set_deadline ON data_subject_requests;
CREATE TRIGGER trg_set_deadline
  BEFORE INSERT ON data_subject_requests
  FOR EACH ROW EXECUTE FUNCTION set_response_deadline();

-- Triggers pour updated_at
DROP TRIGGER IF EXISTS trg_dsr_updated_at ON data_subject_requests;
CREATE TRIGGER trg_dsr_updated_at
  BEFORE UPDATE ON data_subject_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_consents_updated_at ON consents;
CREATE TRIGGER trg_consents_updated_at
  BEFORE UPDATE ON consents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_retention_updated_at ON data_retention_policies;
CREATE TRIGGER trg_retention_updated_at
  BEFORE UPDATE ON data_retention_policies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_processing_updated_at ON data_processing_activities;
CREATE TRIGGER trg_processing_updated_at
  BEFORE UPDATE ON data_processing_activities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- VÉRIFICATION
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ Migration CDP terminée avec succès!';
  RAISE NOTICE '';
  RAISE NOTICE 'Tables créées:';
  RAISE NOTICE '  - data_subject_requests';
  RAISE NOTICE '  - consents';
  RAISE NOTICE '  - personal_data_access_log';
  RAISE NOTICE '  - data_retention_policies';
  RAISE NOTICE '  - data_processing_activities';
  RAISE NOTICE '';
END $$;