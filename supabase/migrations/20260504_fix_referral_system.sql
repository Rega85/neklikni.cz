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
