-- =============================================================
-- Newsletter consent pro registrované uživatele (user_profiles).
-- Rozšiřuje stejný vzor jako leads.consent/unsubscribe_token, ale
-- consent NENÍ podmínkou registrace (na rozdíl od leads, kde je
-- consent = newsletter signup = jedna a tatáž akce).
--
-- onboarding_newsletter_shown: gate pro jednorázový onboarding modal
-- po Google OAuth přihlášení (flag, ne časové okénko od created_at —
-- spolehlivější, viz /auth/callback).
-- =============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS newsletter_consent            boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS newsletter_consent_at          timestamptz,
  ADD COLUMN IF NOT EXISTS newsletter_consent_version     text,
  ADD COLUMN IF NOT EXISTS newsletter_unsubscribe_token   text,
  ADD COLUMN IF NOT EXISTS onboarding_newsletter_shown    boolean NOT NULL DEFAULT false;

-- Backfill tokenů pro existující řádky (stejný vzor jako leads).
UPDATE public.user_profiles
   SET newsletter_unsubscribe_token = encode(gen_random_bytes(24), 'hex')
 WHERE newsletter_unsubscribe_token IS NULL;

ALTER TABLE public.user_profiles
  ALTER COLUMN newsletter_unsubscribe_token SET DEFAULT encode(gen_random_bytes(24), 'hex'),
  ALTER COLUMN newsletter_unsubscribe_token SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS user_profiles_newsletter_unsubscribe_token_idx
  ON public.user_profiles (newsletter_unsubscribe_token);
