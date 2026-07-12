-- Nova pole pro sledovani stavu Stripe predplatneho primo v user_profiles
-- (novy cenik: FULL mesicne/rocne s 7denim trialem). Pouziva se v
-- /api/me + /profile (zobrazeni stavu, data pristi platby/konce trialu)
-- a je udrzovano webhookem (checkout.session.completed,
-- customer.subscription.created/updated/deleted).
--
-- subscription_status: kopie Stripe Subscription.status ('trialing',
-- 'active', 'past_due', 'canceled', ...) - text, ne enum, at nemusime
-- migraci pri kazde nove Stripe hodnote.

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS subscription_status text,
  ADD COLUMN IF NOT EXISTS trial_end timestamptz,
  ADD COLUMN IF NOT EXISTS current_period_end timestamptz,
  ADD COLUMN IF NOT EXISTS cancel_at_period_end boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.user_profiles.subscription_status IS
  'Kopie Stripe Subscription.status (trialing/active/past_due/canceled/...). NULL = zadne aktivni predplatne.';
COMMENT ON COLUMN public.user_profiles.trial_end IS
  'Konec zkusebniho obdobi (Stripe Subscription.trial_end), NULL mimo trial.';
COMMENT ON COLUMN public.user_profiles.current_period_end IS
  'Konec aktualniho fakturacniho obdobi / datum pristi platby.';
COMMENT ON COLUMN public.user_profiles.cancel_at_period_end IS
  'true = predplatne bylo zruseno pres portal, ale bezi dal do current_period_end.';
