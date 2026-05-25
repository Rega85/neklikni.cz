/**
 * POST /api/databaze/search
 *
 * Veřejné vyhledávání subjektu v databázi nahlášených incidentů.
 *
 * Auth: volitelný (přihlášení uživatelé mají vyšší rate limit).
 * Rate limit: 5/24h pro anonymní (per IP hash), 20/24h pro přihlášené.
 *
 * Workflow:
 *  1. Validace `query` z body
 *  2. Auth check (volitelný, jen pro rate limit)
 *  3. In-memory rate limit
 *  4. Detekce typu identifikátoru + normalizace + SHA-256 hash
 *  5. Lookup `subject_identifiers` přes value_hash
 *  6. Pokud match → fetch subjekt, agregace incidentů, top kategorie,
 *     time range, všechny identifikátory subjektu, claim status
 *  7. Audit log (best-effort)
 *  8. Response
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
  normalizeVarSymbol,
} from '@/utils/databaze/identifiers'
import type { DatabazeDatabase } from '../_lib/database'

export const dynamic = 'force-dynamic'


// ── Rate limit (in-memory, MVP) ───────────────────────

const WINDOW_MS = 24 * 60 * 60 * 1000
const ANON_LIMIT = 5
const AUTH_LIMIT = 20

const rateLimitMap = new Map<string, number[]>()

function checkAndRecordRateLimit(key: string, limit: number): boolean {
  const now = Date.now()
  const cutoff = now - WINDOW_MS
  const stamps = (rateLimitMap.get(key) ?? []).filter((t) => t > cutoff)
  if (stamps.length >= limit) {
    rateLimitMap.set(key, stamps)
    return false
  }
  stamps.push(now)
  rateLimitMap.set(key, stamps)
  return true
}


// ── Helpers ──────────────────────────────────────────

async function hashIp(ip: string): Promise<string> {
  const pepper = process.env.IP_PEPPER
  if (!pepper) {
    // Fail loudly rather than fall back to a known constant — a guessable
    // pepper makes the SHA-256 IP hash deanonymisable via a rainbow table
    // over the IPv4 space.
    console.error('hashIp: IP_PEPPER env missing — refusing to hash')
    throw new Error('IP_PEPPER not configured')
  }
  const data = new TextEncoder().encode(ip + pepper)
  const digest = await crypto.subtle.digest('SHA-256', data)
  const bytes = new Uint8Array(digest)
  let hex = ''
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, '0')
  }
  return hex
}


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
  var_symbol: 'variabilní symbol',
  other: 'identifikátor',
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


interface SearchResponse {
  found: boolean
  detected_type: IdentifierType | null
  normalized_value?: string
  subject?: SearchResultSubject
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
  try {
    const cookieStore = await cookies()
    const supabaseSsr = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll() {},
        },
      },
    )
    const { data } = await supabaseSsr.auth.getUser()
    if (data.user) userId = data.user.id
  } catch (err) {
    console.error('Search auth check failed:', err)
  }

  // 3. Rate limit
  let rateKey: string
  let rateLimit: number
  if (userId) {
    rateKey = `user:${userId}`
    rateLimit = AUTH_LIMIT
  } else {
    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('x-real-ip') ||
      'unknown'
    rateKey = `ip:${await hashIp(ip)}`
    rateLimit = ANON_LIMIT
  }

  if (!checkAndRecordRateLimit(rateKey, rateLimit)) {
    return NextResponse.json(
      {
        error: `Limit ${rateLimit} vyhledávání za 24 hodin vyčerpán. Zkuste to později.`,
      },
      { status: 429 },
    )
  }

  // 4. Detekce typu + normalizace
  const detected_type = detectIdentifierType(query)
  if (!detected_type) {
    const response: SearchResponse = {
      found: false,
      detected_type: null,
      message:
        'Formát nelze rozpoznat. Použijte telefon (+420...), e-mail, číslo účtu (12345/0100), Facebook profil nebo variabilní symbol.',
    }
    return NextResponse.json(response)
  }

  const normalized = normalizeByType(detected_type, query)
  if (!normalized) {
    const response: SearchResponse = {
      found: false,
      detected_type,
      message: `Neplatný formát pro ${TYPE_LABEL_GENITIV[detected_type]}.`,
    }
    return NextResponse.json(response)
  }

  const hash = await hashIdentifier(normalized)
  const masked = maskIdentifier(normalized, detected_type)

  // 5. Lookup subject_identifiers
  try {
    const { data: idRow, error: idErr } = await supabaseAdmin()
      .from('subject_identifiers')
      .select('subject_id')
      .eq('value_hash', hash)
      .maybeSingle()

    if (idErr) {
      console.error('Search identifier lookup failed:', idErr)
      return NextResponse.json(
        { error: 'Chyba při hledání v databázi.' },
        { status: 500 },
      )
    }

    if (!idRow) {
      const response: SearchResponse = {
        found: false,
        detected_type,
        normalized_value: masked,
        message:
          'V naší databázi není žádný záznam k tomuto identifikátoru. To NEZNAMENÁ, že je subjekt důvěryhodný — vždy ověřte i jinými způsoby (osobní setkání, escrow služba, ČSOB Pay Bezpečně).',
      }
      return NextResponse.json(response)
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
      return NextResponse.json(
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
      return NextResponse.json(response)
    }

    // 7. Incidenty pro agregaci
    const { data: incidents, error: iErr } = await supabaseAdmin()
      .from('incidents')
      .select('category, incident_date')
      .eq('subject_id', subjectId)
      .in('status', PUBLIC_STATUSES)

    if (iErr) {
      console.error('Search incidents fetch failed:', iErr)
      return NextResponse.json(
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
      return NextResponse.json(
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
    return NextResponse.json(response)
  } catch (err) {
    console.error('Search route exception:', err)
    return NextResponse.json({ error: 'Chyba serveru.' }, { status: 500 })
  }
}
