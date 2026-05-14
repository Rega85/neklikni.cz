-- =====================================================
-- Neklikni.cz — Databáze nahlášených incidentů
-- Migration: Initial schema for /databaze module
-- =====================================================
--
-- Zdroj: docs/SPEC.md v0.2 (sekce 4 — Datový model)
--
-- Tato migrace vytváří kompletní schéma pro modul databáze
-- nahlášení (reporters, subjects, identifikátory, incidents,
-- evidence, objections, audit_log, claim_subscriptions).
--
-- Pravidla:
-- - RLS je povinný na všech tabulkách
-- - Citlivé operace logujeme do audit_log
-- - Soft delete preferujeme nad hard delete
-- - Storage bucket "evidence" je private
-- =====================================================

-- =====================================================
-- 0. EXTENSIONS
-- =====================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";    -- pro gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pg_trgm";     -- pro fuzzy search v textech


-- =====================================================
-- 1. ENUM TYPY
-- =====================================================

CREATE TYPE reporter_trust_level AS ENUM (
  'anonymous',   -- jen email
  'verified',    -- email + telefon
  'premium'      -- + Bank iD (v2)
);

CREATE TYPE subject_visibility AS ENUM (
  'active',              -- veřejně viditelný
  'hidden_objection',    -- skrytý kvůli probíhající námitce
  'removed',             -- odstraněn
  'pending'              -- čeká na admin review (např. merge)
);

CREATE TYPE identifier_type AS ENUM (
  'phone',
  'account',
  'email',
  'facebook_url',
  'var_symbol',
  'other'
);

CREATE TYPE incident_platform AS ENUM (
  'fb_marketplace',
  'fb_groups',
  'sbazar',
  'bazos',
  'vinted',
  'aukro',
  'email',
  'sms',
  'phone',
  'other'
);

CREATE TYPE incident_category AS ENUM (
  'non_delivery',        -- nedodání zboží po platbě
  'misrepresentation',   -- zboží neodpovídá popisu
  'fake_courier',        -- falešný kurýr/přepravce
  'disappeared_listing', -- inzerát zmizel po platbě
  'fake_profile',        -- falešný profil
  'romance',             -- romance scam
  'investment',          -- investiční podvod
  'rental',              -- rezervace bytu / nemovitosti
  'tickets',             -- vstupenky
  'employment',          -- pracovní nabídka
  'other'
);

CREATE TYPE incident_severity AS ENUM (
  'attempt',   -- pokus, nedošlo k platbě (váha 0)
  'minor',     -- drobný do 1 000 Kč (váha 1)
  'medium',    -- střední 1k-10k Kč (váha 2)
  'major',     -- velký 10k-100k Kč (váha 4)
  'severe'     -- závažný nad 100k Kč (váha 8)
);

CREATE TYPE incident_status AS ENUM (
  'pending',              -- čeká na AI předkontrolu nebo admin review
  'pending_merge_review', -- AI našla konflikt subject_identifiers, admin musí rozhodnout
  'ai_reviewed',          -- AI prošla, čeká na notifikaci nebo publikaci
  'notified',             -- dotčená osoba notifikována, 14denní lhůta běží
  'published',            -- veřejně viditelný
  'objected',             -- námitka podána, dočasně skryt
  'removed'               -- odstraněn po námitce nebo admin rozhodnutí
);

CREATE TYPE evidence_type AS ENUM (
  'screenshot',
  'payment_proof',
  'communication',
  'other'
);

CREATE TYPE objection_status AS ENUM (
  'pending',    -- čeká na admin review
  'upheld',     -- námitka uznána, záznam odstraněn
  'rejected',   -- námitka zamítnuta, záznam zpět veřejný
  'partial'     -- částečné uznání (např. úprava záznamu)
);

CREATE TYPE audit_actor_type AS ENUM (
  'reporter',
  'admin',
  'system',
  'public'
);

CREATE TYPE audit_action AS ENUM (
  'view_evidence',
  'view_full_identifier',
  'create_incident',
  'update_incident',
  'remove_incident',
  'create_objection',
  'resolve_objection',
  'grant_claim',
  'revoke_claim',
  'process_payment',
  'merge_subjects',
  'export_data'
);

