-- =============================================================
-- Možnost oznámit vyřešení/stažení nahlášeného incidentu.
-- `resolution_status` je oddělený stav od workflow `status` (ten řídí
-- moderaci a publikaci) — resolution popisuje, co se stalo PO zveřejnění
-- z pohledu nahlašovatele (smírné vyřešení, nebo stažení jako chybné).
--
-- Kdo může změnit: jen reportér (vlastník) nebo admin — vynuceno v API
-- vrstvě (service-role mutace s explicitní ownership kontrolou), ne RLS.
-- =============================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'incident_resolution_status') THEN
    CREATE TYPE incident_resolution_status AS ENUM (
      'active',
      'resolved_amicably',
      'withdrawn'
    );
  END IF;
END $$;

ALTER TABLE public.incidents
  ADD COLUMN IF NOT EXISTS resolution_status incident_resolution_status NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS resolution_note text,
  ADD COLUMN IF NOT EXISTS resolution_at timestamptz;

-- Enum ADD VALUE je v Postgresu 12+ povoleno uvnitř transakce.
ALTER TYPE public.audit_action ADD VALUE IF NOT EXISTS 'resolve_incident';

COMMENT ON COLUMN public.incidents.resolution_status IS
  'active = beze změny, resolved_amicably = nahlašovatel oznámil smírné vyřešení, withdrawn = nahlašovatel oznámil, že nahlášení bylo chybné/staženo.';
COMMENT ON COLUMN public.incidents.resolution_note IS
  'Volitelná krátká poznámka nahlašovatele k resolution_status.';
