/**
 * TypeScript typy pro modul databáze nahlášení (/databaze).
 *
 * Návaznost: docs/SPEC.md sekce 4 (datový model) a sekce 6.4 (formulář).
 * Jazyková hygiena: .claude/SKILL.md sekce 4 — žádná hodnotící slova
 * v human-readable labels.
 *
 * NOTE: Supabase generated types (`types/supabase.ts`) zatím neexistují.
 * Až je Pavel vygeneruje přes `supabase gen types typescript`, re-export
 * patří sem na začátek a Repository vrstva by je měla použít místo
 * manuálních interface níže.
 *
 * Všechny ENUM string-literál typy MUSÍ odpovídat 1:1 databázovým enumům
 * v migraci `supabase/migrations/20260514_120000_create_reports_database.sql`.
 */


// =====================================================
// 1. ENUM TYPY (string literals)
// =====================================================

/**
 * Trust level nahlašovatele. Odvozeno od stupně ověření identity.
 * Viz `reporter_trust_level` v DB.
 */
export type ReporterTrustLevel = 'anonymous' | 'verified' | 'premium'


/**
 * Viditelnost subjektu ve veřejném view.
 * Viz `subject_visibility` v DB.
 */
export type SubjectVisibility =
  | 'active'
  | 'hidden_objection'
  | 'removed'
  | 'pending'


/**
 * Typ identifikátoru subjektu.
 * Viz `identifier_type` v DB.
 */
export type IdentifierType =
  | 'phone'
  | 'account'
  | 'email'
  | 'facebook_url'
  | 'var_symbol'
  | 'other'


/**
 * Platforma, kde k incidentu došlo.
 * Viz `incident_platform` v DB.
 */
export type IncidentPlatform =
  | 'fb_marketplace'
  | 'fb_groups'
  | 'sbazar'
  | 'bazos'
  | 'vinted'
  | 'aukro'
  | 'email'
  | 'sms'
  | 'phone'
  | 'other'


/**
 * Kategorie / typ incidentu.
 * Viz `incident_category` v DB.
 */
export type IncidentCategory =
  | 'non_delivery'
  | 'misrepresentation'
  | 'fake_courier'
  | 'disappeared_listing'
  | 'fake_profile'
  | 'romance'
  | 'investment'
  | 'rental'
  | 'tickets'
  | 'employment'
  | 'other'


/**
 * Závažnost incidentu (vazba na výši ztráty).
 * Viz `incident_severity` v DB.
 */
export type IncidentSeverity =
  | 'attempt'
  | 'minor'
  | 'medium'
  | 'major'
  | 'severe'


/**
 * Workflow status incidentu.
 * Viz `incident_status` v DB.
 */
export type IncidentStatus =
  | 'pending'
  | 'pending_merge_review'
  | 'ai_reviewed'
  | 'notified'
  | 'published'
  | 'objected'
  | 'removed'
  | 'needs_more_info'


/**
 * Typ nahraného důkazu.
 * Viz `evidence_type` v DB.
 */
export type EvidenceType =
  | 'screenshot'
  | 'payment_proof'
  | 'communication'
  | 'other'


/**
 * Workflow status námitky.
 * Viz `objection_status` v DB.
 */
export type ObjectionStatus = 'pending' | 'upheld' | 'rejected' | 'partial'


/**
 * Status Stripe subskripce pro Claim & Respond.
 * Viz `claim_subscription_status` v DB.
 */
export type ClaimSubscriptionStatus =
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'incomplete'


// =====================================================
// 2. HUMAN-READABLE LABELS (česky)
// =====================================================
// Pravidla z .claude/SKILL.md sekce 4:
// - Faktické popisy, ne hodnocení charakteru
// - Místo "falešný" → "imitace"
// - Místo "podvod" → "schéma" / vynechat

/**
 * Lidsky čitelný název platformy (česky).
 */
export const PLATFORM_LABELS: Record<IncidentPlatform, string> = {
  fb_marketplace: 'Facebook Marketplace',
  fb_groups: 'Facebook skupiny',
  sbazar: 'Sbazar',
  bazos: 'Bazoš',
  vinted: 'Vinted',
  aukro: 'Aukro',
  email: 'E-mail',
  sms: 'SMS',
  phone: 'Telefon',
  other: 'Jiné',
}


/**
 * Lidsky čitelný název kategorie incidentu (česky, faktický popis).
 *
 * Slovník dodržuje jazykovou hygienu — nepoužívá hodnotící termíny
 * jako "podvodník", "falešný" (o osobě) nebo "podvod".
 */
export const CATEGORY_LABELS: Record<IncidentCategory, string> = {
  non_delivery: 'Nedodání zboží po platbě',
  misrepresentation: 'Zboží neodpovídá popisu',
  fake_courier: 'Imitace kurýra / přepravce',
  disappeared_listing: 'Zmizelý inzerát po platbě',
  fake_profile: 'Imitace profilu',
  romance: 'Romance scam',
  investment: 'Investiční schéma',
  rental: 'Rezervace bytu / nemovitosti',
  tickets: 'Vstupenky',
  employment: 'Pracovní nabídka',
  other: 'Jiné',
}


/**
 * Lidsky čitelná závažnost s rozsahem ztráty.
 */
