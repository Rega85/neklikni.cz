-- =============================================================
-- Nový typ identifikátoru 'website' (web/doména e-shopu).
-- Umožňuje hledat a nahlašovat podvodné e-shopy/weby v databázi
-- incidentů stejným mechanismem jako telefon/email/účet/FB profil.
-- =============================================================

-- Enum ADD VALUE je v Postgresu 12+ povoleno uvnitř transakce.
ALTER TYPE public.identifier_type ADD VALUE IF NOT EXISTS 'website';
