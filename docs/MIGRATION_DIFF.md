```diff
diff --git a/supabase/migrations/20260514_120000_create_reports_database.sql b/supabase/migrations/20260514_120000_create_reports_database.sql
index f234b3c..943409f 100644
--- a/supabase/migrations/20260514_120000_create_reports_database.sql
+++ b/supabase/migrations/20260514_120000_create_reports_database.sql
@@ -28,124 +28,189 @@ CREATE EXTENSION IF NOT EXISTS "pg_trgm";     -- pro fuzzy search v textech
 -- 1. ENUM TYPY
 -- =====================================================
 
-CREATE TYPE reporter_trust_level AS ENUM (
-  'anonymous',   -- jen email
-  'verified',    -- email + telefon
-  'premium'      -- + Bank iD (v2)
-);
+DO $$
+BEGIN
+  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'reporter_trust_level') THEN
+    CREATE TYPE reporter_trust_level AS ENUM (
+      'anonymous',   -- jen email
+      'verified',    -- email + telefon
+      'premium'      -- + Bank iD (v2)
+    );
+  END IF;
+END $$;
 
-CREATE TYPE subject_visibility AS ENUM (
-  'active',              -- veřejně viditelný
-  'hidden_objection',    -- skrytý kvůli probíhající námitce
-  'removed',             -- odstraněn
-  'pending'              -- čeká na admin review (např. merge)
-);
+DO $$
+BEGIN
+  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subject_visibility') THEN
+    CREATE TYPE subject_visibility AS ENUM (
+      'active',              -- veřejně viditelný
+      'hidden_objection',    -- skrytý kvůli probíhající námitce
+      'removed',             -- odstraněn
+      'pending'              -- čeká na admin review (např. merge)
+    );
+  END IF;
+END $$;
 
-CREATE TYPE identifier_type AS ENUM (
-  'phone',
-  'account',
-  'email',
-  'facebook_url',
-  'var_symbol',
-  'other'
-);
+DO $$
+BEGIN
+  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'identifier_type') THEN
+    CREATE TYPE identifier_type AS ENUM (
+      'phone',
+      'account',
+      'email',
+      'facebook_url',
+      'var_symbol',
+      'other'
+    );
+  END IF;
+END $$;
 
-CREATE TYPE incident_platform AS ENUM (
-  'fb_marketplace',
-  'fb_groups',
-  'sbazar',
-  'bazos',
-  'vinted',
-  'aukro',
-  'email',
-  'sms',
-  'phone',
-  'other'
-);
+DO $$
+BEGIN
+  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'incident_platform') THEN
+    CREATE TYPE incident_platform AS ENUM (
+      'fb_marketplace',
+      'fb_groups',
+      'sbazar',
+      'bazos',
+      'vinted',
+      'aukro',
+      'email',
+      'sms',
+      'phone',
+      'other'
+    );
+  END IF;
+END $$;
 
-CREATE TYPE incident_category AS ENUM (
-  'non_delivery',        -- nedodání zboží po platbě
-  'misrepresentation',   -- zboží neodpovídá popisu
-  'fake_courier',        -- falešný kurýr/přepravce
-  'disappeared_listing', -- inzerát zmizel po platbě
-  'fake_profile',        -- falešný profil
-  'romance',             -- romance scam
-  'investment',          -- investiční podvod
-  'rental',              -- rezervace bytu / nemovitosti
-  'tickets',             -- vstupenky
-  'employment',          -- pracovní nabídka
-  'other'
-);
+DO $$
+BEGIN
+  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'incident_category') THEN
+    CREATE TYPE incident_category AS ENUM (
+      'non_delivery',        -- nedodání zboží po platbě
+      'misrepresentation',   -- zboží neodpovídá popisu
+      'fake_courier',        -- falešný kurýr/přepravce
+      'disappeared_listing', -- inzerát zmizel po platbě
+      'fake_profile',        -- falešný profil
+      'romance',             -- romance scam
+      'investment',          -- investiční podvod
+      'rental',              -- rezervace bytu / nemovitosti
+      'tickets',             -- vstupenky
+      'employment',          -- pracovní nabídka
+      'other'
+    );
+  END IF;
+END $$;
 
-CREATE TYPE incident_severity AS ENUM (
-  'attempt',   -- pokus, nedošlo k platbě (váha 0)
-  'minor',     -- drobný do 1 000 Kč (váha 1)
-  'medium',    -- střední 1k-10k Kč (váha 2)
-  'major',     -- velký 10k-100k Kč (váha 4)
-  'severe'     -- závažný nad 100k Kč (váha 8)
-);
+DO $$
+BEGIN
+  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'incident_severity') THEN
+    CREATE TYPE incident_severity AS ENUM (
+      'attempt',   -- pokus, nedošlo k platbě (váha 0)
+      'minor',     -- drobný do 1 000 Kč (váha 1)
+      'medium',    -- střední 1k-10k Kč (váha 2)
+      'major',     -- velký 10k-100k Kč (váha 4)
+      'severe'     -- závažný nad 100k Kč (váha 8)
+    );
+  END IF;
+END $$;
 
-CREATE TYPE incident_status AS ENUM (
-  'pending',              -- čeká na AI předkontrolu nebo admin review
-  'pending_merge_review', -- AI našla konflikt subject_identifiers, admin musí rozhodnout
-  'ai_reviewed',          -- AI prošla, čeká na notifikaci nebo publikaci
-  'notified',             -- dotčená osoba notifikována, 14denní lhůta běží
-  'published',            -- veřejně viditelný
-  'objected',             -- námitka podána, dočasně skryt
-  'removed'               -- odstraněn po námitce nebo admin rozhodnutí
-);
+DO $$
+BEGIN
+  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'incident_status') THEN
+    CREATE TYPE incident_status AS ENUM (
+      'pending',              -- čeká na AI předkontrolu nebo admin review
+      'pending_merge_review', -- AI našla konflikt subject_identifiers, admin musí rozhodnout
+      'ai_reviewed',          -- AI prošla, čeká na notifikaci nebo publikaci
+      'notified',             -- dotčená osoba notifikována, 14denní lhůta běží
+      'published',            -- veřejně viditelný
+      'objected',             -- námitka podána, dočasně skryt
+      'removed'               -- odstraněn po námitce nebo admin rozhodnutí
+    );
+  END IF;
+END $$;
 
-CREATE TYPE evidence_type AS ENUM (
-  'screenshot',
-  'payment_proof',
-  'communication',
-  'other'
-);
+DO $$
+BEGIN
+  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'evidence_type') THEN
+    CREATE TYPE evidence_type AS ENUM (
+      'screenshot',
+      'payment_proof',
+      'communication',
+      'other'
+    );
+  END IF;
+END $$;
 
-CREATE TYPE objection_status AS ENUM (
-  'pending',    -- čeká na admin review
-  'upheld',     -- námitka uznána, záznam odstraněn
-  'rejected',   -- námitka zamítnuta, záznam zpět veřejný
-  'partial'     -- částečné uznání (např. úprava záznamu)
-);
+DO $$
+BEGIN
+  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'objection_status') THEN
+    CREATE TYPE objection_status AS ENUM (
+      'pending',    -- čeká na admin review
+      'upheld',     -- námitka uznána, záznam odstraněn
+      'rejected',   -- námitka zamítnuta, záznam zpět veřejný
+      'partial'     -- částečné uznání (např. úprava záznamu)
+    );
+  END IF;
+END $$;
 
-CREATE TYPE audit_actor_type AS ENUM (
-  'reporter',
-  'admin',
-  'system',
-  'public'
-);
+DO $$
+BEGIN
+  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'audit_actor_type') THEN
+    CREATE TYPE audit_actor_type AS ENUM (
+      'reporter',
+      'admin',
+      'system',
+      'public'
+    );
+  END IF;
+END $$;
 
-CREATE TYPE audit_action AS ENUM (
-  'view_evidence',
-  'view_full_identifier',
-  'create_incident',
-  'update_incident',
-  'remove_incident',
-  'create_objection',
-  'resolve_objection',
-  'grant_claim',
-  'revoke_claim',
-  'process_payment',
-  'merge_subjects',
-  'export_data'
-);
+DO $$
+BEGIN
+  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'audit_action') THEN
+    CREATE TYPE audit_action AS ENUM (
+      'view_evidence',
+      'view_full_identifier',
+      'create_incident',
+      'update_incident',
+      'remove_incident',
+      'create_objection',
+      'resolve_objection',
+      'grant_claim',
+      'revoke_claim',
+      'process_payment',
+      'merge_subjects',
+      'export_data'
+    );
+  END IF;
+END $$;
 
-CREATE TYPE audit_target_type AS ENUM (
-  'incident',
-  'subject',
-  'evidence',
-  'reporter',
-  'objection',
-  'subscription'
-);
+DO $$
+BEGIN
+  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'audit_target_type') THEN
+    CREATE TYPE audit_target_type AS ENUM (
+      'incident',
+      'subject',
+      'evidence',
+      'reporter',
+      'objection',
+      'subscription'
+    );
+  END IF;
+END $$;
 
-CREATE TYPE claim_subscription_status AS ENUM (
-  'active',
-  'past_due',
-  'canceled',
-  'incomplete'
-);
+DO $$
+BEGIN
+  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'claim_subscription_status') THEN
+    CREATE TYPE claim_subscription_status AS ENUM (
+      'active',
+      'past_due',
+      'canceled',
+      'incomplete'
+    );
+  END IF;
+END $$;
 
 
 -- =====================================================
@@ -153,7 +218,7 @@ CREATE TYPE claim_subscription_status AS ENUM (
 -- Nahlašovatelé (rozšíření auth.users)
 -- =====================================================
 
-CREATE TABLE public.reporters (
+CREATE TABLE IF NOT EXISTS public.reporters (
   id                    uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
   email                 text NOT NULL,
   phone                 text,
@@ -172,8 +237,8 @@ CREATE TABLE public.reporters (
 COMMENT ON TABLE public.reporters IS
   'Nahlašovatelé. Rozšíření auth.users o trust level a statistiky.';
 
-CREATE INDEX idx_reporters_trust_level ON public.reporters(trust_level);
-CREATE INDEX idx_reporters_banned ON public.reporters(banned) WHERE banned = true;
+CREATE INDEX IF NOT EXISTS idx_reporters_trust_level ON public.reporters(trust_level);
+CREATE INDEX IF NOT EXISTS idx_reporters_banned ON public.reporters(banned) WHERE banned = true;
 
 
 -- =====================================================
@@ -181,7 +246,7 @@ CREATE INDEX idx_reporters_banned ON public.reporters(banned) WHERE banned = tru
 -- Subjekty incidentu (entity, proti kterým se shromažďují nahlášení)
 -- =====================================================
 
-CREATE TABLE public.subjects (
+CREATE TABLE IF NOT EXISTS public.subjects (
   id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
   display_name_masked   text,              -- "Pa**** N***" pro public view
   claimed_by            uuid REFERENCES public.reporters(id) ON DELETE SET NULL,
@@ -195,9 +260,9 @@ CREATE TABLE public.subjects (
 COMMENT ON TABLE public.subjects IS
   'Agregát všech identifikátorů a incidentů proti jedné entitě.';
 
-CREATE INDEX idx_subjects_visibility ON public.subjects(visibility_status);
-CREATE INDEX idx_subjects_trust_score ON public.subjects(trust_score);
-CREATE INDEX idx_subjects_claimed_by ON public.subjects(claimed_by) WHERE claimed_by IS NOT NULL;
+CREATE INDEX IF NOT EXISTS idx_subjects_visibility ON public.subjects(visibility_status);
+CREATE INDEX IF NOT EXISTS idx_subjects_trust_score ON public.subjects(trust_score);
+CREATE INDEX IF NOT EXISTS idx_subjects_claimed_by ON public.subjects(claimed_by) WHERE claimed_by IS NOT NULL;
 
 
 -- =====================================================
@@ -205,7 +270,7 @@ CREATE INDEX idx_subjects_claimed_by ON public.subjects(claimed_by) WHERE claime
 -- Identifikátory subjektu (telefon, účet, e-mail, FB URL)
 -- =====================================================
 
-CREATE TABLE public.subject_identifiers (
+CREATE TABLE IF NOT EXISTS public.subject_identifiers (
   id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
   subject_id            uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
   type                  identifier_type NOT NULL,
@@ -221,8 +286,8 @@ COMMENT ON TABLE public.subject_identifiers IS
 COMMENT ON COLUMN public.subject_identifiers.value IS
   'Plná hodnota identifikátoru. Přístup omezen RLS — jen service_role, claimed_by, nebo admin.';
 
-CREATE INDEX idx_subject_identifiers_subject ON public.subject_identifiers(subject_id);
-CREATE INDEX idx_subject_identifiers_type ON public.subject_identifiers(type);
+CREATE INDEX IF NOT EXISTS idx_subject_identifiers_subject ON public.subject_identifiers(subject_id);
+CREATE INDEX IF NOT EXISTS idx_subject_identifiers_type ON public.subject_identifiers(type);
 -- value_hash má UNIQUE constraint, který automaticky vytvoří index
 
 
@@ -231,7 +296,7 @@ CREATE INDEX idx_subject_identifiers_type ON public.subject_identifiers(type);
 -- Jednotlivá nahlášení
 -- =====================================================
 
-CREATE TABLE public.incidents (
+CREATE TABLE IF NOT EXISTS public.incidents (
   id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
   reporter_id                 uuid NOT NULL REFERENCES public.reporters(id) ON DELETE CASCADE,
   subject_id                  uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
@@ -261,13 +326,13 @@ CREATE TABLE public.incidents (
 COMMENT ON TABLE public.incidents IS
   'Jednotlivá nahlášení incidentů. Status flow: pending → ai_reviewed → notified → published (nebo objected/removed).';
 
-CREATE INDEX idx_incidents_reporter ON public.incidents(reporter_id);
-CREATE INDEX idx_incidents_subject ON public.incidents(subject_id);
-CREATE INDEX idx_incidents_status ON public.incidents(status);
-CREATE INDEX idx_incidents_published ON public.incidents(public_at DESC) WHERE status = 'published';
-CREATE INDEX idx_incidents_category ON public.incidents(category);
-CREATE INDEX idx_incidents_severity ON public.incidents(severity);
-CREATE INDEX idx_incidents_notification_pending ON public.incidents(notification_sent_at)
+CREATE INDEX IF NOT EXISTS idx_incidents_reporter ON public.incidents(reporter_id);
+CREATE INDEX IF NOT EXISTS idx_incidents_subject ON public.incidents(subject_id);
+CREATE INDEX IF NOT EXISTS idx_incidents_status ON public.incidents(status);
+CREATE INDEX IF NOT EXISTS idx_incidents_published ON public.incidents(public_at DESC) WHERE status = 'published';
+CREATE INDEX IF NOT EXISTS idx_incidents_category ON public.incidents(category);
+CREATE INDEX IF NOT EXISTS idx_incidents_severity ON public.incidents(severity);
+CREATE INDEX IF NOT EXISTS idx_incidents_notification_pending ON public.incidents(notification_sent_at)
   WHERE status = 'notified';
 
 
@@ -276,7 +341,7 @@ CREATE INDEX idx_incidents_notification_pending ON public.incidents(notification
 -- Důkazy nahrávané s nahlášením
 -- =====================================================
 
-CREATE TABLE public.evidence (
+CREATE TABLE IF NOT EXISTS public.evidence (
   id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
   incident_id     uuid NOT NULL REFERENCES public.incidents(id) ON DELETE CASCADE,
   type            evidence_type NOT NULL,
@@ -291,9 +356,9 @@ CREATE TABLE public.evidence (
 COMMENT ON TABLE public.evidence IS
   'Důkazy v Supabase Storage bucketu "evidence". Soft delete, hard delete po 5 letech retention.';
 
-CREATE INDEX idx_evidence_incident ON public.evidence(incident_id);
-CREATE INDEX idx_evidence_hash ON public.evidence(file_hash);
-CREATE INDEX idx_evidence_active ON public.evidence(incident_id) WHERE deleted_at IS NULL;
+CREATE INDEX IF NOT EXISTS idx_evidence_incident ON public.evidence(incident_id);
+CREATE INDEX IF NOT EXISTS idx_evidence_hash ON public.evidence(file_hash);
+CREATE INDEX IF NOT EXISTS idx_evidence_active ON public.evidence(incident_id) WHERE deleted_at IS NULL;
 
 
 -- =====================================================
@@ -301,7 +366,7 @@ CREATE INDEX idx_evidence_active ON public.evidence(incident_id) WHERE deleted_a
 -- Námitky od dotčených osob
 -- =====================================================
 
-CREATE TABLE public.objections (
+CREATE TABLE IF NOT EXISTS public.objections (
   id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
   incident_id         uuid NOT NULL REFERENCES public.incidents(id) ON DELETE CASCADE,
   access_token        text NOT NULL UNIQUE,           -- pro token-based access k URL /databaze/namitka/[token]
@@ -320,9 +385,9 @@ CREATE TABLE public.objections (
 COMMENT ON TABLE public.objections IS
   'Námitky od dotčených osob. Token-based access přes /databaze/namitka/[token].';
 
-CREATE INDEX idx_objections_incident ON public.objections(incident_id);
-CREATE INDEX idx_objections_status ON public.objections(status);
-CREATE INDEX idx_objections_pending ON public.objections(created_at) WHERE status = 'pending';
+CREATE INDEX IF NOT EXISTS idx_objections_incident ON public.objections(incident_id);
+CREATE INDEX IF NOT EXISTS idx_objections_status ON public.objections(status);
+CREATE INDEX IF NOT EXISTS idx_objections_pending ON public.objections(created_at) WHERE status = 'pending';
 
 
 -- =====================================================
@@ -330,7 +395,7 @@ CREATE INDEX idx_objections_pending ON public.objections(created_at) WHERE statu
 -- Citlivé operace
 -- =====================================================
 
-CREATE TABLE public.audit_log (
+CREATE TABLE IF NOT EXISTS public.audit_log (
   id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
   actor_type      audit_actor_type NOT NULL,
   actor_id        uuid,                    -- null pro public/system
@@ -346,10 +411,10 @@ CREATE TABLE public.audit_log (
 COMMENT ON TABLE public.audit_log IS
   'Log všech citlivých operací. Retention 5 let, pak hard delete přes cron job.';
 
-CREATE INDEX idx_audit_actor ON public.audit_log(actor_type, actor_id);
-CREATE INDEX idx_audit_target ON public.audit_log(target_type, target_id);
-CREATE INDEX idx_audit_action ON public.audit_log(action);
-CREATE INDEX idx_audit_created ON public.audit_log(created_at DESC);
+CREATE INDEX IF NOT EXISTS idx_audit_actor ON public.audit_log(actor_type, actor_id);
+CREATE INDEX IF NOT EXISTS idx_audit_target ON public.audit_log(target_type, target_id);
+CREATE INDEX IF NOT EXISTS idx_audit_action ON public.audit_log(action);
+CREATE INDEX IF NOT EXISTS idx_audit_created ON public.audit_log(created_at DESC);
 
 
 -- =====================================================
@@ -357,7 +422,7 @@ CREATE INDEX idx_audit_created ON public.audit_log(created_at DESC);
 -- Stripe subskripce pro Claim & Respond
 -- =====================================================
 
-CREATE TABLE public.claim_subscriptions (
+CREATE TABLE IF NOT EXISTS public.claim_subscriptions (
   id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
   subject_id               uuid NOT NULL UNIQUE REFERENCES public.subjects(id) ON DELETE CASCADE,
   reporter_id              uuid NOT NULL REFERENCES public.reporters(id) ON DELETE CASCADE,
@@ -372,9 +437,9 @@ CREATE TABLE public.claim_subscriptions (
 COMMENT ON TABLE public.claim_subscriptions IS
   'Stripe subskripce 290 Kč/měs pro Claim & Respond funkci.';
 
-CREATE INDEX idx_claim_reporter ON public.claim_subscriptions(reporter_id);
-CREATE INDEX idx_claim_status ON public.claim_subscriptions(status);
-CREATE INDEX idx_claim_active ON public.claim_subscriptions(current_period_end)
+CREATE INDEX IF NOT EXISTS idx_claim_reporter ON public.claim_subscriptions(reporter_id);
+CREATE INDEX IF NOT EXISTS idx_claim_status ON public.claim_subscriptions(status);
+CREATE INDEX IF NOT EXISTS idx_claim_active ON public.claim_subscriptions(current_period_end)
   WHERE status = 'active';
 
 
@@ -383,7 +448,7 @@ CREATE INDEX idx_claim_active ON public.claim_subscriptions(current_period_end)
 -- Veřejné reakce dotčené osoby na incidenty (Claim & Respond feature)
 -- =====================================================
 
-CREATE TABLE public.claim_responses (
+CREATE TABLE IF NOT EXISTS public.claim_responses (
   id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
   incident_id     uuid NOT NULL REFERENCES public.incidents(id) ON DELETE CASCADE,
   responder_id    uuid NOT NULL REFERENCES public.reporters(id) ON DELETE CASCADE,
@@ -395,41 +460,44 @@ CREATE TABLE public.claim_responses (
 COMMENT ON TABLE public.claim_responses IS
   'Veřejné reakce dotčených osob (subjects.claimed_by) na konkrétní incidenty.';
 
-CREATE INDEX idx_claim_responses_incident ON public.claim_responses(incident_id);
-CREATE INDEX idx_claim_responses_responder ON public.claim_responses(responder_id);
+CREATE INDEX IF NOT EXISTS idx_claim_responses_incident ON public.claim_responses(incident_id);
+CREATE INDEX IF NOT EXISTS idx_claim_responses_responder ON public.claim_responses(responder_id);
 
 
 -- =====================================================
 -- 11. TRIGGERY: updated_at
 -- =====================================================
 
-CREATE OR REPLACE FUNCTION public.set_updated_at()
-RETURNS TRIGGER AS $$
+CREATE OR REPLACE FUNCTION public.reports_set_updated_at()
+RETURNS TRIGGER
+LANGUAGE plpgsql
+SET search_path = public, pg_temp
+AS $$
 BEGIN
   NEW.updated_at = now();
   RETURN NEW;
 END;
-$$ LANGUAGE plpgsql;
+$$;
 
 CREATE TRIGGER trg_reporters_updated_at
   BEFORE UPDATE ON public.reporters
-  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
+  FOR EACH ROW EXECUTE FUNCTION public.reports_set_updated_at();
 
 CREATE TRIGGER trg_subjects_updated_at
   BEFORE UPDATE ON public.subjects
-  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
+  FOR EACH ROW EXECUTE FUNCTION public.reports_set_updated_at();
 
 CREATE TRIGGER trg_incidents_updated_at
   BEFORE UPDATE ON public.incidents
-  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
+  FOR EACH ROW EXECUTE FUNCTION public.reports_set_updated_at();
 
 CREATE TRIGGER trg_claim_subscriptions_updated_at
   BEFORE UPDATE ON public.claim_subscriptions
-  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
+  FOR EACH ROW EXECUTE FUNCTION public.reports_set_updated_at();
 
 CREATE TRIGGER trg_claim_responses_updated_at
   BEFORE UPDATE ON public.claim_responses
-  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
+  FOR EACH ROW EXECUTE FUNCTION public.reports_set_updated_at();
 
 
 -- =====================================================
@@ -438,7 +506,11 @@ CREATE TRIGGER trg_claim_responses_updated_at
 -- =====================================================
 
 CREATE OR REPLACE FUNCTION public.calculate_trust_score(p_subject_id uuid)
-RETURNS integer AS $$
+RETURNS integer
+LANGUAGE plpgsql
+STABLE
+SET search_path = public, pg_temp
+AS $$
 DECLARE
   v_count_active        integer;
   v_severity_weighted   integer;
@@ -479,7 +551,7 @@ BEGIN
 
   RETURN GREATEST(0, v_score);
 END;
-$$ LANGUAGE plpgsql STABLE;
+$$;
 
 COMMENT ON FUNCTION public.calculate_trust_score IS
   'Výpočet trust score 0-100 pro subjekt podle SPEC.md sekce 9 bod 3.';
@@ -491,7 +563,10 @@ COMMENT ON FUNCTION public.calculate_trust_score IS
 -- =====================================================
 
 CREATE OR REPLACE FUNCTION public.refresh_subject_trust_score()
-RETURNS TRIGGER AS $$
+RETURNS TRIGGER
+LANGUAGE plpgsql
+SET search_path = public, pg_temp
+AS $$
 DECLARE
   v_subject_id uuid;
 BEGIN
@@ -503,7 +578,7 @@ BEGIN
 
   RETURN COALESCE(NEW, OLD);
 END;
-$$ LANGUAGE plpgsql;
+$$;
 
 CREATE TRIGGER trg_incidents_refresh_trust_score
   AFTER INSERT OR UPDATE OR DELETE ON public.incidents
@@ -516,7 +591,10 @@ CREATE TRIGGER trg_incidents_refresh_trust_score
 -- =====================================================
 
 CREATE OR REPLACE FUNCTION public.increment_reporter_stats()
-RETURNS TRIGGER AS $$
+RETURNS TRIGGER
+LANGUAGE plpgsql
+SET search_path = public, pg_temp
+AS $$
 BEGIN
   IF TG_OP = 'INSERT' THEN
     UPDATE public.reporters
@@ -525,7 +603,7 @@ BEGIN
   END IF;
   RETURN NEW;
 END;
-$$ LANGUAGE plpgsql;
+$$;
 
 CREATE TRIGGER trg_incidents_increment_stats
   AFTER INSERT ON public.incidents
@@ -538,7 +616,7 @@ CREATE TRIGGER trg_incidents_increment_stats
 -- ale pro RLS potřebujeme DB-level kontrolu.
 -- =====================================================
 
-CREATE TABLE public.app_admins (
+CREATE TABLE IF NOT EXISTS public.app_admins (
   user_id     uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
   created_at  timestamptz NOT NULL DEFAULT now()
 );
@@ -547,13 +625,18 @@ COMMENT ON TABLE public.app_admins IS
   'Uživatelé s admin oprávněním. Pro MVP: jen Pavel. Insert ručně přes Supabase Studio.';
 
 CREATE OR REPLACE FUNCTION public.is_admin()
-RETURNS boolean AS $$
+RETURNS boolean
+LANGUAGE plpgsql
+STABLE
+SECURITY DEFINER
+SET search_path = public, pg_temp
+AS $$
 BEGIN
   RETURN EXISTS (
     SELECT 1 FROM public.app_admins WHERE user_id = auth.uid()
   );
 END;
-$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
+$$;
 
 COMMENT ON FUNCTION public.is_admin IS
   'Vrací true, pokud aktuální auth.uid() je v app_admins.';
@@ -738,7 +821,11 @@ CREATE POLICY "Admins can manage all objections"
 
 -- RPC funkce pro veřejný přístup k námitce přes token
 CREATE OR REPLACE FUNCTION public.get_objection_by_token(p_token text)
-RETURNS public.objections AS $$
+RETURNS public.objections
+LANGUAGE plpgsql
+SECURITY DEFINER
+SET search_path = public, pg_temp
+AS $$
 DECLARE
   v_objection public.objections;
 BEGIN
@@ -748,7 +835,7 @@ BEGIN
 
   RETURN v_objection;
 END;
-$$ LANGUAGE plpgsql SECURITY DEFINER;
+$$;
 
 REVOKE EXECUTE ON FUNCTION public.get_objection_by_token FROM anon, authenticated;
 GRANT EXECUTE ON FUNCTION public.get_objection_by_token TO anon, authenticated;
@@ -838,49 +925,89 @@ VALUES ('evidence', 'evidence', false)
 ON CONFLICT (id) DO NOTHING;
 
 -- Reporter může uploadnout do své složky (path začíná {incident_id}/)
-CREATE POLICY "Reporters can upload evidence to own incidents"
-  ON storage.objects FOR INSERT
-  WITH CHECK (
-    bucket_id = 'evidence'
-    AND EXISTS (
-      SELECT 1 FROM public.incidents
-      WHERE id::text = split_part(storage.objects.name, '/', 1)
-      AND reporter_id = auth.uid()
-    )
-  );
+DO $$
+BEGIN
+  IF NOT EXISTS (
+    SELECT 1 FROM pg_policies
+    WHERE schemaname = 'storage'
+    AND tablename = 'objects'
+    AND policyname = 'Reporters can upload evidence to own incidents'
+  ) THEN
+    CREATE POLICY "Reporters can upload evidence to own incidents"
+      ON storage.objects FOR INSERT
+      WITH CHECK (
+        bucket_id = 'evidence'
+        AND EXISTS (
+          SELECT 1 FROM public.incidents
+          WHERE id::text = split_part(storage.objects.name, '/', 1)
+          AND reporter_id = auth.uid()
+        )
+      );
+  END IF;
+END $$;
 
 -- Reporter může číst své vlastní soubory
-CREATE POLICY "Reporters can read own evidence files"
-  ON storage.objects FOR SELECT
-  USING (
-    bucket_id = 'evidence'
-    AND EXISTS (
-      SELECT 1 FROM public.incidents
-      WHERE id::text = split_part(storage.objects.name, '/', 1)
-      AND reporter_id = auth.uid()
-    )
-  );
+DO $$
+BEGIN
+  IF NOT EXISTS (
+    SELECT 1 FROM pg_policies
+    WHERE schemaname = 'storage'
+    AND tablename = 'objects'
+    AND policyname = 'Reporters can read own evidence files'
+  ) THEN
+    CREATE POLICY "Reporters can read own evidence files"
+      ON storage.objects FOR SELECT
+      USING (
+        bucket_id = 'evidence'
+        AND EXISTS (
+          SELECT 1 FROM public.incidents
+          WHERE id::text = split_part(storage.objects.name, '/', 1)
+          AND reporter_id = auth.uid()
+        )
+      );
+  END IF;
+END $$;
 
 -- Claimed reporter může číst důkazy proti svému subjektu
-CREATE POLICY "Claimed reporter can read evidence files against own subject"
-  ON storage.objects FOR SELECT
-  USING (
-    bucket_id = 'evidence'
-    AND EXISTS (
-      SELECT 1 FROM public.incidents i
-      JOIN public.subjects s ON s.id = i.subject_id
-      WHERE i.id::text = split_part(storage.objects.name, '/', 1)
-      AND s.claimed_by = auth.uid()
-    )
-  );
+DO $$
+BEGIN
+  IF NOT EXISTS (
+    SELECT 1 FROM pg_policies
+    WHERE schemaname = 'storage'
+    AND tablename = 'objects'
+    AND policyname = 'Claimed reporter can read evidence files against own subject'
+  ) THEN
+    CREATE POLICY "Claimed reporter can read evidence files against own subject"
+      ON storage.objects FOR SELECT
+      USING (
+        bucket_id = 'evidence'
+        AND EXISTS (
+          SELECT 1 FROM public.incidents i
+          JOIN public.subjects s ON s.id = i.subject_id
+          WHERE i.id::text = split_part(storage.objects.name, '/', 1)
+          AND s.claimed_by = auth.uid()
+        )
+      );
+  END IF;
+END $$;
 
 -- Admin může vše
-CREATE POLICY "Admins can manage all evidence files"
-  ON storage.objects FOR ALL
-  USING (
-    bucket_id = 'evidence'
-    AND public.is_admin()
-  );
+DO $$
+BEGIN
+  IF NOT EXISTS (
+    SELECT 1 FROM pg_policies
+    WHERE schemaname = 'storage'
+    AND tablename = 'objects'
+    AND policyname = 'Admins can manage all evidence files'
+  ) THEN
+    CREATE POLICY "Admins can manage all evidence files"
+      ON storage.objects FOR ALL
+      USING (
+        bucket_id = 'evidence'
+        AND public.is_admin()
+      );
+  END IF;
+END $$;
 
 
 -- =====================================================
```
