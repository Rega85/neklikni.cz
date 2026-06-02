-- Migration: Welcome bonus +5 analýz každému novému uživateli
-- Applied: 2026-06-02 via Supabase MCP
--
-- Dříve: přímá registrace dávala 0 kreditů; pouze referral dával +5.
-- Nyní: každý nový uživatel dostane +5 (welcome bonus) automaticky.
--
-- Výsledek:
--   Přímá registrace: nový uživatel = +5 (welcome)
--   Referral:         nový uživatel = +5 (welcome), zvoucí = +5 (referral)

-- ── 1. handle_new_user ───────────────────────────────────────────
-- Trigger na auth.users INSERT → vytváří user_profiles záznam.
-- Změna: credits_remaining 0 → 5

CREATE OR REPLACE FUNCTION public.handle_new_user()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, tier, credits_remaining, credits_reset_at)
  VALUES (
    NEW.id,
    NEW.email,
    'free',
    5,   -- welcome bonus: +5 analýz pro každého nového uživatele
    date_trunc('month', now()) + interval '1 month'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- ── 2. apply_referral ────────────────────────────────────────────
-- Voláno z auth/callback při registraci přes referral odkaz.
-- Změna: odstraněno přičtení +5 novému uživateli — ten již má +5
--         z welcome bonusu výše. Zvoucí dostává dál +5.

CREATE OR REPLACE FUNCTION public.apply_referral(p_new_user_id uuid, p_ref_code text)
  RETURNS boolean
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
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

  -- Přičti +5 zvoucímu (nový uživatel má svůj welcome bonus z handle_new_user)
  UPDATE public.user_profiles
     SET credits_remaining = credits_remaining + 5,
         updated_at        = now()
   WHERE id = v_referrer_id;

  RETURN TRUE;
END;
$$;