CREATE TYPE audit_target_type AS ENUM (
  'incident',
  'subject',
  'evidence',
  'reporter',
  'objection',
  'subscription'
);

CREATE TYPE claim_subscription_status AS ENUM (
  'active',
  'past_due',
  'canceled',
  'incomplete'
);


-- =====================================================
-- 2. TABULKA: reporters
-- Nahlašovatelé (rozšíření auth.users)
-- =====================================================

CREATE TABLE public.reporters (
  id                    uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email                 text NOT NULL,
  phone                 text,
  phone_verified        boolean NOT NULL DEFAULT false,
  bank_id_verified      boolean NOT NULL DEFAULT false,
  trust_level           reporter_trust_level NOT NULL DEFAULT 'anonymous',
  reports_count         integer NOT NULL DEFAULT 0,
  false_reports_count   integer NOT NULL DEFAULT 0,
  banned                boolean NOT NULL DEFAULT false,
  banned_reason         text,
  banned_at             timestamptz,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.reporters IS
  'Nahlašovatelé. Rozšíření auth.users o trust level a statistiky.';

CREATE INDEX idx_reporters_trust_level ON public.reporters(trust_level);
CREATE INDEX idx_reporters_banned ON public.reporters(banned) WHERE banned = true;


-- =====================================================
-- 3. TABULKA: subjects
-- Subjekty incidentu (entity, proti kterým se shromažďují nahlášení)
-- =====================================================

CREATE TABLE public.subjects (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  display_name_masked   text,              -- "Pa**** N***" pro public view
  claimed_by            uuid REFERENCES public.reporters(id) ON DELETE SET NULL,
  claim_paid_until      timestamptz,       -- platnost claim subscription
  trust_score           integer NOT NULL DEFAULT 100 CHECK (trust_score BETWEEN 0 AND 100),
  visibility_status     subject_visibility NOT NULL DEFAULT 'active',
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.subjects IS
  'Agregát všech identifikátorů a incidentů proti jedné entitě.';

CREATE INDEX idx_subjects_visibility ON public.subjects(visibility_status);
CREATE INDEX idx_subjects_trust_score ON public.subjects(trust_score);
CREATE INDEX idx_subjects_claimed_by ON public.subjects(claimed_by) WHERE claimed_by IS NOT NULL;


-- =====================================================
-- 4. TABULKA: subject_identifiers
-- Identifikátory subjektu (telefon, účet, e-mail, FB URL)
-- =====================================================

CREATE TABLE public.subject_identifiers (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id            uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  type                  identifier_type NOT NULL,
  value                 text NOT NULL,                 -- plná hodnota, jen pro autorizovaný přístup
  value_hash            text NOT NULL UNIQUE,          -- SHA-256 hash, pro lookup
  value_masked          text NOT NULL,                 -- "+420 7** *** *77"
  verified              boolean NOT NULL DEFAULT false,
  created_at            timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.subject_identifiers IS
  'Identifikátory spojené se subjektem. value_hash je UNIQUE — jeden identifikátor patří jen jednomu subjektu.';
COMMENT ON COLUMN public.subject_identifiers.value IS
  'Plná hodnota identifikátoru. Přístup omezen RLS — jen service_role, claimed_by, nebo admin.';

CREATE INDEX idx_subject_identifiers_subject ON public.subject_identifiers(subject_id);
CREATE INDEX idx_subject_identifiers_type ON public.subject_identifiers(type);
-- value_hash má UNIQUE constraint, který automaticky vytvoří index


-- =====================================================
-- 5. TABULKA: incidents
-- Jednotlivá nahlášení
-- =====================================================

CREATE TABLE public.incidents (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id                 uuid NOT NULL REFERENCES public.reporters(id) ON DELETE CASCADE,
  subject_id                  uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  incident_date               date NOT NULL,
  platform                    incident_platform NOT NULL,
  platform_other              text,
  category                    incident_category NOT NULL,
  category_other              text,
  severity                    incident_severity NOT NULL,
  amount_czk                  integer NOT NULL DEFAULT 0 CHECK (amount_czk >= 0),
  description                 text NOT NULL CHECK (length(description) BETWEEN 50 AND 1000),
  contact_for_subject_email   text,                     -- volitelný kontakt na dotčenou osobu (od nahlašovatele)
  ai_confidence_score         integer CHECK (ai_confidence_score BETWEEN 0 AND 100),
  ai_summary                  text,
  ai_red_flags                jsonb DEFAULT '[]'::jsonb,
  status                      incident_status NOT NULL DEFAULT 'pending',
  notification_sent_at        timestamptz,
  notification_email          text,                     -- finální e-mail použitý pro notifikaci
  public_at                   timestamptz,
  objection_at                timestamptz,
  removed_at                  timestamptz,
  removed_reason              text,
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.incidents IS
  'Jednotlivá nahlášení incidentů. Status flow: pending → ai_reviewed → notified → published (nebo objected/removed).';

CREATE INDEX idx_incidents_reporter ON public.incidents(reporter_id);
CREATE INDEX idx_incidents_subject ON public.incidents(subject_id);
CREATE INDEX idx_incidents_status ON public.incidents(status);
CREATE INDEX idx_incidents_published ON public.incidents(public_at DESC) WHERE status = 'published';
CREATE INDEX idx_incidents_category ON public.incidents(category);
CREATE INDEX idx_incidents_severity ON public.incidents(severity);
CREATE INDEX idx_incidents_notification_pending ON public.incidents(notification_sent_at)
  WHERE status = 'notified';


-- =====================================================
-- 6. TABULKA: evidence
-- Důkazy nahrávané s nahlášením
-- =====================================================

CREATE TABLE public.evidence (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id     uuid NOT NULL REFERENCES public.incidents(id) ON DELETE CASCADE,
  type            evidence_type NOT NULL,
  file_path       text NOT NULL,                 -- path v Supabase Storage
  file_hash       text NOT NULL,                 -- SHA-256, pro duplicate detection
  file_size_bytes integer NOT NULL CHECK (file_size_bytes > 0 AND file_size_bytes <= 10485760), -- max 10 MB
  mime_type       text NOT NULL,
  uploaded_at     timestamptz NOT NULL DEFAULT now(),
  deleted_at      timestamptz                    -- soft delete
);

COMMENT ON TABLE public.evidence IS
  'Důkazy v Supabase Storage bucketu "evidence". Soft delete, hard delete po 5 letech retention.';

CREATE INDEX idx_evidence_incident ON public.evidence(incident_id);
CREATE INDEX idx_evidence_hash ON public.evidence(file_hash);
CREATE INDEX idx_evidence_active ON public.evidence(incident_id) WHERE deleted_at IS NULL;


-- =====================================================
-- 7. TABULKA: objections
-- Námitky od dotčených osob
-- =====================================================

CREATE TABLE public.objections (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id         uuid NOT NULL REFERENCES public.incidents(id) ON DELETE CASCADE,
  access_token        text NOT NULL UNIQUE,           -- pro token-based access k URL /databaze/namitka/[token]
  raised_by_email     text NOT NULL,
  raised_by_phone     text,
  identity_verified   boolean NOT NULL DEFAULT false,
  reason              text NOT NULL CHECK (length(reason) BETWEEN 50 AND 2000),
  evidence_path       text,                            -- volitelný protidůkaz v Storage
  status              objection_status NOT NULL DEFAULT 'pending',
  admin_note          text,
  resolved_by         uuid REFERENCES public.reporters(id),
  resolved_at         timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.objections IS
  'Námitky od dotčených osob. Token-based access přes /databaze/namitka/[token].';

CREATE INDEX idx_objections_incident ON public.objections(incident_id);
CREATE INDEX idx_objections_status ON public.objections(status);
CREATE INDEX idx_objections_pending ON public.objections(created_at) WHERE status = 'pending';


-- =====================================================
-- 8. TABULKA: audit_log
-- Citlivé operace
-- =====================================================

CREATE TABLE public.audit_log (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_type      audit_actor_type NOT NULL,
  actor_id        uuid,                    -- null pro public/system
  action          audit_action NOT NULL,
  target_type     audit_target_type NOT NULL,
  target_id       uuid NOT NULL,
  ip_address      inet,
  user_agent      text,
  metadata        jsonb DEFAULT '{}'::jsonb,
  created_at      timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.audit_log IS
  'Log všech citlivých operací. Retention 5 let, pak hard delete přes cron job.';

CREATE INDEX idx_audit_actor ON public.audit_log(actor_type, actor_id);
CREATE INDEX idx_audit_target ON public.audit_log(target_type, target_id);
CREATE INDEX idx_audit_action ON public.audit_log(action);
CREATE INDEX idx_audit_created ON public.audit_log(created_at DESC);


-- =====================================================
-- 9. TABULKA: claim_subscriptions
-- Stripe subskripce pro Claim & Respond
-- =====================================================

CREATE TABLE public.claim_subscriptions (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id               uuid NOT NULL UNIQUE REFERENCES public.subjects(id) ON DELETE CASCADE,
  reporter_id              uuid NOT NULL REFERENCES public.reporters(id) ON DELETE CASCADE,
  stripe_customer_id       text NOT NULL,
  stripe_subscription_id   text NOT NULL UNIQUE,
  status                   claim_subscription_status NOT NULL,
  current_period_end       timestamptz NOT NULL,
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.claim_subscriptions IS
  'Stripe subskripce 290 Kč/měs pro Claim & Respond funkci.';

CREATE INDEX idx_claim_reporter ON public.claim_subscriptions(reporter_id);
CREATE INDEX idx_claim_status ON public.claim_subscriptions(status);
CREATE INDEX idx_claim_active ON public.claim_subscriptions(current_period_end)
  WHERE status = 'active';


-- =====================================================
-- 10. TABULKA: claim_responses
-- Veřejné reakce dotčené osoby na incidenty (Claim & Respond feature)
-- =====================================================

CREATE TABLE public.claim_responses (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id     uuid NOT NULL REFERENCES public.incidents(id) ON DELETE CASCADE,
  responder_id    uuid NOT NULL REFERENCES public.reporters(id) ON DELETE CASCADE,
  response_text   text NOT NULL CHECK (length(response_text) BETWEEN 20 AND 500),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.claim_responses IS
  'Veřejné reakce dotčených osob (subjects.claimed_by) na konkrétní incidenty.';

CREATE INDEX idx_claim_responses_incident ON public.claim_responses(incident_id);
CREATE INDEX idx_claim_responses_responder ON public.claim_responses(responder_id);


-- =====================================================
-- 11. TRIGGERY: updated_at
-- =====================================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_reporters_updated_at
  BEFORE UPDATE ON public.reporters
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_subjects_updated_at
  BEFORE UPDATE ON public.subjects
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_incidents_updated_at
  BEFORE UPDATE ON public.incidents
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_claim_subscriptions_updated_at
  BEFORE UPDATE ON public.claim_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_claim_responses_updated_at
  BEFORE UPDATE ON public.claim_responses
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- =====================================================
-- 12. FUNKCE: trust score calculation
-- Podle SPEC.md sekce 9, bod 3
-- =====================================================

CREATE OR REPLACE FUNCTION public.calculate_trust_score(p_subject_id uuid)
RETURNS integer AS $$
DECLARE
  v_count_active        integer;
  v_severity_weighted   integer;
  v_recency_bonus       integer;
  v_score               integer;
BEGIN
  -- count_active: počet aktivních (status='published') incidentů
  SELECT COUNT(*) INTO v_count_active
  FROM public.incidents
  WHERE subject_id = p_subject_id AND status = 'published';

  -- severity_weighted: součet vah závažnosti
  SELECT COALESCE(SUM(
    CASE severity
      WHEN 'attempt' THEN 0
      WHEN 'minor'   THEN 1
      WHEN 'medium'  THEN 2
      WHEN 'major'   THEN 4
      WHEN 'severe'  THEN 8
    END
  ), 0) INTO v_severity_weighted
  FROM public.incidents
  WHERE subject_id = p_subject_id AND status = 'published';

  -- recency_bonus: počet incidentů za posledních 90 dní
  SELECT COUNT(*) INTO v_recency_bonus
  FROM public.incidents
  WHERE subject_id = p_subject_id
    AND status = 'published'
    AND public_at >= now() - interval '90 days';

  -- score = 100 - min(100, (count*10) + (severity*5) + (recency*2))
  v_score := 100 - LEAST(100,
    (v_count_active * 10) +
    (v_severity_weighted * 5) +
    (v_recency_bonus * 2)
  );

  RETURN GREATEST(0, v_score);
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION public.calculate_trust_score IS
  'Výpočet trust score 0-100 pro subjekt podle SPEC.md sekce 9 bod 3.';


-- =====================================================
-- 13. TRIGGER: auto-update trust score
-- Po každé změně incidents přepočítej subjects.trust_score
-- =====================================================

CREATE OR REPLACE FUNCTION public.refresh_subject_trust_score()
RETURNS TRIGGER AS $$
DECLARE
  v_subject_id uuid;
BEGIN
  v_subject_id := COALESCE(NEW.subject_id, OLD.subject_id);

  UPDATE public.subjects
  SET trust_score = public.calculate_trust_score(v_subject_id)
  WHERE id = v_subject_id;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_incidents_refresh_trust_score
  AFTER INSERT OR UPDATE OR DELETE ON public.incidents
  FOR EACH ROW EXECUTE FUNCTION public.refresh_subject_trust_score();


-- =====================================================
-- 14. FUNKCE: increment reporter stats
-- Po vytvoření incidentu zvyš reports_count
-- =====================================================

CREATE OR REPLACE FUNCTION public.increment_reporter_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.reporters
    SET reports_count = reports_count + 1
    WHERE id = NEW.reporter_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_incidents_increment_stats
  AFTER INSERT ON public.incidents
  FOR EACH ROW EXECUTE FUNCTION public.increment_reporter_stats();


-- =====================================================
-- 15. HELPER: je-li uživatel admin?
-- Admin je hardcoded přes env var ADMIN_USER_IDS v API,
-- ale pro RLS potřebujeme DB-level kontrolu.
-- =====================================================

CREATE TABLE public.app_admins (
  user_id     uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.app_admins IS
  'Uživatelé s admin oprávněním. Pro MVP: jen Pavel. Insert ručně přes Supabase Studio.';

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.app_admins WHERE user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION public.is_admin IS
  'Vrací true, pokud aktuální auth.uid() je v app_admins.';


-- =====================================================
-- 16. ENABLE RLS
-- =====================================================

ALTER TABLE public.reporters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subject_identifiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.objections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.claim_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.claim_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_admins ENABLE ROW LEVEL SECURITY;


-- =====================================================
-- 17. RLS POLICIES — reporters
-- =====================================================

CREATE POLICY "Reporters can read own profile"
  ON public.reporters FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Reporters can update own profile"
  ON public.reporters FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Admins can read all reporters"
  ON public.reporters FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Admins can update all reporters"
  ON public.reporters FOR UPDATE
  USING (public.is_admin());


-- =====================================================
-- 18. RLS POLICIES — subjects
-- =====================================================

CREATE POLICY "Public can read active subjects"
  ON public.subjects FOR SELECT
  USING (visibility_status = 'active');

CREATE POLICY "Reporters can read subjects of own incidents"
  ON public.subjects FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.incidents
    WHERE incidents.subject_id = subjects.id
    AND incidents.reporter_id = auth.uid()
  ));

CREATE POLICY "Claimed reporter can read own subject"
  ON public.subjects FOR SELECT
  USING (claimed_by = auth.uid());

CREATE POLICY "Admins can read all subjects"
  ON public.subjects FOR ALL
  USING (public.is_admin());


-- =====================================================
-- 19. RLS POLICIES — subject_identifiers
-- =====================================================

-- Pro public view potřebujeme jen value_masked, ne plný value.
-- Řešíme přes view (níže) místo RLS na řádek.
-- Plný řádek vidí jen claimed_by a admin.

CREATE POLICY "Claimed reporter can read own subject identifiers"
  ON public.subject_identifiers FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.subjects
    WHERE subjects.id = subject_identifiers.subject_id
    AND subjects.claimed_by = auth.uid()
  ));

CREATE POLICY "Admins can manage all subject_identifiers"
  ON public.subject_identifiers FOR ALL
  USING (public.is_admin());


-- VIEW pro public — jen maskované hodnoty
CREATE VIEW public.subject_identifiers_public AS
SELECT
  id,
  subject_id,
  type,
  value_masked,
  verified,
  created_at
FROM public.subject_identifiers
WHERE EXISTS (
  SELECT 1 FROM public.subjects
  WHERE subjects.id = subject_identifiers.subject_id
  AND subjects.visibility_status = 'active'
);

GRANT SELECT ON public.subject_identifiers_public TO anon, authenticated;


-- =====================================================
-- 20. RLS POLICIES — incidents
-- =====================================================

CREATE POLICY "Public can read published incidents"
  ON public.incidents FOR SELECT
  USING (status = 'published');

CREATE POLICY "Reporters can read own incidents"
  ON public.incidents FOR SELECT
  USING (auth.uid() = reporter_id);

CREATE POLICY "Reporters can create incidents"
  ON public.incidents FOR INSERT
  WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Claimed reporter can read incidents against own subject"
  ON public.incidents FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.subjects
    WHERE subjects.id = incidents.subject_id
    AND subjects.claimed_by = auth.uid()
  ));

CREATE POLICY "Admins can manage all incidents"
  ON public.incidents FOR ALL
  USING (public.is_admin());


-- =====================================================
-- 21. RLS POLICIES — evidence
-- =====================================================

CREATE POLICY "Reporters can read evidence of own incidents"
  ON public.evidence FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.incidents
    WHERE incidents.id = evidence.incident_id
    AND incidents.reporter_id = auth.uid()
  ));

CREATE POLICY "Reporters can insert evidence to own incidents"
  ON public.evidence FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.incidents
    WHERE incidents.id = evidence.incident_id
    AND incidents.reporter_id = auth.uid()
  ));

