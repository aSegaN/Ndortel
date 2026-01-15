--
-- PostgreSQL database dump
--

\restrict VHZ9zWjdCJLCmWodU1zfqFiK4g5eNtntvkqrFMwcbRkTuUc7eSmW6WE4Era5hsj

-- Dumped from database version 17.6 (Homebrew)
-- Dumped by pg_dump version 17.6 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: anonymize_expired_data(); Type: FUNCTION; Schema: public; Owner: asega
--

CREATE FUNCTION public.anonymize_expired_data() RETURNS integer
    LANGUAGE plpgsql
    AS $$
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
$$;


ALTER FUNCTION public.anonymize_expired_data() OWNER TO asega;

--
-- Name: calculate_log_hash(character varying, uuid, timestamp without time zone, text, character varying); Type: FUNCTION; Schema: public; Owner: asega
--

CREATE FUNCTION public.calculate_log_hash(p_action character varying, p_performed_by uuid, p_timestamp timestamp without time zone, p_details text, p_previous_hash character varying) RETURNS character varying
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_data TEXT;
    v_hash VARCHAR(64);
BEGIN
    v_data := p_action || p_performed_by::TEXT || p_timestamp::TEXT || 
              COALESCE(p_details, '') || p_previous_hash;
    
    v_hash := encode(digest(v_data, 'sha256'), 'hex');
    
    RETURN v_hash;
END;
$$;


ALTER FUNCTION public.calculate_log_hash(p_action character varying, p_performed_by uuid, p_timestamp timestamp without time zone, p_details text, p_previous_hash character varying) OWNER TO asega;

--
-- Name: check_overdue_requests(); Type: FUNCTION; Schema: public; Owner: asega
--

CREATE FUNCTION public.check_overdue_requests() RETURNS TABLE(request_id uuid, days_overdue integer, requester_email character varying)
    LANGUAGE plpgsql
    AS $$
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
$$;


ALTER FUNCTION public.check_overdue_requests() OWNER TO asega;

--
-- Name: generate_registration_number(uuid, integer); Type: FUNCTION; Schema: public; Owner: asega
--

CREATE FUNCTION public.generate_registration_number(p_center_id uuid, p_year integer) RETURNS character varying
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_center_code VARCHAR(4);
    v_sequence INTEGER;
    v_registration_number VARCHAR(50);
BEGIN
    -- Récupérer le code du centre
    SELECT code INTO v_center_code FROM centers WHERE id = p_center_id;
    
    IF v_center_code IS NULL THEN
        RAISE EXCEPTION 'Centre introuvable';
    END IF;
    
    -- Compter le nombre d'actes pour ce centre cette année
    SELECT COUNT(*) + 1 INTO v_sequence
    FROM birth_certificates
    WHERE center_id = p_center_id AND registration_year = p_year;
    
    -- Formater: 0001-2025-0001
    v_registration_number := LPAD(v_center_code, 4, '0') || '-' || 
                              p_year::VARCHAR || '-' || 
                              LPAD(v_sequence::VARCHAR, 4, '0');
    
    RETURN v_registration_number;
END;
$$;


ALTER FUNCTION public.generate_registration_number(p_center_id uuid, p_year integer) OWNER TO asega;

--
-- Name: set_response_deadline(); Type: FUNCTION; Schema: public; Owner: asega
--

CREATE FUNCTION public.set_response_deadline() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.response_deadline := NEW.request_date + INTERVAL '30 days';
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.set_response_deadline() OWNER TO asega;

--
-- Name: update_updated_at(); Type: FUNCTION; Schema: public; Owner: asega
--

CREATE FUNCTION public.update_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_updated_at() OWNER TO asega;

--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: asega
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_updated_at_column() OWNER TO asega;

--
-- Name: verify_log_chain(uuid); Type: FUNCTION; Schema: public; Owner: asega
--

CREATE FUNCTION public.verify_log_chain(p_certificate_id uuid) RETURNS TABLE(is_valid boolean, corrupted_log_id uuid)
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_log RECORD;
    v_prev_hash VARCHAR(64) := '0000000000000000000000000000000000000000000000000000000000000000';
    v_computed_hash VARCHAR(64);
BEGIN
    FOR v_log IN 
        SELECT * FROM action_logs 
        WHERE certificate_id = p_certificate_id 
        ORDER BY timestamp ASC
    LOOP
        -- Vérifier que previous_hash correspond
        IF v_log.previous_hash != v_prev_hash THEN
            is_valid := FALSE;
            corrupted_log_id := v_log.id;
            RETURN NEXT;
            RETURN;
        END IF;
        
        -- Calculer le hash et vérifier
        v_computed_hash := calculate_log_hash(
            v_log.action,
            v_log.performed_by,
            v_log.timestamp,
            v_log.details,
            v_log.previous_hash
        );
        
        IF v_computed_hash != v_log.hash THEN
            is_valid := FALSE;
            corrupted_log_id := v_log.id;
            RETURN NEXT;
            RETURN;
        END IF;
        
        v_prev_hash := v_log.hash;
    END LOOP;
    
    is_valid := TRUE;
    corrupted_log_id := NULL;
    RETURN NEXT;
END;
$$;


ALTER FUNCTION public.verify_log_chain(p_certificate_id uuid) OWNER TO asega;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: action_logs; Type: TABLE; Schema: public; Owner: asega
--

CREATE TABLE public.action_logs (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    certificate_id uuid NOT NULL,
    action character varying(255) NOT NULL,
    performed_by uuid NOT NULL,
    "timestamp" timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    details text,
    hash character varying(64) NOT NULL,
    previous_hash character varying(64) NOT NULL,
    CONSTRAINT valid_hash CHECK (((hash)::text ~ '^[a-f0-9]{64}$'::text)),
    CONSTRAINT valid_previous_hash CHECK (((previous_hash)::text ~ '^[a-f0-9]{64}$'::text))
);


ALTER TABLE public.action_logs OWNER TO asega;

--
-- Name: birth_certificates; Type: TABLE; Schema: public; Owner: asega
--

