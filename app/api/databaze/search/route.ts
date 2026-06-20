/**
 * POST /api/databaze/search
 *
 * Veřejné vyhledávání subjektu v databázi nahlášených incidentů.
 *
 * Auth: volitelný. Přihlášený uživatel má vyšší rate limit, anonymní
 * uživatel jen 1 dotaz / 24h (cookie token jako UX shortcut + Redis jako
 * sdílený counter napříč Vercel instancemi).
 *
 * Workflow:
 *  1. Validace `query` z body
 *  2. Auth check (volitelný)
 *  3. Rate limit (anon: cookie + Redis IP hash, auth: Redis per user-id)
 *  4. Detekce typu identifikátoru + normalizace + SHA-256 hash
 *  5. Lookup `subject_identifiers` přes value_hash
 *     PRO TYP 'website': paralelně také lookup v `coi_risky_eshops`
 *  6. Pokud match → fetch subjekt, agregace incidentů, top kategorie,
 *     time range, všechny identifikátory subjektu, claim status
 *  7. Audit log (best-effort)
 *  8. Response (na anon volání nastavuje cookie token)
 *
 *  coi_match: přítomen pokud domain odpovídá záznamu v ČOI seznamu
 *  (nezávisle na tom, zda existuje user incident — oboje se vrátí).
 */

import { NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type {
  IdentifierType,
  IncidentCategory,
  IncidentStatus,
  SubjectVisibility,
} from '@/types/databaze'
import {
  detectIdentifierType,
  hashIdentifier,
  maskIdentifier,
  normalizeAccount,
  normalizeEmail,
  normalizeFacebookUrl,
  normalizeIban,
  normalizePhone,
  normalizePhoneVariants,
  normalizeVarSymbol,
  normalizeWebsite,
} from '@/utils/databaze/identifiers'
import type { CoiRiskyEshopRow, DatabazeDatabase, SearchLogQueryType } from '../_lib/database'
import { checkRateLimit, hashForRL } from '../../_lib/ratelimit'

export const dynamic = 'force-dynamic'


// ── Rate limit konfigurace ────────────────────────────
// Anonymní: 1 dotaz / 24h (konverzní moment → výzva k registraci)
// Auth: 20 dotazů / 24h
// Redis (Upstash) zajišťuje sdílený counter napříč Vercel instancemi.

const WINDOW_SECONDS = 24 * 60 * 60
const ANON_LIMIT = 1
const AUTH_LIMIT = 20

const ANON_COOKIE = 'nk_anon_search'


// ── Helpers ──────────────────────────────────────────

function normalizeByType(type: IdentifierType, raw: string): string | null {
  switch (type) {
    case 'phone':
      return normalizePhone(raw)
    case 'account':
      return normalizeAccount(raw) ?? normalizeIban(raw)
    case 'email':
      return normalizeEmail(raw)
    case 'facebook_url':
      return normalizeFacebookUrl(raw)
    case 'website':
      return normalizeWebsite(raw)
    case 'var_symbol':
      return normalizeVarSymbol(raw)
    case 'other':
      return raw.trim() === '' ? null : raw.trim()
    default:
      return null
  }
}


const TYPE_LABEL_GENITIV: Record<IdentifierType, string> = {
  phone: 'telefon',
  account: 'číslo účtu',
  email: 'e-mail',
  facebook_url: 'Facebook profil',
  website: 'web/doménu',
  var_symbol: 'variabilní symbol',
  other: 'identifikátor',
}


// search_log.query_type je užší enum než IdentifierType — facebook_url,
// website a var_symbol mapujeme na 'url'/'other' pro jednodušší konverzní
// reporting.
function toSearchLogType(type: IdentifierType | null): SearchLogQueryType {
  switch (type) {
    case 'phone':
    case 'account':
    case 'email':
      return type
    case 'facebook_url':
    case 'website':
      return 'url'
    default:
      return 'other'
  }
}


// ── Lazy-init Supabase admin ─────────────────────────

type SupabaseAdminClient = ReturnType<typeof createSupabaseClient<DatabazeDatabase>>
let _supabaseAdmin: SupabaseAdminClient | null = null
function supabaseAdmin(): SupabaseAdminClient {
  if (!_supabaseAdmin) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) throw new Error('Supabase admin env vars missing')
    _supabaseAdmin = createSupabaseClient<DatabazeDatabase>(url, key)
  }
  return _supabaseAdmin
}