CREATE POLICY "Claimed reporter can read evidence against own subject"
  ON public.evidence FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.incidents
    JOIN public.subjects ON subjects.id = incidents.subject_id
    WHERE incidents.id = evidence.incident_id
    AND subjects.claimed_by = auth.uid()
  ));

CREATE POLICY "Admins can manage all evidence"
  ON public.evidence FOR ALL
  USING (public.is_admin());


-- =====================================================
-- 22. RLS POLICIES — objections
-- =====================================================

-- Námitky se přistupují přes access_token v URL, ne přes auth.uid().
-- Public read má access jen přes secure RPC funkci (níže), ne přímou query.

CREATE POLICY "Admins can manage all objections"
  ON public.objections FOR ALL
  USING (public.is_admin());


-- RPC funkce pro veřejný přístup k námitce přes token
CREATE OR REPLACE FUNCTION public.get_objection_by_token(p_token text)
RETURNS public.objections AS $$
DECLARE
  v_objection public.objections;
BEGIN
  SELECT * INTO v_objection
  FROM public.objections
  WHERE access_token = p_token;

  RETURN v_objection;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE EXECUTE ON FUNCTION public.get_objection_by_token FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_objection_by_token TO anon, authenticated;


-- =====================================================
-- 23. RLS POLICIES — audit_log
-- =====================================================

