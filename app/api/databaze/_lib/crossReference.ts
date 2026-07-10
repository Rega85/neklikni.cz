/**
 * Cross-reference identifikátorů z volného textu (např. zpráva, kterou
 * uživatel posílá k AI analýze) proti databázi nahlášených incidentů.
 *
 * Workflow:
 *  1. `extractIdentifiers(text)` — regex extrakce telefonů, čísel účtů,
 *     emailů.
 *  2. `checkIdentifiersInDatabase(client, identifiers)` — normalize +
 *     hash + lookup v `subject_identifiers`, agregace incidentů s
 *     veřejnou status.
 *
 * Znovupoužívá existující normalize/hash helpery z `utils/databaze`,
 * žádná logika se nezdvojuje.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import {
  hashIdentifier,
  maskIdentifier,
  normalizeAccount,
  normalizeEmail,
  normalizePhone,
} from '@/utils/databaze/identifiers'
import type { IdentifierType, IncidentResolutionStatus, IncidentStatus } from '@/types/databaze'

// Veřejně viditelné stavy. ai_reviewed sem NEpatří — od přepnutí na
// manuální schvalování čeká AI-prověřený incident ve frontě
// /admin/moderace, dokud admin neudělá explicit "Schválit".
export const PUBLIC_STATUSES: IncidentStatus[] = ['published', 'notified']

/**
 * True, pokud incident počítá do veřejného "found" stavu subjektu a do
 * jeho incident_count — publikovaný/oznámený A NE smírně stažený
 * reportérem. Jediné místo pravdy pro tohle pravidlo — používají ho
 * checkIdentifiersInDatabase (níže) i app/api/databaze/search/route.ts,
 * ať se nerozjedou (viz bug: subjekt evidován v DB s 0 nahlášeními,
 * protože jediný incident měl status='removed' a nikdo to nekontroloval
 * konzistentně).
 */
export function isQualifyingIncident(incident: {
  status: IncidentStatus
  resolution_status: IncidentResolutionStatus | string | null
}): boolean {
  return PUBLIC_STATUSES.includes(incident.status) && incident.resolution_status !== 'withdrawn'
}

export interface ExtractedIdentifier {
  type: IdentifierType
  rawValue: string
}

export interface DatabaseMatch {
  type: IdentifierType
  value_masked: string
  /**
   * Původní (nemaskovaná) hodnota tak, jak ji uživatel napsal v textu
   * analýzy. Slouží VÝHRADNĚ pro deep-link do /databaze/hledat — UI ji
   * nikdy nezobrazuje. GDPR: pochází z vlastního vstupu uživatele.
   */
  query_value: string
  incident_count: number
  trust_score: number
  /** true = ověřený záznam (admin/moderace), false = komunitní nahlášení bez ověření. */
  verified: boolean
}

// ── 1. Extrakce z textu ──────────────────────────────

export const EMAIL_RE = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g
// Číslo účtu: volitelný prefix-, 2-10 číslic, /, 4 číslice
export const ACCOUNT_RE = /(?<![\d/-])(?:\d{1,6}-)?\d{2,10}\/\d{4}\b/g
// Telefon: +420 / 00420 / 420 prefix nebo holé 9 číslic (s mezerami)
export const PHONE_RE = /(?:\+420|00420|420)?[\s-]?(?:\d[\s-]?){9}/g

/**
 * Vytáhne z textu emaily, čísla účtů a telefony. Vrací raw hodnoty
 * (nenormalizované) s detekovaným typem. Duplicity (per type+raw) jsou
 * filtrovány.
 */
export function extractIdentifiers(text: string): ExtractedIdentifier[] {
  if (typeof text !== 'string' || text.trim() === '') return []

  const seen = new Set<string>()
  const out: ExtractedIdentifier[] = []
  const push = (type: IdentifierType, rawValue: string) => {
    const key = `${type}:${rawValue}`
    if (seen.has(key)) return
    seen.add(key)
    out.push({ type, rawValue })
  }

  // Emaily — extrahuj první, ať se nezamotají do phone/account regexů
  let work = text
  for (const m of work.matchAll(EMAIL_RE)) {
    push('email', m[0])
  }
  // Odstraň matchnuté emaily z textu pro další regexy
  work = work.replace(EMAIL_RE, ' ')

  for (const m of work.matchAll(ACCOUNT_RE)) {
    push('account', m[0])
  }
  // Odstraň účty (ať jejich číslice nepřispějí do phone regexu)
  work = work.replace(ACCOUNT_RE, ' ')

  for (const m of work.matchAll(PHONE_RE)) {
    // Validuj přes normalizePhone — vyfiltruje falešné shody
    if (normalizePhone(m[0]) !== null) {
      push('phone', m[0].trim())
    }
  }

  return out
}

// ── 2. Lookup v DB ───────────────────────────────────

interface NormalizedIdentifier {
  type: IdentifierType
  rawValue: string
  normalized: string
  hash: string
}

