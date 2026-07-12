-- Fáze 4: sdílení výsledku ze sjednoceného vstupu (/api/check).
-- Rozšiřuje shared_results o nový tvar verdiktu (lib/verdictEngine.ts)
-- vedle stávajících sloupců z /api/analyze. Nové sloupce jsou nullable —
-- starých 247 řádků se nedotýká, /report/[id] rozlišuje tvar podle
-- přítomnosti `level`.

ALTER TABLE public.shared_results
  ADD COLUMN IF NOT EXISTS level text,
  ADD COLUMN IF NOT EXISTS input_kind text,
  ADD COLUMN IF NOT EXISTS actions jsonb,
  ADD COLUMN IF NOT EXISTS sources jsonb;

COMMENT ON COLUMN public.shared_results.level IS 'green|orange|red z verdictEngine.buildVerdict — NULL u starších řádků z /api/analyze (legacy tvar risk/verdict/analysis).';
COMMENT ON COLUMN public.shared_results.input_kind IS 'InputKind z lib/inputParser.ts (identifier/message/url/mixed). Jen u nového tvaru.';
COMMENT ON COLUMN public.shared_results.actions IS 'string[] — "co dělat teď" z verdiktu. Jen u nového tvaru.';
COMMENT ON COLUMN public.shared_results.sources IS 'jsonb { database: DatabaseSignal | null, ai: AiSignal | null } z verdiktu. Jen u nového tvaru.';
