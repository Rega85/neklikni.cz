-- Fixup pro 20260710_subject_visibility_trigger.sql — visibility_status
-- je enum subject_visibility, string literály v CASE výrazu se needy
-- automaticky kastují v UPDATE ... SET kontextu (zjištěno živým testem
-- proti produkci: "column visibility_status is of type subject_visibility
-- but expression is of type text").

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
  SET visibility_status = (CASE WHEN v_has_qualifying THEN 'active' ELSE 'removed' END)::subject_visibility
  WHERE id = v_subject_id
    AND visibility_status IN ('active', 'removed');

  RETURN COALESCE(NEW, OLD);
END;
$$;
