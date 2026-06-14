-- =============================================================
-- Tabulka coi_risky_eshops
--
-- Veřejný seznam rizikových e-shopů vydávaný Českou obchodní
-- inspekcí (ČOI). Jde o CIZÍ zdroj — data jsou atribuována ČOI,
-- nikdy se nemíchají s uživatelskými incidenty.
--
-- RLS: čtení veřejné (anon i auth), zápis výhradně service_role
-- (service_role v Supabase obchází RLS automaticky — žádná write
-- policy není potřeba).
-- =============================================================

CREATE TABLE IF NOT EXISTS public.coi_risky_eshops (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  domain        text        NOT NULL,
  reason        text,
  category      text,
  reported_date date,
  source        text        NOT NULL DEFAULT 'ČOI',
  source_url    text,
  imported_at   timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.coi_risky_eshops IS
  'Rizikové e-shopy podle ČOI. Cizí zdroj — nikdy nemíchat s uživatelskými incidenty. Zápis jen přes service_role.';

COMMENT ON COLUMN public.coi_risky_eshops.domain IS
  'Normalizovaná doména bez http(s)://, www. a trailing lomítka, lowercase. Např. "korvanis.com".';

COMMENT ON COLUMN public.coi_risky_eshops.reason IS
  'Odůvodnění ČOI — přesný text z jejich publikace.';

COMMENT ON COLUMN public.coi_risky_eshops.category IS
  'Kategorie ČOI (např. "anonymni_provozovatel").';

COMMENT ON COLUMN public.coi_risky_eshops.reported_date IS
  'Datum zveřejnění ČOI.';

COMMENT ON COLUMN public.coi_risky_eshops.source IS
  'Zdroj záznamu — vždy "ČOI".';

COMMENT ON COLUMN public.coi_risky_eshops.source_url IS
  'Odkaz na originální stránku ČOI.';

COMMENT ON COLUMN public.coi_risky_eshops.imported_at IS
  'Čas importu do naší databáze.';

-- Unikátní index na domain — upsert klíč
CREATE UNIQUE INDEX IF NOT EXISTS idx_coi_risky_eshops_domain
  ON public.coi_risky_eshops(domain);

-- ── RLS ──────────────────────────────────────────────

ALTER TABLE public.coi_risky_eshops ENABLE ROW LEVEL SECURITY;

-- Veřejné čtení pro všechny (anon i authenticated)
CREATE POLICY "Public read coi_risky_eshops"
  ON public.coi_risky_eshops
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Zápis (INSERT/UPDATE/DELETE) jen přes service_role — service_role
-- obchází RLS automaticky, žádná write policy není potřeba.

GRANT SELECT ON public.coi_risky_eshops TO anon, authenticated;
