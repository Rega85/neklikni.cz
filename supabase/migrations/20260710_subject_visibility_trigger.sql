-- Auto-přepínání subjects.visibility_status podle existence kvalifikujícího
-- incidentu (published/notified, ne withdrawn — stejné pravidlo jako
-- isQualifyingIncident() v app/api/databaze/_lib/crossReference.ts).
--
-- Bug, který tohle řeší: subject_identifiers/subjects řádek vznikne hned
-- při vytvoření nahlášení (visibility_status defaultuje na 'active') a nic
-- ho nikdy nemění zpět. Když admin jediný incident subjektu zamítne
-- (moderace), nebo si reportér sám svoje nahlášení stáhne
-- (/api/databaze/incident/[id]/resolve → resolution_status='withdrawn'),
-- subjekt zůstává navěky "found: true" v /api/databaze/search a
-- /api/check i bez jediného platného nahlášení.
--
-- Symetrický párový trigger k trg_incidents_refresh_trust_score (viz
-- 20260514_120000_create_reports_database.sql sekce 12-13) — stejný
-- princip, jiné odvozené pole.
--
-- Záměrně úzký rozsah: přepíná JEN mezi 'active' a 'removed'. Nikdy
-- nepřepíše 'hidden_objection' ani 'pending' — ty jsou (byť zatím
-- nevyužité v app kódu) vyhrazené pro budoucí admin/objection flow,
-- který má mít nad viditelností poslední slovo.

CREATE OR REPLACE FUNCTION public.refresh_subject_visibility()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  v_subject_id uuid;
  v_has_qualifying boolean;
BEGIN
  v_subject_id := COALESCE(NEW.subject_id, OLD.subject_id);

  SELECT EXISTS (
    SELECT 1 FROM public.incidents
    WHERE subject_id = v_subject_id
      AND status IN ('published', 'notified')
      AND resolution_status != 'withdrawn'
  ) INTO v_has_qualifying;

  UPDATE public.subjects
  SET visibility_status = CASE WHEN v_has_qualifying THEN 'active' ELSE 'removed' END
  WHERE id = v_subject_id
    AND visibility_status IN ('active', 'removed');

  RETURN COALESCE(NEW, OLD);
END;
$$;

COMMENT ON FUNCTION public.refresh_subject_visibility IS
  'Po každé změně incidents přepočítá subjects.visibility_status podle
   existence kvalifikujícího incidentu (published/notified, ne withdrawn).
   Nikdy nepřepíše hidden_objection/pending (vyhrazeno pro admin/objection
   flow).';

DROP TRIGGER IF EXISTS trg_incidents_refresh_subject_visibility ON public.incidents;
CREATE TRIGGER trg_incidents_refresh_subject_visibility
  AFTER INSERT OR UPDATE OR DELETE ON public.incidents
  FOR EACH ROW EXECUTE FUNCTION public.refresh_subject_visibility();
