-- =============================================================
-- Drop unused functions
-- =============================================================
-- Verified: 0 dependents, 0 trigger usages, 0 callers in app code,
-- pg_cron extension not installed (so cleanup_anonymous_usage is
-- not running on a schedule either).
-- =============================================================

DROP FUNCTION IF EXISTS public.consume_access(integer, text, integer);
DROP FUNCTION IF EXISTS public.add_credits(uuid, integer);
DROP FUNCTION IF EXISTS public.cleanup_anonymous_usage();
DROP FUNCTION IF EXISTS public.increment_usage_daily(text, date);
