-- =============================================================
-- Quiz "Poznáš podvod?" (/test) — žebříček nejlepších skóre +
-- globální čítač dokončení.
--
-- quiz_leaderboard: 1 řádek na uživatele (best_score se přepisuje).
-- display_name je VŽDY zkrácený tvar "Jméno P." — celé příjmení se
-- do DB nikdy nedostane (viz app/api/test/submit route), takže tu
-- není co maskovat na úrovni RLS/view.
--
-- Zápis jen přes service_role (žádná insert/update policy pro
-- authenticated/anon) — skóre se počítá a ukládá výhradně na
-- serveru, klient nikdy nezapisuje přímo do tabulky.
-- =============================================================

CREATE TABLE IF NOT EXISTS public.quiz_leaderboard (
  user_id       uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name  text NOT NULL CHECK (char_length(display_name) <= 50),
  best_score    int  NOT NULL CHECK (best_score BETWEEN 0 AND 10),
  completed_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.quiz_leaderboard ENABLE ROW LEVEL SECURITY;

CREATE POLICY "quiz_leaderboard public read"
  ON public.quiz_leaderboard
  FOR SELECT
  USING (true);

-- Globální čítač "kolik lidí se otestovalo" — stejný vzor jako
-- existující řádek 'total_analyses'. Inkrementuje se při KAŽDÉM
-- úspěšném dokončení quizu (přihlášený i anonym), viz
-- app/api/test/submit route.
INSERT INTO public.site_stats (key, value)
VALUES ('quiz_completions', 0)
ON CONFLICT (key) DO NOTHING;
