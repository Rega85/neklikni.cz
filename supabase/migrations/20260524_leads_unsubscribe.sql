-- =============================================================
-- Leads: funkční unsubscribe (ZoNS §7 + GDPR čl. 7 odst. 3)
-- Přidává unsubscribed flag, časovou stopu a unikátní token, který
-- e-mail šablona použije v odkazu + Resend `List-Unsubscribe`
-- hlavičce (RFC 8058 jednoklik).
-- =============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS unsubscribed       boolean      NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS unsubscribed_at    timestamptz,
  ADD COLUMN IF NOT EXISTS unsubscribe_token  text;

-- Backfill tokenů pro existující řádky (před nastavením NOT NULL).
UPDATE public.leads
   SET unsubscribe_token = encode(gen_random_bytes(24), 'hex')
 WHERE unsubscribe_token IS NULL;

ALTER TABLE public.leads
  ALTER COLUMN unsubscribe_token SET DEFAULT encode(gen_random_bytes(24), 'hex'),
  ALTER COLUMN unsubscribe_token SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS leads_unsubscribe_token_idx
  ON public.leads (unsubscribe_token);

CREATE INDEX IF NOT EXISTS leads_unsubscribed_idx
  ON public.leads (unsubscribed) WHERE unsubscribed = true;
