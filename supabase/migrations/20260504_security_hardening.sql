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