CREATE TABLE public.birth_certificates (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    registration_number character varying(50) NOT NULL,
    status character varying(20) NOT NULL,
    center_id uuid NOT NULL,
    registration_year integer NOT NULL,
    declaration_date timestamp without time zone NOT NULL,
    created_by uuid NOT NULL,
    child_first_name character varying(255) NOT NULL,
    child_last_name character varying(255) NOT NULL,
    child_gender character(1) NOT NULL,
    birth_date date NOT NULL,
    birth_time time without time zone NOT NULL,
    birth_place character varying(255) NOT NULL,
    hospital character varying(255) NOT NULL,
    hospital_certificate_scan text,
    father_first_name character varying(255) NOT NULL,
    father_last_name character varying(255) NOT NULL,
    father_birth_date date NOT NULL,
    father_occupation character varying(255),
    father_birth_place character varying(255) NOT NULL,
    father_address text NOT NULL,
    father_nin character varying(13),
    father_cni_recto text,
    father_cni_verso text,
    mother_first_name character varying(255) NOT NULL,
    mother_last_name character varying(255) NOT NULL,
    mother_birth_date date NOT NULL,
    mother_occupation character varying(255),
    mother_birth_place character varying(255) NOT NULL,
    mother_address text NOT NULL,
    mother_nin character varying(13),
    mother_cni_recto text,
    mother_cni_verso text,
    is_late_registration boolean DEFAULT false,
    judgment_court character varying(255),
    judgment_date date,
    judgment_number character varying(100),
    judgment_registration_date date,
    signed_by character varying(255),
    signed_at timestamp without time zone,
    signature_hash character varying(255),
    pki_signature jsonb,
    fraud_analysis jsonb,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    images_migrated boolean DEFAULT false,
    document_references jsonb,
    CONSTRAINT birth_certificates_child_gender_check CHECK ((child_gender = ANY (ARRAY['M'::bpchar, 'F'::bpchar]))),
    CONSTRAINT birth_certificates_status_check CHECK (((status)::text = ANY ((ARRAY['DRAFT'::character varying, 'PENDING'::character varying, 'SIGNED'::character varying, 'DELIVERED'::character varying])::text[]))),
    CONSTRAINT valid_registration_number CHECK (((registration_number)::text ~ '^\d{4}-\d{4}-\d{4}$'::text))
);


ALTER TABLE public.birth_certificates OWNER TO asega;

--
-- Name: consents; Type: TABLE; Schema: public; Owner: asega
--

CREATE TABLE public.consents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_identifier character varying(255) NOT NULL,
    purpose character varying(100) NOT NULL,
    purpose_description text,
    granted boolean DEFAULT false NOT NULL,
    granted_at timestamp with time zone,
    revoked_at timestamp with time zone,
    collection_method character varying(50) DEFAULT 'FORM'::character varying,
    ip_address inet,
    user_agent text,
    consent_text text,
    consent_version character varying(20),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.consents OWNER TO asega;

--
-- Name: TABLE consents; Type: COMMENT; Schema: public; Owner: asega
--

COMMENT ON TABLE public.consents IS 'Registre des consentements pour traitements non obligatoires';


--
-- Name: cdp_consent_statistics; Type: VIEW; Schema: public; Owner: asega
--

CREATE VIEW public.cdp_consent_statistics AS
 SELECT purpose,
    count(*) AS total,
    count(*) FILTER (WHERE (granted = true)) AS granted,
    count(*) FILTER (WHERE ((granted = false) OR (revoked_at IS NOT NULL))) AS revoked,
    ((((count(*) FILTER (WHERE (granted = true)))::numeric * 100.0) / (NULLIF(count(*), 0))::numeric))::numeric(5,2) AS consent_rate
   FROM public.consents
  GROUP BY purpose
  ORDER BY (count(*)) DESC;


ALTER VIEW public.cdp_consent_statistics OWNER TO asega;

--
-- Name: personal_data_access_log; Type: TABLE; Schema: public; Owner: asega
--

CREATE TABLE public.personal_data_access_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    user_role character varying(50),
    data_subject_id character varying(255) NOT NULL,
    data_subject_type character varying(50),
    data_type character varying(100) NOT NULL,
    data_id uuid NOT NULL,
    data_fields text[],
    action character varying(50) NOT NULL,
    accessed_at timestamp with time zone DEFAULT now(),
    ip_address inet,
    user_agent text,
    justification text,
    legal_basis character varying(100),
    request_id character varying(255),
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT personal_data_access_log_action_check CHECK (((action)::text = ANY ((ARRAY['VIEW'::character varying, 'EXPORT'::character varying, 'PRINT'::character varying, 'MODIFY'::character varying, 'DELETE'::character varying, 'CREATE'::character varying])::text[])))
);


ALTER TABLE public.personal_data_access_log OWNER TO asega;

--
-- Name: TABLE personal_data_access_log; Type: COMMENT; Schema: public; Owner: asega
--

COMMENT ON TABLE public.personal_data_access_log IS 'Journal d''accès aux données personnelles pour audit CDP';


--
-- Name: cdp_data_access_statistics; Type: VIEW; Schema: public; Owner: asega
--

CREATE VIEW public.cdp_data_access_statistics AS
 SELECT date_trunc('day'::text, accessed_at) AS day,
    data_type,
    action,
    count(*) AS access_count,
    count(DISTINCT user_id) AS unique_users,
    count(DISTINCT data_subject_id) AS unique_subjects
   FROM public.personal_data_access_log
  WHERE (accessed_at > (now() - '30 days'::interval))
  GROUP BY (date_trunc('day'::text, accessed_at)), data_type, action
  ORDER BY (date_trunc('day'::text, accessed_at)) DESC, (count(*)) DESC;


ALTER VIEW public.cdp_data_access_statistics OWNER TO asega;

--
-- Name: data_subject_requests; Type: TABLE; Schema: public; Owner: asega
--