CREATE POLICY "Admins can read all audit logs"
  ON public.audit_log FOR SELECT
  USING (public.is_admin());

-- Inserts jen přes service_role (z server-side kódu)


-- =====================================================
-- 24. RLS POLICIES — claim_subscriptions
-- =====================================================

CREATE POLICY "Reporters can read own subscriptions"
  ON public.claim_subscriptions FOR SELECT
  USING (auth.uid() = reporter_id);

CREATE POLICY "Admins can read all subscriptions"
  ON public.claim_subscriptions FOR SELECT
  USING (public.is_admin());

-- Inserts/updates jen přes service_role (Stripe webhook)


-- =====================================================
-- 25. RLS POLICIES — claim_responses
-- =====================================================

CREATE POLICY "Public can read claim responses on published incidents"
  ON public.claim_responses FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.incidents
    WHERE incidents.id = claim_responses.incident_id
    AND incidents.status = 'published'
  ));

CREATE POLICY "Responders can manage own responses"
  ON public.claim_responses FOR ALL
  USING (auth.uid() = responder_id)
  WITH CHECK (
    auth.uid() = responder_id
    AND EXISTS (
      SELECT 1 FROM public.subjects s
      JOIN public.incidents i ON i.subject_id = s.id
      WHERE i.id = claim_responses.incident_id
      AND s.claimed_by = auth.uid()
      AND s.claim_paid_until > now()
    )
  );

