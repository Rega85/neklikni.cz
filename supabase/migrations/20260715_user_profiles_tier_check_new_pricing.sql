-- Launch blocker: user_profiles_tier_check dosud povoloval jen staré
-- hodnoty tieru (free/basic/pro/elite) z předchozích cenových modelů.
-- Nový ceník (Fáze 4, viz app/api/_lib/billingPlans.ts) zapisuje
-- 'oneshot'/'full' — webhook checkout.session.completed by na tenhle
-- constraint narazil při KAŽDÉM reálném nákupu (Stripe platba projde,
-- DB upsert selže na CHECK violation, tier se nikdy nezapíše).
--
-- Staré hodnoty (basic/pro/elite) ponechány v allowlistu kvůli
-- zpětné kompatibilitě s historickými řádky (žádný živý kód je dnes
-- nezapisuje, ale existující řádky s těmito hodnotami by jinak
-- KAŽDÝ budoucí UPDATE toho řádku shodil na stejném constraintu).

ALTER TABLE public.user_profiles DROP CONSTRAINT user_profiles_tier_check;
ALTER TABLE public.user_profiles ADD CONSTRAINT user_profiles_tier_check
  CHECK (tier = ANY (ARRAY['free', 'oneshot', 'full', 'basic', 'pro', 'elite']));
