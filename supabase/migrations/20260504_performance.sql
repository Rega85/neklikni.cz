-- =============================================================
-- Performance hardening — Supabase database linter findings
-- =============================================================
-- 1. Drop duplicate SELECT policy on user_profiles (linter 0006).
-- 2. Wrap auth.<fn>() calls inside RLS policies in (select ...)
--    so they execute once per query instead of once per row
--    (linter 0003 / auth_rls_initplan).
-- 3. Add covering index for the user_profiles.referred_by FK
--    (linter 0001 / unindexed_foreign_keys).
-- =============================================================


-- 1. Drop the duplicate SELECT policy. profiles_select_own and
--    "Users can view own profile" both grant SELECT to the row's
--    owner with the same predicate. Keep profiles_select_own.
DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;


-- 2. Rewrite policies to use (select auth.<fn>()) form.

ALTER POLICY profiles_select_own ON public.user_profiles
  USING ((select auth.uid()) = id);

ALTER POLICY "Users can update their own credits" ON public.user_profiles
  USING ((select auth.uid()) = id)
  WITH CHECK ((select auth.uid()) = id);

ALTER POLICY usage_select_own ON public.usage_log
  USING ((select auth.uid()) = user_id);

ALTER POLICY "Authenticated users can insert" ON public.shared_results
  WITH CHECK ((select auth.role()) = 'authenticated');


-- 3. Covering index for the referrer FK (used when listing
--    "people I referred" or cascading deletes touch user_profiles).
CREATE INDEX IF NOT EXISTS user_profiles_referred_by_idx
  ON public.user_profiles (referred_by);