// ── Response types ───────────────────────────────────

interface SearchResultSubject {
  id: string
  display_name_masked: string
  trust_score: number
  visibility_status: SubjectVisibility
  incident_count: number
  top_categories: Array<{ category: IncidentCategory; count: number }>
  date_range: { from: string; to: string } | null
  is_claimed: boolean
  identifiers: Array<{
    type: IdentifierType
    value_masked: string
    verified: boolean
  }>
}

export interface CoiMatch {
  domain: string
  reason: string | null
  category: string | null
  reported_date: string | null
  source: string
  source_url: string | null
}

interface SearchResponse {
  found: boolean
  detected_type: IdentifierType | null
  normalized_value?: string
  subject?: SearchResultSubject
  /** Záznam z ČOI seznamu rizikových e-shopů (nezávislý na user incidentech) */
  coi_match?: CoiMatch
  message?: string
}


// Veřejně viditelné stavy. ai_reviewed sem už NEpatří — od přepnutí na
// manuální schvalování čeká AI-prověřený incident ve frontě
// /admin/moderace, dokud admin neudělá explicit "Schválit".
const PUBLIC_STATUSES: IncidentStatus[] = ['published', 'notified']


// ── POST handler ─────────────────────────────────────

export async function POST(req: Request) {
  // 1. Parse body
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Neplatný JSON.' }, { status: 400 })
  }

  const rawQuery =
    body && typeof body === 'object' && 'query' in body
      ? (body as Record<string, unknown>).query
      : null
  if (typeof rawQuery !== 'string' || rawQuery.trim().length === 0) {
    return NextResponse.json(
      { error: 'Zadejte hodnotu k vyhledání.' },
      { status: 400 },
    )
  }
  const query = rawQuery.trim()

  // 2. Auth check (volitelný)
  let userId: string | null = null
  const cookieStore = await cookies()
  try {
    const supabaseSsr = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll() {},
        },
      },
    )
    const { data } = await supabaseSsr.auth.getUser()
    if (data.user) userId = data.user.id
  } catch (err) {
    console.error('Search auth check failed:', err)
  }

  // 3. Rate limit (Redis-backed, fail-open — search je čtení, výpadek Redis
  //    nesmí rozbít vyhledávání pro legitimní uživatele)
  let setAnonCookie = false

  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  const ipHash = await hashForRL(ip)

  if (userId) {
    // Přihlášený uživatel: 20 dotazů / 24h per user_id
    const rl = await checkRateLimit(userId, 'search:auth', AUTH_LIMIT, '24 h')
    if (!rl.allowed) {
      return NextResponse.json(
        {
          error: `Limit ${AUTH_LIMIT} vyhledávání za 24 hodin vyčerpán. Zkuste to później.`,
          limit_reached: true,
        },
        { status: 429 },
      )
    }
  } else {
    // Anonymní uživatel: cookie je UX shortcut (rychlá odpověď bez Redis),
    // Redis je autoritativní cross-instance counter.
    if (cookieStore.get(ANON_COOKIE)) {
      return NextResponse.json(
        {
          error: 'Pro další vyhledávání se prosím registruj — je to zdarma a získáš neomezené ověřování.',
          limit_reached: true,
          require_registration: true,
        },
        { status: 429 },
      )
    }

    const rl = await checkRateLimit(ipHash, 'search:anon', ANON_LIMIT, '24 h')
    if (!rl.allowed) {
      return NextResponse.json(
        {
          error: 'Pro další vyhledávání se prosím registruj — je to zdarma a získáš neomezené ověřování.',
          limit_reached: true,
          require_registration: true,
        },
        { status: 429 },
      )
    }
    setAnonCookie = true
  }

  // Best-effort log do search_log pro konverzní analýzu — nesmí shodit response.
  const logSearch = async (queryType: SearchLogQueryType, found: boolean) => {
    try {
      await supabaseAdmin().from('search_log').insert({
        query_type: queryType,
        found,
        ip_hash: ipHash,
        user_id: userId,
      })
    } catch (err) {
      console.error('search_log insert failed:', err)
    }
  }

  // Helper: zaloguje vyhledávání a anon callům přilepí cookie token jako
  // UX shortcut pro příští request.
  const respond = async (
    body: unknown,
    init?: ResponseInit,
    log?: { queryType: SearchLogQueryType; found: boolean },
  ): Promise<NextResponse> => {
    if (log) await logSearch(log.queryType, log.found)
    const r = NextResponse.json(body, init)
    if (setAnonCookie) {
      r.cookies.set(ANON_COOKIE, '1', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: WINDOW_SECONDS,
      })
    }
    return r
  }

  // 4. Detekce typu + normalizace
  const detected_type = detectIdentifierType(query)
  if (!detected_type) {
    const response: SearchResponse = {
      found: false,
      detected_type: null,
      message:
        'Formát nelze rozpoznat. Použijte telefon (+420...), e-mail, číslo účtu (12345/0100), web e-shopu, Facebook profil nebo variabilní symbol.',
    }
    return respond(response, undefined, { queryType: 'other', found: false })
  }

  // Pro telefon: použij normalizePhoneVariants — 9xx čísla bez předvolby
  // jsou sdílená mezi CZ i SK, chceme najít shodu v DB pro obě varianty.
  let normalized: string
  let searchHashes: string[]
  if (detected_type === 'phone') {
    const variants = normalizePhoneVariants(query)
    if (variants.length === 0) {
      return respond({
        found: false,
        detected_type,
        message: `Neplatný formát pro ${TYPE_LABEL_GENITIV[detected_type]}.`,
      }, undefined, { queryType: toSearchLogType(detected_type), found: false })
    }
    normalized = variants[0]
    searchHashes = await Promise.all(variants.map(hashIdentifier))
  } else {
    const norm = normalizeByType(detected_type, query)
    if (!norm) {
      return respond({
        found: false,
        detected_type,
        message: `Neplatný formát pro ${TYPE_LABEL_GENITIV[detected_type]}.`,
      }, undefined, { queryType: toSearchLogType(detected_type), found: false })
    }
    normalized = norm
    searchHashes = [await hashIdentifier(norm)]
  }

  const masked = maskIdentifier(normalized, detected_type)

  // 5. Lookup subject_identifiers (+ paralelní ČOI lookup pro typ website)

  // Pro typ website: normalizovaná hodnota může obsahovat cestu
  // (např. "eshop-xy.cz/produkt"). ČOI ukládá jen root doménu → ořízneme.
  const coiDomain = detected_type === 'website'
    ? normalized.split('/')[0]
    : null

  try {
    // Paralelní dotazy: user incidenty + ČOI (pokud typ website)
    const [idResult, coiResult] = await Promise.all([
      supabaseAdmin()
        .from('subject_identifiers')
        .select('subject_id')
        .in('value_hash', searchHashes)
        .limit(1)
        .maybeSingle(),
      coiDomain
        ? supabaseAdmin()
            .from('coi_risky_eshops')
            .select('domain, reason, category, reported_date, source, source_url')
            .eq('domain', coiDomain)
            .limit(1)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ])

    const { data: idRow, error: idErr } = idResult
    const coiMatch: CoiMatch | undefined = (coiResult.data as CoiRiskyEshopRow | null)
      ? {
          domain: (coiResult.data as CoiRiskyEshopRow).domain,
          reason: (coiResult.data as CoiRiskyEshopRow).reason,
          category: (coiResult.data as CoiRiskyEshopRow).category,
          reported_date: (coiResult.data as CoiRiskyEshopRow).reported_date,
          source: (coiResult.data as CoiRiskyEshopRow).source,
          source_url: (coiResult.data as CoiRiskyEshopRow).source_url,
        }
      : undefined

    if (coiResult.error) {
      // ČOI lookup chyba není kritická — logujeme, ale nepřerušujeme
      console.warn('COI eshop lookup failed:', coiResult.error)
    }

    if (idErr) {
      console.error('Search identifier lookup failed:', idErr)
      return respond(
        { error: 'Chyba při hledání v databázi.' },
        { status: 500 },
      )
    }

    if (!idRow) {
      const response: SearchResponse = {
        found: false,
        detected_type,
        normalized_value: masked,
        coi_match: coiMatch,
        message:
          'Tento subjekt zatím není v naší databázi. To ale neznamená, že je 100% bezpečný — buď opatrný a ověř ho i jinak (Bank iD, osobní vyzvednutí, escrow služby jako Bazoš Bezpečně).',
      }
      return respond(response, undefined, { queryType: toSearchLogType(detected_type), found: Boolean(coiMatch) })
    }

    const subjectId = idRow.subject_id

    // 6. Fetch subjekt
    const { data: subjectRow, error: sErr } = await supabaseAdmin()
      .from('subjects')
      .select('*')
      .eq('id', subjectId)
      .maybeSingle()

    if (sErr || !subjectRow) {
      console.error('Search subject fetch failed:', sErr)
      return respond(
        { error: 'Chyba při čtení subjektu.' },
        { status: 500 },
      )
    }

    if (subjectRow.visibility_status === 'removed') {
      const response: SearchResponse = {
        found: false,
        detected_type,
        normalized_value: masked,
        message: 'Záznam byl odstraněn.',
      }
      return respond(response, undefined, { queryType: toSearchLogType(detected_type), found: false })
    }

    // 7. Incidenty pro agregaci
    const { data: incidents, error: iErr } = await supabaseAdmin()
      .from('incidents')
      .select('category, incident_date')
      .eq('subject_id', subjectId)
      .in('status', PUBLIC_STATUSES)
      .neq('resolution_status', 'withdrawn')

    if (iErr) {
      console.error('Search incidents fetch failed:', iErr)
      return respond(
        { error: 'Chyba při čtení incidentů.' },
        { status: 500 },
      )
    }

    const categoryCounts = new Map<IncidentCategory, number>()
    let minDate: string | null = null
    let maxDate: string | null = null
    for (const inc of incidents ?? []) {
      const cat = inc.category as IncidentCategory
      categoryCounts.set(cat, (categoryCounts.get(cat) ?? 0) + 1)
      if (!minDate || inc.incident_date < minDate) minDate = inc.incident_date
      if (!maxDate || inc.incident_date > maxDate) maxDate = inc.incident_date
    }
    const topCategories = [...categoryCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([category, count]) => ({ category, count }))

    // 8. Všechny identifikátory subjektu
    const { data: allIds, error: aiErr } = await supabaseAdmin()
      .from('subject_identifiers')
      .select('type, value_masked, verified')
      .eq('subject_id', subjectId)

    if (aiErr) {
      console.error('Search all identifiers fetch failed:', aiErr)
      return respond(
        { error: 'Chyba při čtení identifikátorů subjektu.' },
        { status: 500 },
      )
    }

    const isClaimed =
      subjectRow.claimed_by !== null &&
      subjectRow.claim_paid_until !== null &&
      new Date(subjectRow.claim_paid_until) > new Date()

    // 9. Audit log (best-effort)
    try {
      await supabaseAdmin()
        .from('audit_log')
        .insert({
          actor_type: userId ? 'reporter' : 'public',
          actor_id: userId,
          action: 'view_evidence',
          target_type: 'subject',
          target_id: subjectId,
          metadata: {
            context: 'public_search',
            detected_type,
          },
        })
    } catch (err) {
      console.error('Search audit log insert failed:', err)
    }

    // 10. Response
    const response: SearchResponse = {
      found: true,
      detected_type,
      normalized_value: masked,
      coi_match: coiMatch,
      subject: {
        id: subjectRow.id,
        display_name_masked: subjectRow.display_name_masked ?? masked,
        trust_score: subjectRow.trust_score,
        visibility_status: subjectRow.visibility_status,
        incident_count: incidents?.length ?? 0,
        top_categories: topCategories,
        date_range: minDate && maxDate ? { from: minDate, to: maxDate } : null,
        is_claimed: isClaimed,
        identifiers: (allIds ?? []).map((i) => ({
          type: i.type as IdentifierType,
          value_masked: i.value_masked,
          verified: i.verified,
        })),
      },
    }
    return respond(response, undefined, { queryType: toSearchLogType(detected_type), found: true })
  } catch (err) {
    console.error('Search route exception:', err)
    return respond({ error: 'Chyba serveru.' }, { status: 500 })
  }
}