CREATE POLICY "Admins can manage all claim responses"
  ON public.claim_responses FOR ALL
  USING (public.is_admin());


-- =====================================================
-- 26. RLS POLICIES — app_admins
-- =====================================================

CREATE POLICY "Admins can read app_admins"
  ON public.app_admins FOR SELECT
  USING (public.is_admin());

-- Inserts/deletes jen přes Supabase Studio nebo service_role


-- =====================================================
-- 27. STORAGE BUCKET: evidence
-- =====================================================

-- Bucket samotný se vytvoří přes Supabase Studio:
--   Storage → New bucket → name="evidence", Public OFF
--   Allowed MIME types: image/png, image/jpeg, image/webp, application/pdf
--   Max file size: 10 MB
--
-- Policies pro bucket "evidence" (přidat v Studio nebo přes SQL):

INSERT INTO storage.buckets (id, name, public)
VALUES ('evidence', 'evidence', false)
ON CONFLICT (id) DO NOTHING;

-- Reporter může uploadnout do své složky (path začíná {incident_id}/)
CREATE POLICY "Reporters can upload evidence to own incidents"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'evidence'
    AND EXISTS (
      SELECT 1 FROM public.incidents
      WHERE id::text = split_part(storage.objects.name, '/', 1)
      AND reporter_id = auth.uid()
    )
  );