CREATE TABLE public.data_subject_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    type character varying(20) NOT NULL,
    status character varying(20) DEFAULT 'PENDING'::character varying NOT NULL,
    requester_name character varying(255) NOT NULL,
    requester_email character varying(255) NOT NULL,
    requester_phone character varying(50),
    requester_id_document character varying(255),
    request_details text,
    request_date timestamp with time zone DEFAULT now(),
    acknowledgment_date timestamp with time zone,
    response_date timestamp with time zone,
    response_deadline timestamp with time zone,
    response_content text,
    response_documents text[],
    rejection_reason text,
    processed_by uuid,
    assigned_to uuid,
    related_data_ids text[],
    data_categories text[],
    ip_address inet,
    user_agent text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT data_subject_requests_status_check CHECK (((status)::text = ANY ((ARRAY['PENDING'::character varying, 'IN_PROGRESS'::character varying, 'COMPLETED'::character varying, 'REJECTED'::character varying])::text[]))),
    CONSTRAINT data_subject_requests_type_check CHECK (((type)::text = ANY ((ARRAY['ACCESS'::character varying, 'RECTIFICATION'::character varying, 'OPPOSITION'::character varying, 'INFORMATION'::character varying])::text[])))
);


ALTER TABLE public.data_subject_requests OWNER TO asega;

--
-- Name: TABLE data_subject_requests; Type: COMMENT; Schema: public; Owner: asega
--

COMMENT ON TABLE public.data_subject_requests IS 'Demandes de droits des personnes concernées (CDP - Loi 2008-12)';


--
-- Name: COLUMN data_subject_requests.type; Type: COMMENT; Schema: public; Owner: asega
--

COMMENT ON COLUMN public.data_subject_requests.type IS 'ACCESS=Art.62, RECTIFICATION=Art.68, OPPOSITION=Art.69';


--
-- Name: COLUMN data_subject_requests.response_deadline; Type: COMMENT; Schema: public; Owner: asega
--

COMMENT ON COLUMN public.data_subject_requests.response_deadline IS 'Délai légal: 30 jours après réception';


--
-- Name: cdp_monthly_requests_report; Type: VIEW; Schema: public; Owner: asega
--

CREATE VIEW public.cdp_monthly_requests_report AS
 SELECT date_trunc('month'::text, request_date) AS month,
    type,
    count(*) AS total_requests,
    count(*) FILTER (WHERE ((status)::text = 'COMPLETED'::text)) AS completed,
    count(*) FILTER (WHERE ((status)::text = 'PENDING'::text)) AS pending,
    count(*) FILTER (WHERE ((status)::text = 'REJECTED'::text)) AS rejected,
    (avg((EXTRACT(epoch FROM (response_date - request_date)) / (86400)::numeric)))::numeric(10,2) AS avg_response_days,
    count(*) FILTER (WHERE (response_date > response_deadline)) AS overdue_responses
   FROM public.data_subject_requests
  GROUP BY (date_trunc('month'::text, request_date)), type
  ORDER BY (date_trunc('month'::text, request_date)) DESC, type;


ALTER VIEW public.cdp_monthly_requests_report OWNER TO asega;

--
-- Name: cdp_overdue_requests; Type: VIEW; Schema: public; Owner: asega
--

CREATE VIEW public.cdp_overdue_requests AS
 SELECT id,
    type,
    requester_name,
    requester_email,
    request_date,
    response_deadline,
    (now() - response_deadline) AS overdue_by,
    assigned_to
   FROM public.data_subject_requests
  WHERE (((status)::text = ANY ((ARRAY['PENDING'::character varying, 'IN_PROGRESS'::character varying])::text[])) AND (response_deadline < now()))
  ORDER BY response_deadline;


ALTER VIEW public.cdp_overdue_requests OWNER TO asega;

--
-- Name: centers; Type: TABLE; Schema: public; Owner: asega
--

