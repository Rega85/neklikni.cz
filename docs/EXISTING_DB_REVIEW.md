# Existing migrations review

Dump existujících migrací v `supabase/migrations/` pro review před spuštěním nové `20260514_120000_create_reports_database.sql`.

Cíl: ověřit, že nová migrace nekoliduje s existujícím schématem (zejména `user_profiles` vs `reporters`, RLS policies, function names).

---

## File: 20260225_referral_system.sql

```sql
-- ============================================================
-- Referral System Migration
-- Run in: Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. Add referral columns
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS referred_by   UUID REFERENCES user_profiles(id);

-- Prevent self-referral
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'chk_no_self_referral'
  ) THEN
    ALTER TABLE user_profiles
      ADD CONSTRAINT chk_no_self_referral CHECK (referred_by IS DISTINCT FROM id);
  END IF;
END $$;

-- 2. Helper: generate a unique 8-char alphanumeric referral code
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS TEXT AS $$
DECLARE
  code TEXT;
  taken BOOLEAN;
BEGIN
  LOOP
    -- Use gen_random_uuid stripped of dashes, take first 8 chars, uppercase
    code := upper(substring(replace(gen_random_uuid()::text, '-', ''), 1, 8));
    SELECT EXISTS(SELECT 1 FROM user_profiles WHERE referral_code = code) INTO taken;
    EXIT WHEN NOT taken;
  END LOOP;
  RETURN code;
END;
$$ LANGUAGE plpgsql VOLATILE;

-- 3. Trigger: auto-generate referral_code for every new user profile
CREATE OR REPLACE FUNCTION trg_set_referral_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code := generate_referral_code();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS before_insert_set_referral_code ON user_profiles;
CREATE TRIGGER before_insert_set_referral_code
  BEFORE INSERT ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION trg_set_referral_code();

-- 4. Populate referral codes for all existing users who don't have one
UPDATE user_profiles
SET referral_code = generate_referral_code()
WHERE referral_code IS NULL;

-- 5. apply_referral(p_new_user_id, p_ref_code)
--    • Idempotent: exits early if referred_by already set
--    • Prevents self-referral
--    • Adds 5 credits to both parties atomically
--    • SECURITY DEFINER so it can update any row regardless of RLS
CREATE OR REPLACE FUNCTION apply_referral(
  p_new_user_id UUID,
  p_ref_code    TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_referrer_id     UUID;
  v_already_referred BOOLEAN;
BEGIN
  -- Idempotency check: only proceed if this user has no referrer yet
  SELECT (referred_by IS NOT NULL)
  INTO   v_already_referred
  FROM   user_profiles
  WHERE  id = p_new_user_id;

  IF v_already_referred IS TRUE THEN
    RETURN FALSE;
  END IF;

  -- Find the referrer (must exist, must not be the new user)
  SELECT id
  INTO   v_referrer_id
  FROM   user_profiles
  WHERE  referral_code = p_ref_code
    AND  id != p_new_user_id;

  IF v_referrer_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Lock the referral (prevents race conditions / double-spend)
  UPDATE user_profiles
  SET    referred_by = v_referrer_id
  WHERE  id = p_new_user_id
    AND  referred_by IS NULL;   -- only if still not set (extra safety)

  -- Add 5 credits to new user
  UPDATE user_profiles
  SET    credits_remaining = credits_remaining + 5,
         updated_at        = now()
  WHERE  id = p_new_user_id;

  -- Add 5 credits to referrer
  UPDATE user_profiles
  SET    credits_remaining = credits_remaining + 5,
         updated_at        = now()
  WHERE  id = v_referrer_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## File: 20260226_processed_events.sql

```sql
-- Idempotency table for Stripe webhook events
-- Prevents double-processing when Stripe retries a delivery

CREATE TABLE IF NOT EXISTS processed_events (
  event_id    text        PRIMARY KEY,
  processed_at timestamptz DEFAULT now()
);

-- Index není potřeba (PRIMARY KEY je B-tree index)
-- Automatické mazání starých záznamů po 90 dnech (volitelné, šetří místo)
CREATE INDEX IF NOT EXISTS processed_events_processed_at_idx
  ON processed_events (processed_at);
```

---

## File: 20260504_drop_unused_functions.sql

```sql
-- =============================================================
-- Drop unused functions
-- =============================================================
-- Verified: 0 dependents, 0 trigger usages, 0 callers in app code,
-- pg_cron extension not installed (so cleanup_anonymous_usage is
-- not running on a schedule either).
-- =============================================================