async function normalizeForLookup(
  ext: ExtractedIdentifier,
): Promise<NormalizedIdentifier | null> {
  let normalized: string | null = null
  switch (ext.type) {
    case 'phone':
      normalized = normalizePhone(ext.rawValue)
      break
    case 'account':
      normalized = normalizeAccount(ext.rawValue)
      break
    case 'email':
      normalized = normalizeEmail(ext.rawValue)
      break
    default:
      normalized = null
  }
  if (!normalized) return null
  const hash = await hashIdentifier(normalized)
  return { type: ext.type, rawValue: ext.rawValue, normalized, hash }
}

/**
 * Pro každý identifikátor: normalize → hash → lookup v
 * `subject_identifiers`. Match vrátí `value_masked`, `incident_count`
 * (jen incidenty splňující isQualifyingIncident) a `trust_score` z
 * `subjects`.
 *
 * Best-effort: jakýkoliv DB error → vrací prázdné pole, neházet.
 */
export async function checkIdentifiersInDatabase(
  client: SupabaseClient,
  identifiers: ExtractedIdentifier[],
): Promise<DatabaseMatch[]> {
  if (identifiers.length === 0) return []

  try {
    const normalized: NormalizedIdentifier[] = []
    for (const ext of identifiers) {
      const n = await normalizeForLookup(ext)
      if (n) normalized.push(n)
    }
    if (normalized.length === 0) return []

    const hashes = normalized.map((n) => n.hash)
    const { data: idRows, error: idErr } = await client
      .from('subject_identifiers')
      .select('subject_id, value_hash, value_masked, type, verified')
      .in('value_hash', hashes)

    if (idErr || !idRows || idRows.length === 0) {
      if (idErr) console.warn('crossReference identifier lookup failed:', idErr)
      return []
    }

    const subjectIds = [...new Set(idRows.map((r: any) => r.subject_id as string))]

    const [subjectsRes, incidentsRes] = await Promise.all([
      client
        .from('subjects')
        .select('id, trust_score, visibility_status')
        .in('id', subjectIds),
      client
        .from('incidents')
        .select('subject_id, status, resolution_status')
        .in('subject_id', subjectIds),
    ])

    if (subjectsRes.error) {
      console.warn('crossReference subjects fetch failed:', subjectsRes.error)
      return []
    }
    if (incidentsRes.error) {
      console.warn('crossReference incidents fetch failed:', incidentsRes.error)
      return []
    }

    const trustBySubject = new Map<string, number>()
    const visibleSubjects = new Set<string>()
    for (const s of (subjectsRes.data ?? []) as Array<{
      id: string
      trust_score: number
      visibility_status: string
    }>) {
      if (s.visibility_status === 'removed') continue
      visibleSubjects.add(s.id)
      trustBySubject.set(s.id, s.trust_score)
    }

    const countBySubject = new Map<string, number>()
    for (const inc of (incidentsRes.data ?? []) as Array<{
      subject_id: string
      status: IncidentStatus
      resolution_status: string | null
    }>) {
      if (!isQualifyingIncident(inc)) continue
      countBySubject.set(inc.subject_id, (countBySubject.get(inc.subject_id) ?? 0) + 1)
    }

    const matches: DatabaseMatch[] = []
    const usedHashes = new Set<string>()
    for (const norm of normalized) {
      if (usedHashes.has(norm.hash)) continue
      const row = (idRows as Array<{
        subject_id: string
        value_hash: string
        value_masked: string
        type: IdentifierType
        verified: boolean
      }>).find((r) => r.value_hash === norm.hash)
      if (!row) continue
      if (!visibleSubjects.has(row.subject_id)) continue
      const incident_count = countBySubject.get(row.subject_id) ?? 0
      if (incident_count === 0) continue
      usedHashes.add(norm.hash)
      matches.push({
        type: norm.type,
        value_masked: row.value_masked ?? maskIdentifier(norm.normalized, norm.type),
        query_value: norm.rawValue,
        incident_count,
        trust_score: trustBySubject.get(row.subject_id) ?? 0,
        verified: row.verified,
      })
    }

    return matches
  } catch (err) {
    console.warn('crossReference exception:', err)
    return []
  }
}

// ── 3. ČOI cross-reference (domény) ──────────────────

export interface CoiMatch {
  domain: string
  reason: string | null
  category: string | null
  reported_date: string | null
  source: string
  source_url: string | null
}

/**
 * Cross-referuje domény proti veřejnému seznamu rizikových e-shopů ČOI
 * (`coi_risky_eshops`). Nezávislé na subject_identifiers/incidents.
 *
 * Best-effort: DB chyba → prázdné pole, nikdy nevyhazuje.
 */
export async function checkDomainsInCoi(
  client: SupabaseClient,
  domains: string[],
): Promise<CoiMatch[]> {
  const cleaned = [...new Set(domains.map((d) => d.trim().toLowerCase()).filter(Boolean))]
  if (cleaned.length === 0) return []

  try {
    const { data, error } = await client
      .from('coi_risky_eshops')
      .select('domain, reason, category, reported_date, source, source_url')
      .in('domain', cleaned)

    if (error) {
      console.warn('checkDomainsInCoi lookup failed:', error)
      return []
    }
    return (data ?? []) as CoiMatch[]
  } catch (err) {
    console.warn('checkDomainsInCoi exception:', err)
    return []
  }
}