CREATE TABLE public.centers (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    code character varying(4) NOT NULL,
    name character varying(255) NOT NULL,
    region character varying(100) NOT NULL,
    department character varying(100) NOT NULL,
    arrondissement character varying(100),
    commune character varying(100) NOT NULL,
    address text NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.centers OWNER TO asega;

--
-- Name: center_statistics; Type: VIEW; Schema: public; Owner: asega
--

CREATE VIEW public.center_statistics AS
 SELECT c.id,
    c.name,
    c.region,
    count(bc.id) AS total_certificates,
    count(
        CASE
            WHEN ((bc.status)::text = 'DRAFT'::text) THEN 1
            ELSE NULL::integer
        END) AS drafts,
    count(
        CASE
            WHEN ((bc.status)::text = 'PENDING'::text) THEN 1
            ELSE NULL::integer
        END) AS pending,
    count(
        CASE
            WHEN ((bc.status)::text = 'SIGNED'::text) THEN 1
            ELSE NULL::integer
        END) AS signed,
    count(
        CASE
            WHEN ((bc.status)::text = 'DELIVERED'::text) THEN 1
            ELSE NULL::integer
        END) AS delivered
   FROM (public.centers c
     LEFT JOIN public.birth_certificates bc ON ((c.id = bc.center_id)))
  GROUP BY c.id, c.name, c.region;


ALTER VIEW public.center_statistics OWNER TO asega;

--
-- Name: users; Type: TABLE; Schema: public; Owner: asega
--

CREATE TABLE public.users (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(255) NOT NULL,
    email character varying(255) NOT NULL,
    password_hash text NOT NULL,
    role character varying(50) NOT NULL,
    center_id uuid,
    pki_certificate_id character varying(100),
    birth_date date NOT NULL,
    registration_number character varying(50) NOT NULL,
    active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    last_login timestamp without time zone,
    CONSTRAINT users_role_check CHECK (((role)::text = ANY ((ARRAY['ADMINISTRATEUR'::character varying, 'AGENT_SAISIE'::character varying, 'VALIDATEUR'::character varying, 'RESPONSABLE'::character varying])::text[]))),
    CONSTRAINT valid_email CHECK (((email)::text ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'::text))
);


ALTER TABLE public.users OWNER TO asega;

--
-- Name: certificates_full; Type: VIEW; Schema: public; Owner: asega
--

CREATE VIEW public.certificates_full AS
 SELECT bc.id,
    bc.registration_number,
    bc.status,
    bc.center_id,
    bc.registration_year,
    bc.declaration_date,
    bc.created_by,
    bc.child_first_name,
    bc.child_last_name,
    bc.child_gender,
    bc.birth_date,
    bc.birth_time,
    bc.birth_place,
    bc.hospital,
    bc.hospital_certificate_scan,
    bc.father_first_name,
    bc.father_last_name,
    bc.father_birth_date,
    bc.father_occupation,
    bc.father_birth_place,
    bc.father_address,
    bc.father_nin,
    bc.father_cni_recto,
    bc.father_cni_verso,
    bc.mother_first_name,
    bc.mother_last_name,
    bc.mother_birth_date,
    bc.mother_occupation,
    bc.mother_birth_place,
    bc.mother_address,
    bc.mother_nin,
    bc.mother_cni_recto,
    bc.mother_cni_verso,
    bc.is_late_registration,
    bc.judgment_court,
    bc.judgment_date,
    bc.judgment_number,
    bc.judgment_registration_date,
    bc.signed_by,
    bc.signed_at,
    bc.signature_hash,
    bc.pki_signature,
    bc.fraud_analysis,
    bc.created_at,
    bc.updated_at,
    c.name AS center_name,
    c.region AS center_region,
    u.name AS created_by_name,
    u.email AS created_by_email
   FROM ((public.birth_certificates bc
     JOIN public.centers c ON ((bc.center_id = c.id)))
     JOIN public.users u ON ((bc.created_by = u.id)));


ALTER VIEW public.certificates_full OWNER TO asega;

--
-- Name: data_processing_activities; Type: TABLE; Schema: public; Owner: asega
--

CREATE TABLE public.data_processing_activities (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    activity_id character varying(20) NOT NULL,
    activity_name character varying(255) NOT NULL,
    purpose text NOT NULL,
    legal_basis character varying(100) NOT NULL,
    legal_basis_details text,
    data_categories text[] NOT NULL,
    sensitive_data boolean DEFAULT false,
    sensitive_data_types text[],
    data_subjects text[] NOT NULL,
    estimated_volume character varying(100),
    recipients text[],
    third_party_processors text[],
    transfers_outside_senegal boolean DEFAULT false,
    transfer_destinations text[],
    transfer_safeguards text,
    retention_period character varying(100),
    retention_policy_id uuid,
    security_measures text[],
    active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    last_review_date date,
    next_review_date date
);


ALTER TABLE public.data_processing_activities OWNER TO asega;

--
-- Name: TABLE data_processing_activities; Type: COMMENT; Schema: public; Owner: asega
--

COMMENT ON TABLE public.data_processing_activities IS 'Registre des activités de traitement (Article 49 - Loi 2008-12)';


--
-- Name: data_retention_policies; Type: TABLE; Schema: public; Owner: asega
--

CREATE TABLE public.data_retention_policies (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    data_category character varying(100) NOT NULL,
    data_description text,
    retention_period interval,
    retention_period_description character varying(255),
    is_permanent boolean DEFAULT false,
    legal_basis text NOT NULL,
    legal_reference character varying(255),
    expiry_action character varying(50) DEFAULT 'ARCHIVE'::character varying,
    active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.data_retention_policies OWNER TO asega;

--
-- Name: TABLE data_retention_policies; Type: COMMENT; Schema: public; Owner: asega
--

COMMENT ON TABLE public.data_retention_policies IS 'Politiques de conservation selon les catégories de données';


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: asega
--

CREATE TABLE public.notifications (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid,
    role character varying(50),
    center_id uuid,
    title character varying(255) NOT NULL,
    message text NOT NULL,
    type character varying(20) NOT NULL,
    "timestamp" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    read boolean DEFAULT false,
    related_id uuid,
    CONSTRAINT notification_target CHECK (((user_id IS NOT NULL) OR (role IS NOT NULL) OR (center_id IS NOT NULL))),
    CONSTRAINT notifications_type_check CHECK (((type)::text = ANY ((ARRAY['info'::character varying, 'success'::character varying, 'warning'::character varying, 'error'::character varying])::text[])))
);


ALTER TABLE public.notifications OWNER TO asega;

--
-- Name: sync_queue; Type: TABLE; Schema: public; Owner: asega
--

CREATE TABLE public.sync_queue (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    type character varying(50) NOT NULL,
    payload jsonb NOT NULL,
    "timestamp" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    attempts integer DEFAULT 0,
    last_attempt timestamp without time zone,
    status character varying(20) DEFAULT 'PENDING'::character varying,
    error_message text,
    CONSTRAINT sync_queue_status_check CHECK (((status)::text = ANY ((ARRAY['PENDING'::character varying, 'PROCESSING'::character varying, 'COMPLETED'::character varying, 'FAILED'::character varying])::text[]))),
    CONSTRAINT sync_queue_type_check CHECK (((type)::text = ANY ((ARRAY['CREATE'::character varying, 'UPDATE'::character varying, 'STATUS_CHANGE'::character varying])::text[])))
);


ALTER TABLE public.sync_queue OWNER TO asega;

--
-- Data for Name: action_logs; Type: TABLE DATA; Schema: public; Owner: asega
--

COPY public.action_logs (id, certificate_id, action, performed_by, "timestamp", details, hash, previous_hash) FROM stdin;
\.


--
-- Data for Name: birth_certificates; Type: TABLE DATA; Schema: public; Owner: asega
--

COPY public.birth_certificates (id, registration_number, status, center_id, registration_year, declaration_date, created_by, child_first_name, child_last_name, child_gender, birth_date, birth_time, birth_place, hospital, hospital_certificate_scan, father_first_name, father_last_name, father_birth_date, father_occupation, father_birth_place, father_address, father_nin, father_cni_recto, father_cni_verso, mother_first_name, mother_last_name, mother_birth_date, mother_occupation, mother_birth_place, mother_address, mother_nin, mother_cni_recto, mother_cni_verso, is_late_registration, judgment_court, judgment_date, judgment_number, judgment_registration_date, signed_by, signed_at, signature_hash, pki_signature, fraud_analysis, created_at, updated_at, images_migrated, document_references) FROM stdin;
\.


--
-- Data for Name: centers; Type: TABLE DATA; Schema: public; Owner: asega
--

COPY public.centers (id, code, name, region, department, arrondissement, commune, address, created_at, updated_at) FROM stdin;
0de67f14-eec3-4a54-a46b-cb73a525e89b	1755	Centre de Abass Ndao	Dakar	Dakar	\N	Médina	Avenue Cheikh Anta Diop, Dann Gueule Tapée	2025-12-25 08:31:41.238041	2025-12-25 08:31:41.238041
\.


--
-- Data for Name: consents; Type: TABLE DATA; Schema: public; Owner: asega
--

COPY public.consents (id, user_identifier, purpose, purpose_description, granted, granted_at, revoked_at, collection_method, ip_address, user_agent, consent_text, consent_version, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: data_processing_activities; Type: TABLE DATA; Schema: public; Owner: asega
--

COPY public.data_processing_activities (id, activity_id, activity_name, purpose, legal_basis, legal_basis_details, data_categories, sensitive_data, sensitive_data_types, data_subjects, estimated_volume, recipients, third_party_processors, transfers_outside_senegal, transfer_destinations, transfer_safeguards, retention_period, retention_policy_id, security_measures, active, created_at, updated_at, last_review_date, next_review_date) FROM stdin;
eea00caa-7fc9-483e-bded-fbc60a00e4f9	TRT-001	Gestion des déclarations de naissance	Enregistrement et gestion des actes de naissance conformément au Code de la Famille	Obligation légale	\N	{Identité,Filiation,Témoins}	f	\N	{Nouveau-nés,Parents,Témoins,Déclarants}	\N	{"Officiers d'état civil","Ministère de la Justice",ANSD}	\N	f	\N	\N	Conservation permanente	\N	{"Chiffrement AES-256","Contrôle RBAC",Journalisation}	t	2025-12-27 17:18:12.038802+00	2025-12-27 17:18:12.038802+00	\N	\N
6c3cea54-7c2f-474a-a9b3-2a8859562b76	TRT-002	Authentification et gestion des utilisateurs	Contrôle d'accès au système, traçabilité des actions	Intérêt légitime	\N	{"Identité professionnelle",Credentials,"Logs connexion"}	f	\N	{"Agents d'état civil",Administrateurs,Validateurs}	\N	{"Service informatique","Audit interne"}	\N	f	\N	\N	Durée fonction + 5 ans	\N	{"Hachage bcrypt","JWT sécurisé","Rate limiting","Audit trail"}	t	2025-12-27 17:18:12.038802+00	2025-12-27 17:18:12.038802+00	\N	\N
59615bf5-d0bd-4527-9bd2-3952ce329c48	TRT-003	Stockage des documents numérisés	Archivage sécurisé des pièces justificatives et photos	Obligation légale	\N	{"Photos d'identité","CNI numérisées","Certificats médicaux"}	f	\N	{Déclarants,Nouveau-nés,Parents}	\N	{"Officiers d'état civil autorisés"}	\N	f	\N	\N	Conservation permanente	\N	{"Chiffrement AES-256-GCM","Stockage MinIO isolé","Clés séparées"}	t	2025-12-27 17:18:12.038802+00	2025-12-27 17:18:12.038802+00	\N	\N
74e61a9e-acdd-42e1-8b4b-f04c9fac4d10	TRT-004	Signature électronique des actes	Authentification et intégrité des actes d'état civil	Obligation légale	\N	{"Certificats signature",Horodatage,"Hash documents"}	f	\N	{"Officiers d'état civil signataires"}	\N	{"Autorités de vérification",Tribunaux}	\N	f	\N	\N	Conservation permanente	\N	{"PKI qualifiée","HSM pour clés privées"}	t	2025-12-27 17:18:12.038802+00	2025-12-27 17:18:12.038802+00	\N	\N
a34c254e-4ee7-490a-b2a7-2fc28901239a	TRT-005	Journalisation et audit	Traçabilité des opérations, détection d'anomalies, conformité	Intérêt légitime / Obligation légale	\N	{"Actions utilisateurs",Timestamps,"Adresses IP"}	f	\N	{"Tous les utilisateurs"}	\N	{"Auditeurs internes","CDP sur demande"}	\N	f	\N	\N	Logs app: 1 an, Audit: 5 ans	\N	{"Logs immuables",Chiffrement,"Accès restreint"}	t	2025-12-27 17:18:12.038802+00	2025-12-27 17:18:12.038802+00	\N	\N
5f206092-19e9-408f-af6e-32a218c45b47	TRT-006	Statistiques démographiques	Production de statistiques anonymisées	Mission d'intérêt public	\N	{"Données agrégées anonymisées"}	f	\N	{"Aucune (données anonymisées)"}	\N	{ANSD,Ministères}	\N	f	\N	\N	Conservation permanente	\N	{"Anonymisation irréversible","Agrégation min 10 individus"}	t	2025-12-27 17:18:12.038802+00	2025-12-27 17:18:12.038802+00	\N	\N
\.


--
-- Data for Name: data_retention_policies; Type: TABLE DATA; Schema: public; Owner: asega
--

COPY public.data_retention_policies (id, data_category, data_description, retention_period, retention_period_description, is_permanent, legal_basis, legal_reference, expiry_action, active, created_at, updated_at) FROM stdin;
4319cfb6-a4a1-41fc-852c-144e915dfc82	CIVIL_STATUS_RECORDS	Actes d'état civil (naissance, mariage, décès)	\N	\N	t	Obligation légale de conservation permanente des registres d'état civil	Code de la Famille, Loi n°72-61	ARCHIVE	t	2025-12-27 17:18:12.032145+00	2025-12-27 17:18:12.032145+00
8da46123-9d75-4099-84e8-8a8485db503d	CIVIL_STATUS_DOCUMENTS	Documents numérisés liés aux actes d'état civil	\N	\N	t	Conservation avec l'acte auquel ils sont rattachés	Code de la Famille	ARCHIVE	t	2025-12-27 17:18:12.032145+00	2025-12-27 17:18:12.032145+00
9bb9aa21-2318-4306-a4ef-e091b5843c07	USER_ACCOUNTS	Comptes utilisateurs du système	5 years	\N	f	Durée de la fonction + conservation pour audit	\N	ARCHIVE	t	2025-12-27 17:18:12.032145+00	2025-12-27 17:18:12.032145+00
dd8c7b15-9056-45ee-b346-327aa74db8c4	CONNECTION_LOGS	Logs de connexion	1 year	\N	f	Sécurité du système et traçabilité	Loi n° 2008-12, Art. 71	ARCHIVE	t	2025-12-27 17:18:12.032145+00	2025-12-27 17:18:12.032145+00
9f73acd7-4ae6-4589-b5bf-d967535ad54d	AUDIT_LOGS	Logs d'audit des actions	5 years	\N	f	Traçabilité administrative et contrôle	Loi n° 2008-12	ARCHIVE	t	2025-12-27 17:18:12.032145+00	2025-12-27 17:18:12.032145+00
\.


--
-- Data for Name: data_subject_requests; Type: TABLE DATA; Schema: public; Owner: asega
--

COPY public.data_subject_requests (id, type, status, requester_name, requester_email, requester_phone, requester_id_document, request_details, request_date, acknowledgment_date, response_date, response_deadline, response_content, response_documents, rejection_reason, processed_by, assigned_to, related_data_ids, data_categories, ip_address, user_agent, created_at, updated_at) FROM stdin;
2f8bbd07-53f5-4040-abaa-06d1871416ec	ACCESS	PENDING	Moussa Diallo	moussa.diallo@test.sn	\N	\N	Je souhaite accéder à toutes mes données personnelles	2025-12-27 17:30:12.067981+00	\N	\N	2026-01-26 17:30:12.067981+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	2025-12-27 17:30:12.067981+00	2025-12-27 17:30:12.067981+00
\.


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: asega
--

COPY public.notifications (id, user_id, role, center_id, title, message, type, "timestamp", read, related_id) FROM stdin;
\.


--
-- Data for Name: personal_data_access_log; Type: TABLE DATA; Schema: public; Owner: asega
--

COPY public.personal_data_access_log (id, user_id, user_role, data_subject_id, data_subject_type, data_type, data_id, data_fields, action, accessed_at, ip_address, user_agent, justification, legal_basis, request_id, created_at) FROM stdin;
\.


--
-- Data for Name: sync_queue; Type: TABLE DATA; Schema: public; Owner: asega
--

COPY public.sync_queue (id, type, payload, "timestamp", attempts, last_attempt, status, error_message) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: asega
--

COPY public.users (id, name, email, password_hash, role, center_id, pki_certificate_id, birth_date, registration_number, active, created_at, updated_at, last_login) FROM stdin;
5001bd2e-7652-4844-9b88-48abcc4bdf33	Fatima BIAYE	fatimabiaye@gmail.com	$2b$12$ts9y.cFylG13PElFwfffyO9/luLoug7bBkuhGCNnRPLlLrNOAfjr6	VALIDATEUR	0de67f14-eec3-4a54-a46b-cb73a525e89b	\N	1988-11-19	AGT-2005-001	t	2025-12-25 08:33:27.86992	2025-12-27 18:30:38.78026	\N
cf79c66f-43f8-4c3a-a1db-5aaad6f5a993	Abdoulaye Séga NDIAYE	asegandiaye@gmail.com	$2a$12$B3Hw7rTJPXyJXyWi38uZjuRxvpeDWdBM9frH6.0Df34dpn0yaOp62	ADMINISTRATEUR	\N	\N	1989-03-20	ADM-2025-002	t	2025-12-25 08:25:36.427363	2026-01-10 06:55:27.310113	\N
\.


--
-- Name: action_logs action_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: asega
--

ALTER TABLE ONLY public.action_logs
    ADD CONSTRAINT action_logs_pkey PRIMARY KEY (id);


--
-- Name: birth_certificates birth_certificates_pkey; Type: CONSTRAINT; Schema: public; Owner: asega
--

ALTER TABLE ONLY public.birth_certificates
    ADD CONSTRAINT birth_certificates_pkey PRIMARY KEY (id);


--
-- Name: birth_certificates birth_certificates_registration_number_key; Type: CONSTRAINT; Schema: public; Owner: asega
--

ALTER TABLE ONLY public.birth_certificates
    ADD CONSTRAINT birth_certificates_registration_number_key UNIQUE (registration_number);


--
-- Name: centers centers_pkey; Type: CONSTRAINT; Schema: public; Owner: asega
--

ALTER TABLE ONLY public.centers
    ADD CONSTRAINT centers_pkey PRIMARY KEY (id);


--
-- Name: consents consents_pkey; Type: CONSTRAINT; Schema: public; Owner: asega
--

ALTER TABLE ONLY public.consents
    ADD CONSTRAINT consents_pkey PRIMARY KEY (id);


--
-- Name: consents consents_user_identifier_purpose_key; Type: CONSTRAINT; Schema: public; Owner: asega
--

ALTER TABLE ONLY public.consents
    ADD CONSTRAINT consents_user_identifier_purpose_key UNIQUE (user_identifier, purpose);


--
-- Name: data_processing_activities data_processing_activities_activity_id_key; Type: CONSTRAINT; Schema: public; Owner: asega
--

ALTER TABLE ONLY public.data_processing_activities
    ADD CONSTRAINT data_processing_activities_activity_id_key UNIQUE (activity_id);


--
-- Name: data_processing_activities data_processing_activities_pkey; Type: CONSTRAINT; Schema: public; Owner: asega
--

ALTER TABLE ONLY public.data_processing_activities
    ADD CONSTRAINT data_processing_activities_pkey PRIMARY KEY (id);


--
-- Name: data_retention_policies data_retention_policies_data_category_key; Type: CONSTRAINT; Schema: public; Owner: asega
--

ALTER TABLE ONLY public.data_retention_policies
    ADD CONSTRAINT data_retention_policies_data_category_key UNIQUE (data_category);


--
-- Name: data_retention_policies data_retention_policies_pkey; Type: CONSTRAINT; Schema: public; Owner: asega
--

ALTER TABLE ONLY public.data_retention_policies
    ADD CONSTRAINT data_retention_policies_pkey PRIMARY KEY (id);


--
-- Name: data_subject_requests data_subject_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: asega
--

ALTER TABLE ONLY public.data_subject_requests
    ADD CONSTRAINT data_subject_requests_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: asega
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: personal_data_access_log personal_data_access_log_pkey; Type: CONSTRAINT; Schema: public; Owner: asega
--

ALTER TABLE ONLY public.personal_data_access_log
    ADD CONSTRAINT personal_data_access_log_pkey PRIMARY KEY (id);


--
-- Name: sync_queue sync_queue_pkey; Type: CONSTRAINT; Schema: public; Owner: asega
--

ALTER TABLE ONLY public.sync_queue
    ADD CONSTRAINT sync_queue_pkey PRIMARY KEY (id);


--
-- Name: centers unique_center_code; Type: CONSTRAINT; Schema: public; Owner: asega
--

ALTER TABLE ONLY public.centers
    ADD CONSTRAINT unique_center_code UNIQUE (code);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: asega
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: asega
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_registration_number_key; Type: CONSTRAINT; Schema: public; Owner: asega
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_registration_number_key UNIQUE (registration_number);


--
-- Name: idx_centers_code; Type: INDEX; Schema: public; Owner: asega
--

CREATE INDEX idx_centers_code ON public.centers USING btree (code);


--
-- Name: idx_centers_region; Type: INDEX; Schema: public; Owner: asega
--

CREATE INDEX idx_centers_region ON public.centers USING btree (region);


--
-- Name: idx_certificates_birth_date; Type: INDEX; Schema: public; Owner: asega
--

CREATE INDEX idx_certificates_birth_date ON public.birth_certificates USING btree (birth_date);


--
-- Name: idx_certificates_center; Type: INDEX; Schema: public; Owner: asega
--

CREATE INDEX idx_certificates_center ON public.birth_certificates USING btree (center_id);


--
-- Name: idx_certificates_child_name; Type: INDEX; Schema: public; Owner: asega
--

CREATE INDEX idx_certificates_child_name ON public.birth_certificates USING btree (child_last_name, child_first_name);


--
-- Name: idx_certificates_created_by; Type: INDEX; Schema: public; Owner: asega
--

CREATE INDEX idx_certificates_created_by ON public.birth_certificates USING btree (created_by);


--
-- Name: idx_certificates_declaration; Type: INDEX; Schema: public; Owner: asega
--

CREATE INDEX idx_certificates_declaration ON public.birth_certificates USING btree (declaration_date);


--
-- Name: idx_certificates_registration; Type: INDEX; Schema: public; Owner: asega
--

CREATE INDEX idx_certificates_registration ON public.birth_certificates USING btree (registration_number);


--
-- Name: idx_certificates_status; Type: INDEX; Schema: public; Owner: asega
--

CREATE INDEX idx_certificates_status ON public.birth_certificates USING btree (status);


--
-- Name: idx_certificates_year; Type: INDEX; Schema: public; Owner: asega
--

CREATE INDEX idx_certificates_year ON public.birth_certificates USING btree (registration_year);


--
-- Name: idx_consents_granted; Type: INDEX; Schema: public; Owner: asega
--

CREATE INDEX idx_consents_granted ON public.consents USING btree (granted) WHERE (granted = true);


--
-- Name: idx_consents_purpose; Type: INDEX; Schema: public; Owner: asega
--

CREATE INDEX idx_consents_purpose ON public.consents USING btree (purpose);


--
-- Name: idx_consents_user; Type: INDEX; Schema: public; Owner: asega
--

CREATE INDEX idx_consents_user ON public.consents USING btree (user_identifier);


--
-- Name: idx_dsr_date; Type: INDEX; Schema: public; Owner: asega
--

CREATE INDEX idx_dsr_date ON public.data_subject_requests USING btree (request_date);


--
-- Name: idx_dsr_deadline; Type: INDEX; Schema: public; Owner: asega
--

CREATE INDEX idx_dsr_deadline ON public.data_subject_requests USING btree (response_deadline) WHERE ((status)::text = 'PENDING'::text);


--
-- Name: idx_dsr_email; Type: INDEX; Schema: public; Owner: asega
--

CREATE INDEX idx_dsr_email ON public.data_subject_requests USING btree (requester_email);


--
-- Name: idx_dsr_status; Type: INDEX; Schema: public; Owner: asega
--

CREATE INDEX idx_dsr_status ON public.data_subject_requests USING btree (status);


--
-- Name: idx_dsr_type; Type: INDEX; Schema: public; Owner: asega
--

CREATE INDEX idx_dsr_type ON public.data_subject_requests USING btree (type);


--
-- Name: idx_logs_certificate; Type: INDEX; Schema: public; Owner: asega
--

CREATE INDEX idx_logs_certificate ON public.action_logs USING btree (certificate_id);


--
-- Name: idx_logs_performed_by; Type: INDEX; Schema: public; Owner: asega
--

CREATE INDEX idx_logs_performed_by ON public.action_logs USING btree (performed_by);


--
-- Name: idx_logs_timestamp; Type: INDEX; Schema: public; Owner: asega
--

CREATE INDEX idx_logs_timestamp ON public.action_logs USING btree ("timestamp" DESC);


--
-- Name: idx_notifications_center; Type: INDEX; Schema: public; Owner: asega
--

CREATE INDEX idx_notifications_center ON public.notifications USING btree (center_id);


--
-- Name: idx_notifications_read; Type: INDEX; Schema: public; Owner: asega
--

CREATE INDEX idx_notifications_read ON public.notifications USING btree (read);


--
-- Name: idx_notifications_role; Type: INDEX; Schema: public; Owner: asega
--

CREATE INDEX idx_notifications_role ON public.notifications USING btree (role);


--
-- Name: idx_notifications_timestamp; Type: INDEX; Schema: public; Owner: asega
--

CREATE INDEX idx_notifications_timestamp ON public.notifications USING btree ("timestamp" DESC);


--
-- Name: idx_notifications_user; Type: INDEX; Schema: public; Owner: asega
--

CREATE INDEX idx_notifications_user ON public.notifications USING btree (user_id);


--
-- Name: idx_pda_log_date; Type: INDEX; Schema: public; Owner: asega
--

CREATE INDEX idx_pda_log_date ON public.personal_data_access_log USING btree (accessed_at);


--
-- Name: idx_pda_log_subject; Type: INDEX; Schema: public; Owner: asega
--

CREATE INDEX idx_pda_log_subject ON public.personal_data_access_log USING btree (data_subject_id);


--
-- Name: idx_pda_log_type; Type: INDEX; Schema: public; Owner: asega
--

CREATE INDEX idx_pda_log_type ON public.personal_data_access_log USING btree (data_type);


--
-- Name: idx_pda_log_user; Type: INDEX; Schema: public; Owner: asega
--

CREATE INDEX idx_pda_log_user ON public.personal_data_access_log USING btree (user_id);


--
-- Name: idx_sync_queue_status; Type: INDEX; Schema: public; Owner: asega
--

CREATE INDEX idx_sync_queue_status ON public.sync_queue USING btree (status);


--
-- Name: idx_sync_queue_timestamp; Type: INDEX; Schema: public; Owner: asega
--

CREATE INDEX idx_sync_queue_timestamp ON public.sync_queue USING btree ("timestamp");


--
-- Name: idx_users_active; Type: INDEX; Schema: public; Owner: asega
--

CREATE INDEX idx_users_active ON public.users USING btree (active);


--
-- Name: idx_users_center; Type: INDEX; Schema: public; Owner: asega
--

CREATE INDEX idx_users_center ON public.users USING btree (center_id);


--
-- Name: idx_users_email; Type: INDEX; Schema: public; Owner: asega
--

CREATE INDEX idx_users_email ON public.users USING btree (email);


--
-- Name: idx_users_role; Type: INDEX; Schema: public; Owner: asega
--

CREATE INDEX idx_users_role ON public.users USING btree (role);


--
-- Name: consents trg_consents_updated_at; Type: TRIGGER; Schema: public; Owner: asega
--

CREATE TRIGGER trg_consents_updated_at BEFORE UPDATE ON public.consents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: data_subject_requests trg_dsr_updated_at; Type: TRIGGER; Schema: public; Owner: asega
--

CREATE TRIGGER trg_dsr_updated_at BEFORE UPDATE ON public.data_subject_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: data_processing_activities trg_processing_updated_at; Type: TRIGGER; Schema: public; Owner: asega
--

CREATE TRIGGER trg_processing_updated_at BEFORE UPDATE ON public.data_processing_activities FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: data_retention_policies trg_retention_updated_at; Type: TRIGGER; Schema: public; Owner: asega
--

CREATE TRIGGER trg_retention_updated_at BEFORE UPDATE ON public.data_retention_policies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: data_subject_requests trg_set_deadline; Type: TRIGGER; Schema: public; Owner: asega
--

CREATE TRIGGER trg_set_deadline BEFORE INSERT ON public.data_subject_requests FOR EACH ROW EXECUTE FUNCTION public.set_response_deadline();


--
-- Name: centers update_centers_updated_at; Type: TRIGGER; Schema: public; Owner: asega
--

CREATE TRIGGER update_centers_updated_at BEFORE UPDATE ON public.centers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: birth_certificates update_certificates_updated_at; Type: TRIGGER; Schema: public; Owner: asega
--

CREATE TRIGGER update_certificates_updated_at BEFORE UPDATE ON public.birth_certificates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: users update_users_updated_at; Type: TRIGGER; Schema: public; Owner: asega
--

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: action_logs action_logs_certificate_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: asega
--

ALTER TABLE ONLY public.action_logs
    ADD CONSTRAINT action_logs_certificate_id_fkey FOREIGN KEY (certificate_id) REFERENCES public.birth_certificates(id) ON DELETE CASCADE;


--
-- Name: action_logs action_logs_performed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: asega
--

ALTER TABLE ONLY public.action_logs
    ADD CONSTRAINT action_logs_performed_by_fkey FOREIGN KEY (performed_by) REFERENCES public.users(id);


--
-- Name: birth_certificates birth_certificates_center_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: asega
--

ALTER TABLE ONLY public.birth_certificates
    ADD CONSTRAINT birth_certificates_center_id_fkey FOREIGN KEY (center_id) REFERENCES public.centers(id);


--
-- Name: birth_certificates birth_certificates_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: asega
--

ALTER TABLE ONLY public.birth_certificates
    ADD CONSTRAINT birth_certificates_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: data_processing_activities data_processing_activities_retention_policy_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: asega
--

ALTER TABLE ONLY public.data_processing_activities
    ADD CONSTRAINT data_processing_activities_retention_policy_id_fkey FOREIGN KEY (retention_policy_id) REFERENCES public.data_retention_policies(id);


--
-- Name: notifications notifications_center_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: asega
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_center_id_fkey FOREIGN KEY (center_id) REFERENCES public.centers(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: asega
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: users users_center_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: asega
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_center_id_fkey FOREIGN KEY (center_id) REFERENCES public.centers(id) ON DELETE SET NULL;


--
-- PostgreSQL database dump complete
--

\unrestrict VHZ9zWjdCJLCmWodU1zfqFiK4g5eNtntvkqrFMwcbRkTuUc7eSmW6WE4Era5hsj