DROP FUNCTION IF EXISTS public.consume_access(integer, text, integer);
DROP FUNCTION IF EXISTS public.add_credits(uuid, integer);
DROP FUNCTION IF EXISTS public.cleanup_anonymous_usage();
DROP FUNCTION IF EXISTS public.increment_usage_daily(text, date);
```

---

## File: 20260504_fix_referral_system.sql

```sql
-- =============================================================
-- Fix referral system
-- =============================================================
-- The migration 20260225_referral_system.sql was only partially
-- applied: columns and existing user codes are in place, but the
-- following objects are missing in production:
--   * apply_referral(p_new_user_id, p_ref_code)  -- correct signature
--   * chk_no_self_referral constraint
--   * generate_referral_code() helper
--   * trg_set_referral_code() trigger function
--   * before_insert_set_referral_code trigger
--
-- Effect of the bug: app/auth/callback/route.ts calls the RPC
-- with named params p_new_user_id / p_ref_code, but the DB has
-- apply_referral(new_user_id, ref_code), so PostgREST returns
-- "function not found" and no referrer ever gets credited.
-- =============================================================


-- 1. Drop the old (broken) apply_referral. CREATE OR REPLACE
--    cannot rename input parameters, so we have to drop first.
DROP FUNCTION IF EXISTS public.apply_referral(uuid, text);


-- 2. Self-referral CHECK constraint (verified 0 violations exist).
ALTER TABLE public.user_profiles
  ADD CONSTRAINT chk_no_self_referral CHECK (referred_by IS DISTINCT FROM id);


-- 3. Helper: generate a unique 8-char alphanumeric referral code.
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS text
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  code  text;
  taken boolean;
BEGIN
  LOOP
    code := upper(substring(replace(gen_random_uuid()::text, '-', ''), 1, 8));
    SELECT EXISTS(SELECT 1 FROM public.user_profiles WHERE referral_code = code) INTO taken;
    EXIT WHEN NOT taken;
  END LOOP;
  RETURN code;
END;
$$;


-- 4. BEFORE INSERT trigger: auto-fill referral_code on new profiles.
CREATE OR REPLACE FUNCTION public.trg_set_referral_code()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code := public.generate_referral_code();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS before_insert_set_referral_code ON public.user_profiles;
CREATE TRIGGER before_insert_set_referral_code
  BEFORE INSERT ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.trg_set_referral_code();


