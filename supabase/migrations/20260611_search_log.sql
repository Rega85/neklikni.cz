-- Migration: search_log — log každého vyhledávání v databázi (hero i /databaze/hledat)
--
-- Účel: konverzní analýza (kolik vyhledávání, jaký typ, kolik nalezeno,
-- kolik vede k nahlášení). Žádná osobní data v plain textu — IP je
-- hashovaná stejným mechanismem jako u rate limitu (hashForRL, SHA-256 + IP_PEPPER).

CREATE TABLE IF NOT EXISTS public.search_log (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at          timestamptz NOT NULL DEFAULT now(),
  query_type          text NOT NULL CHECK (query_type IN ('phone', 'account', 'email', 'url', 'other')),
  found               boolean NOT NULL,
  ip_hash             text NOT NULL,
  user_id             uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  converted_to_report boolean NOT NULL DEFAULT false
);

COMMENT ON TABLE public.search_log IS
  'Log vyhledávání v databázi nahlášených podvodů (hero homepage + /databaze/hledat). Pro konverzní analýzu funnelu.';

CREATE INDEX IF NOT EXISTS search_log_created_at_idx ON public.search_log (created_at);

ALTER TABLE public.search_log ENABLE ROW LEVEL SECURITY;

-- Pouze admini mohou číst (analytika). Insert dělá API přes service role,
-- které RLS obchází.
CREATE POLICY "Admins can read search_log"
  ON public.search_log FOR SELECT
  USING (public.is_admin());