-- Reporter může číst své vlastní soubory
CREATE POLICY "Reporters can read own evidence files"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'evidence'
    AND EXISTS (
      SELECT 1 FROM public.incidents
      WHERE id::text = split_part(storage.objects.name, '/', 1)
      AND reporter_id = auth.uid()
    )
  );

-- Claimed reporter může číst důkazy proti svému subjektu
CREATE POLICY "Claimed reporter can read evidence files against own subject"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'evidence'
    AND EXISTS (
      SELECT 1 FROM public.incidents i
      JOIN public.subjects s ON s.id = i.subject_id
      WHERE i.id::text = split_part(storage.objects.name, '/', 1)
      AND s.claimed_by = auth.uid()
    )
  );

-- Admin může vše
CREATE POLICY "Admins can manage all evidence files"
  ON storage.objects FOR ALL
  USING (
    bucket_id = 'evidence'
    AND public.is_admin()
  );


-- =====================================================
-- 28. SEED DATA — povolené MIME types (referenční)
-- =====================================================

-- Pro frontend validaci:
-- ALLOWED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'application/pdf']
-- MAX_FILE_SIZE = 10 * 1024 * 1024 (10 MB)


-- =====================================================
-- 29. POZNÁMKY PRO IMPLEMENTACI
-- =====================================================

