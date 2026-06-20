-- =============================================================
-- Alternativa k povinnému dokladu v kroku "Důkazy" formuláře nahlášení.
-- Reportér bez screenshotu/dokladu může místo souboru zaškrtnout
-- "nemám doklad" a vyplnit povinné textové zdůvodnění (min. 80 znaků,
-- vynuceno v app vrstvě). Soubor evidence zůstává nepovinný v tomto
-- případě — incident pak prostě nemá žádný řádek v `evidence`.
-- =============================================================

ALTER TABLE public.incidents
  ADD COLUMN IF NOT EXISTS no_evidence_explanation text;

COMMENT ON COLUMN public.incidents.no_evidence_explanation IS
  'Vyplněno jen pokud reportér zaškrtl "nemám doklad" — nahrazuje chybějící evidence soubory textovým popisem okolností (telefonát, hotovost apod).';
