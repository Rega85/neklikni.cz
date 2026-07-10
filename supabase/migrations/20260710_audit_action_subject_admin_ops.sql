-- Nové audit_action hodnoty pro /admin/subjekty (GDPR takedown nástroj):
-- hide_subject/unhide_subject (manuální skrytí, mimo automatický trigger
-- z 20260710_subject_visibility_trigger), delete_subject (nevratné
-- smazání s kaskádou). Aditivní, bezpečná změna enumu.
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'hide_subject';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'unhide_subject';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'delete_subject';