-- 1. Po této migraci ručně přes Supabase Studio:
--    - Insert do app_admins: INSERT INTO public.app_admins (user_id) VALUES ('your-auth-uid');
--    - Vytvoř bucket "evidence" (pokud výše ON CONFLICT neproběhl správně)
--
-- 2. Cron jobs (nastavit přes Supabase Edge Functions nebo Vercel cron):
--    - Daily: incidents WHERE status='notified' AND notification_sent_at < now() - interval '14 days' → published
--    - Monthly: prune audit_log a evidence starší 5 let (retention)
--    - Daily: claim_subscriptions WHERE current_period_end < now() → status='canceled'
--
-- 3. Env vars pro API:
--    - SUPABASE_SERVICE_ROLE_KEY (pro server-side inserts do audit_log)
--    - STRIPE_WEBHOOK_SECRET (pro Stripe events)
--    - RESEND_API_KEY (pro notifikace)
--    - CRON_SECRET (pro chráněné cron endpointy)
--
-- 4. value_hash konvence:
--    - phone: SHA-256 z normalizovaného formátu "+420777123456"
--    - account: SHA-256 z formátu "12345-6789/0100"
--    - email: SHA-256 z lowercase "user@domain.cz"
--    - facebook_url: SHA-256 z normalizovaného URL bez https://www.
--    - var_symbol: SHA-256 z čistého čísla

-- =====================================================
-- KONEC MIGRACE
-- =====================================================
