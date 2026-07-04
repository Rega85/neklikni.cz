-- =============================================================
-- Atomický upsert nejlepšího skóre do quiz_leaderboard.
--
-- Zápis jen když se skóre zlepšilo (WHERE excluded.best_score >
-- quiz_leaderboard.best_score) — SQL-level podmínka, ne app-level
-- "přečti, porovnej, zapiš" (to by mělo race condition při souběžných
-- submitech téhož uživatele). SECURITY DEFINER + grant jen pro
-- service_role, aby to nešlo zavolat jinak než z app/api/test/submit.
-- =============================================================

CREATE OR REPLACE FUNCTION public.quiz_leaderboard_upsert(
  p_user_id uuid,
  p_display_name text,
  p_score int
) RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO public.quiz_leaderboard (user_id, display_name, best_score, completed_at)
  VALUES (p_user_id, p_display_name, p_score, now())
  ON CONFLICT (user_id) DO UPDATE
    SET display_name = excluded.display_name,
        best_score   = excluded.best_score,
        completed_at = excluded.completed_at
    WHERE excluded.best_score > quiz_leaderboard.best_score;
$$;

REVOKE ALL ON FUNCTION public.quiz_leaderboard_upsert(uuid, text, int) FROM public;
GRANT EXECUTE ON FUNCTION public.quiz_leaderboard_upsert(uuid, text, int) TO service_role;