export const SEVERITY_LABELS: Record<IncidentSeverity, string> = {
  attempt: 'Pokus (bez ztráty)',
  minor: 'Drobný (do 1 000 Kč)',
  medium: 'Střední (1 000–10 000 Kč)',
  major: 'Velký (10 000–100 000 Kč)',
  severe: 'Závažný (nad 100 000 Kč)',
}


/**
 * Numerické váhy závažnosti pro výpočet trust score.
 *
 * MUSÍ odpovídat váhám v DB funkci `public.calculate_trust_score`
 * (migrace `20260514_120000_create_reports_database.sql` sekce 12).
 */
export const SEVERITY_WEIGHTS: Record<IncidentSeverity, number> = {
  attempt: 0,
  minor: 1,
  medium: 2,
  major: 4,
  severe: 8,
}


// =====================================================
// 3. FORM INPUT TYPY
// =====================================================

/**
 * Vstup z formuláře `/databaze/nahlasit` (5 kroků stepperu).
 *
 * Viz docs/SPEC.md sekce 5.1 (proces nahlášení) a 6.4 (UI formulář).
 *
 * Identifikátory jsou v raw podobě — normalizují se až server-side
 * pomocí `utils/databaze/identifiers.ts`.
 */
export interface IncidentFormInput {
  /** ISO datum incidentu (YYYY-MM-DD). */
  incidentDate: string
  /** Platforma, kde k incidentu došlo. */
  platform: IncidentPlatform
  /** Volný popis platformy, pokud platform === 'other'. */
  platformOther?: string
  /** Kategorie incidentu. */
  category: IncidentCategory
  /** Volný popis kategorie, pokud category === 'other'. */
  categoryOther?: string
  /** Závažnost (vazba na výši ztráty). */
  severity: IncidentSeverity
  /** Částka v korunách (0 pokud severity === 'attempt'). */
  amountCzk: number
  /** Vlastní popis incidentu (50–1000 znaků). */
  description: string
  /** Identifikátory protistrany (min 1). */
  identifiers: Array<{
    type: IdentifierType
    /** Raw hodnota před normalizací. */
    value: string
  }>
  /** Volitelný kontakt na dotčenou osobu, pokud nahlašovatel zná jiný. */
  contactForSubjectEmail?: string
  /** Důkazy (min 2, max 5 souborů). */
  evidenceFiles: File[]
  /** Checkbox: "Údaje jsou pravdivé, beru na vědomí § 184 TZ". */
  truthConfirmation: boolean
  /** Checkbox: souhlas se zpracováním osobních údajů (GDPR). */
  dataProcessingConsent: boolean
  /** Checkbox: souhlas se zpřístupněním orgánům činným v trestním řízení. */
  lawEnforcementConsent: boolean
}


// =====================================================
// 4. AI PRECHECK RESPONSE
// =====================================================

/**
 * Odpověď AI předkontroly (Claude) na nahlášený incident.
 *
 * Viz docs/SPEC.md sekce 5.5. Pole jsou v `snake_case`, protože jdou
 * přímo z JSON odpovědi Claude API a ukládají se do `incidents.ai_*`
 * sloupců, které také používají snake_case.
 */
export interface AiPrecheckResult {
  /** 0–100, jak autenticky nahlášení vypadá (100 = zcela autenticky). */
  confidence_score: number
  /** 2–3 věty: faktický popis bez hodnocení charakteru. */
  ai_summary: string
  /** Seznam red flags identifikovaných modelem (prázdné pokud žádné). */
  red_flags: string[]
  /** Doporučení dalšího kroku. */
  recommendation: 'auto_publish' | 'manual_review' | 'reject'
}


// =====================================================
// 5. PUBLIC VIEW TYPY
// =====================================================

/**
 * Subjekt v public view (anonymizovaný, pro nepřihlášené i přihlášené).
 *
 * Identifikátory jsou maskované — plné hodnoty vidí jen claimed_by
 * a admin (viz docs/SPEC.md sekce 6.3).
 */
export interface PublicSubjectView {
  /** UUID subjektu (hash by se hodil víc, ale UUID stačí pro public URL). */
  id: string
  /** Maskovaný display name, např. "Pa**** N***". */
  displayNameMasked: string
  /** Trust score 0–100 (počítá se z incidentů). */
  trustScore: number
  /** Počet aktivních (status='published') incidentů. */
  incidentCount: number
  /** Top 3 nejčastější kategorie incidentů. */
  topCategories: Array<{
    category: IncidentCategory
    count: number
  }>
  /** Časový rozsah incidentů (null pokud žádné). */
  dateRange: {
    /** ISO datum nejstaršího incidentu. */
    from: string
    /** ISO datum nejnovějšího incidentu. */
    to: string
  } | null
  /** True pokud má subjekt aktivní Claim & Respond subskripci. */
  isClaimed: boolean
  /** Maskované identifikátory (z view `subject_identifiers_public`). */
  identifiers: Array<{
    type: IdentifierType
    /** Maskovaná hodnota, např. "+420 7** *** *77". */
    valueMasked: string
    /** True pokud byl identifikátor ověřen vícero nahlášeními nebo claim. */
    verified: boolean
  }>
}
