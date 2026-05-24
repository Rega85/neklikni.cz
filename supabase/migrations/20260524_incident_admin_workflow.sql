-- =============================================================
-- Admin moderation workflow rozšíření.
-- 1) Třetí moderační stav: 'needs_more_info' (vrátit k doplnění).
-- 2) Sloupec incidents.admin_note — strukturovaná poznámka admina
--    pro needs_more_info workflow (a obecně admin anotace).
--    Důvod zamítnutí dál žije v existujícím incidents.removed_reason.
-- 3) Nová audit action 'reveal_identifier' pro logování odkrytí
--    plné hodnoty subject_identifier adminem.
-- =============================================================

-- Enum ADD VALUE je v Postgresu 12+ povoleno uvnitř transakce.
ALTER TYPE public.incident_status ADD VALUE IF NOT EXISTS 'needs_more_info';
ALTER TYPE public.audit_action ADD VALUE IF NOT EXISTS 'reveal_identifier';

ALTER TABLE public.incidents
  ADD COLUMN IF NOT EXISTS admin_note text;

COMMENT ON COLUMN public.incidents.admin_note IS
  'Volnotextová admin poznámka. U statusu needs_more_info obsahuje pokyn co doplnit; jinak volitelná interní anotace.';
