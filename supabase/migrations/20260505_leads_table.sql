-- =============================================================
-- Leads table for lead-magnet capture (PDF "10 nejčastějších
-- českých podvodů" etc.). Server-only access via service_role.
-- =============================================================

CREATE TABLE IF NOT EXISTS public.leads (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  email       text        NOT NULL,
  source      text        NOT NULL DEFAULT 'unknown',
  created_at  timestamptz NOT NULL DEFAULT now(),
  -- Light de-duplication: same email + source can only be captured once
  UNIQUE (email, source)
);

CREATE INDEX IF NOT EXISTS leads_created_at_idx ON public.leads (created_at DESC);

-- RLS: server-only (no anon/authenticated access via PostgREST).
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