-- 5. New apply_referral with idempotency, race-safe locking, and
--    self-referral protection. Returns true on first successful
--    application, false otherwise.
CREATE FUNCTION public.apply_referral(
  p_new_user_id uuid,
  p_ref_code    text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_referrer_id      uuid;
  v_already_referred boolean;
BEGIN
  SELECT (referred_by IS NOT NULL)
    INTO v_already_referred
  FROM public.user_profiles
  WHERE id = p_new_user_id;

  IF v_already_referred IS TRUE THEN
    RETURN FALSE;
  END IF;

  SELECT id
    INTO v_referrer_id
  FROM public.user_profiles
  WHERE referral_code = p_ref_code
    AND id <> p_new_user_id;

  IF v_referrer_id IS NULL THEN
    RETURN FALSE;
  END IF;

  UPDATE public.user_profiles
     SET referred_by = v_referrer_id
   WHERE id = p_new_user_id
     AND referred_by IS NULL;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  UPDATE public.user_profiles
     SET credits_remaining = credits_remaining + 5,
         updated_at        = now()
   WHERE id = p_new_user_id;

  UPDATE public.user_profiles
     SET credits_remaining = credits_remaining + 5,
         updated_at        = now()
   WHERE id = v_referrer_id;

  RETURN TRUE;
END;
$$;


-- 6. Server-only: revoke EXECUTE from anon/authenticated/public,
--    only service_role (server-side via supabaseAdmin) keeps it.
REVOKE EXECUTE ON FUNCTION public.apply_referral(uuid, text) FROM PUBLIC, anon, authenticated;
```

---

## File: 20260504_performance.sql

```sql
-- =============================================================
-- Performance hardening — Supabase database linter findings
-- =============================================================
-- 1. Drop duplicate SELECT policy on user_profiles (linter 0006).
-- 2. Wrap auth.<fn>() calls inside RLS policies in (select ...)
--    so they execute once per query instead of once per row
--    (linter 0003 / auth_rls_initplan).
-- 3. Add covering index for the user_profiles.referred_by FK
--    (linter 0001 / unindexed_foreign_keys).
-- =============================================================


-- 1. Drop the duplicate SELECT policy. profiles_select_own and
--    "Users can view own profile" both grant SELECT to the row's
--    owner with the same predicate. Keep profiles_select_own.
DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;


-- 2. Rewrite policies to use (select auth.<fn>()) form.

ALTER POLICY profiles_select_own ON public.user_profiles
  USING ((select auth.uid()) = id);

ALTER POLICY "Users can update their own credits" ON public.user_profiles
  USING ((select auth.uid()) = id)
  WITH CHECK ((select auth.uid()) = id);

ALTER POLICY usage_select_own ON public.usage_log
  USING ((select auth.uid()) = user_id);

ALTER POLICY "Authenticated users can insert" ON public.shared_results
  WITH CHECK ((select auth.role()) = 'authenticated');


-- 3. Covering index for the referrer FK (used when listing
--    "people I referred" or cascading deletes touch user_profiles).
CREATE INDEX IF NOT EXISTS user_profiles_referred_by_idx
  ON public.user_profiles (referred_by);
```

---

## File: 20260504_security_hardening.sql

```sql
-- =============================================================
-- Security hardening — Supabase database linter findings
-- =============================================================
-- 1. Enable RLS on server-only tables (default-deny via PostgREST,
--    service_role bypasses RLS so server code keeps working).
-- 2. Pin search_path on functions to prevent search-path injection
--    via role-mutable search_path (linter 0011).
-- 3. Revoke EXECUTE on SECURITY DEFINER functions from anon/
--    authenticated/public — they are only invoked server-side
--    via the service_role key (linters 0028, 0029).
-- =============================================================


-- ── 1. Row Level Security ─────────────────────────────────────
ALTER TABLE public.processed_events  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anonymous_usage   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_daily       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stats             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_stats        ENABLE ROW LEVEL SECURITY;


-- ── 2. Pin search_path on all flagged functions ──────────────
ALTER FUNCTION public.add_credits(uuid, integer)              SET search_path = public, pg_temp;
ALTER FUNCTION public.apply_referral(uuid, text)              SET search_path = public, pg_temp;
ALTER FUNCTION public.cleanup_anonymous_usage()               SET search_path = public, pg_temp;
ALTER FUNCTION public.consume_access(integer, text, integer)  SET search_path = public, pg_temp;
ALTER FUNCTION public.deduct_credit(uuid)                     SET search_path = public, pg_temp;
ALTER FUNCTION public.get_total_analyses()                    SET search_path = public, pg_temp;
ALTER FUNCTION public.handle_new_user()                       SET search_path = public, pg_temp;
ALTER FUNCTION public.increment_total_analyses()              SET search_path = public, pg_temp;
ALTER FUNCTION public.increment_usage_daily(text, date)       SET search_path = public, pg_temp;
ALTER FUNCTION public.upsert_anonymous_usage(text, date)      SET search_path = public, pg_temp;


-- ── 3. Revoke EXECUTE on SECURITY DEFINER server-only RPCs ───
-- service_role bypasses these grants and keeps full access.
-- handle_new_user is a trigger function — triggers do not check
-- EXECUTE privilege, so the auth signup flow keeps working.
REVOKE EXECUTE ON FUNCTION public.add_credits(uuid, integer)             FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.apply_referral(uuid, text)             FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.consume_access(integer, text, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_total_analyses()                   FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user()                      FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.increment_total_analyses()             FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.upsert_anonymous_usage(text, date)     FROM PUBLIC, anon, authenticated;
```

---

## File: 20260505_leads_table.sql

```sql
-- =============================================================
-- Leads table for lead-magnet capture (PDF "10 nejčastějších
-- českých podvodů" etc.). Server-only access via service_role.
-- =============================================================

CREATE TABLE IF NOT EXISTS public.leads (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  email       text        NOT NULL,
  source      text        NOT NULL DEFAULT 'unknown',
  created_at  timestamptz NOT NULL DEFAULT now(),
  -- Light de-duplication: same email + source can only be captured once
  UNIQUE (email, source)
);

CREATE INDEX IF NOT EXISTS leads_created_at_idx ON public.leads (created_at DESC);

-- RLS: server-only (no anon/authenticated access via PostgREST).
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
```
