/**
 * POST /api/databaze/search
 *
 * Veřejné vyhledávání subjektu v databázi nahlášených incidentů.
 *
 * Auth: volitelný. Přihlášený uživatel má vyšší rate limit, anonymní
 * uživatel jen 1 dotaz / 24h (cookie token + IP hash jako fallback).
 *
 * Workflow:
 *  1. Validace `query` z body
 *  2. Auth check (volitelný)
 *  3. Rate limit (anon: cookie + IP, auth: per user-id)
 *  4. Detekce typu identifikátoru + normalizace + SHA-256 hash
 *  5. Lookup `subject_identifiers` přes value_hash
 *  6. Pokud match → fetch subjekt, agregace incidentů, top kategorie,
 *     time range, všechny identifikátory subjektu, claim status
 *  7. Audit log (best-effort)
 *  8. Response (na anon volání nastavuje cookie token)
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
const WINDOW_SECONDS = 24 * 60 * 60
// Anonymní uživatel má 1 dotaz / 24h — po překročení limitu vyzva
// k registraci (jednoduchá konverze pro „rychle ověřit účet" use case).
const ANON_LIMIT = 1
const AUTH_LIMIT = 20

const ANON_COOKIE = 'nk_anon_search'

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

function peekRateLimit(key: string, limit: number): boolean {
  const now = Date.now()
  const cutoff = now - WINDOW_MS
  const stamps = (rateLimitMap.get(key) ?? []).filter((t) => t > cutoff)
  return stamps.length < limit
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
  const cookieStore = await cookies()
  try {
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
  //    Anonymní uživatel: limit 1/24h ověřujeme primárně HTTP-only cookie
  //    tokenem (přežije server restart) a sekundárně in-memory IP hashem
  //    (zachytí vyčištění cookies). Přihlášený uživatel: 20/24h podle user.id.
  let setAnonCookie = false
  if (userId) {
    const rateKey = `user:${userId}`
    if (!checkAndRecordRateLimit(rateKey, AUTH_LIMIT)) {
      return NextResponse.json(
        {
          error: `Limit ${AUTH_LIMIT} vyhledávání za 24 hodin vyčerpán. Zkuste to později.`,
          limit_reached: true,
        },
        { status: 429 },
      )
    }
  } else {
    if (cookieStore.get(ANON_COOKIE)) {
      return NextResponse.json(
        {
          error:
            'Pro další vyhledávání se prosím registruj — je to zdarma a získáš neomezené ověřování.',
          limit_reached: true,
          require_registration: true,
        },
        { status: 429 },
      )
    }

    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('x-real-ip') ||
      'unknown'
    const ipKey = `ip:${await hashIp(ip)}`
    if (!peekRateLimit(ipKey, ANON_LIMIT)) {
      return NextResponse.json(
        {
          error:
            'Pro další vyhledávání se prosím registruj — je to zdarma a získáš neomezené ověřování.',
          limit_reached: true,
          require_registration: true,
        },
        { status: 429 },
      )
    }
    // Zapsat IP počítadlo a označit, že na response dáme cookie.
    checkAndRecordRateLimit(ipKey, ANON_LIMIT)
    setAnonCookie = true
  }

  // Helper: anon callům po rate-limit checku přilepí cookie token, aby
  // další request ve 24h okně dostal 429 i po restartu serveru.
  const respond = (body: unknown, init?: ResponseInit): NextResponse => {
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
        'Formát nelze rozpoznat. Použijte telefon (+420...), e-mail, číslo účtu (12345/0100), Facebook profil nebo variabilní symbol.',
    }
    return respond(response)
  }

  const normalized = normalizeByType(detected_type, query)
  if (!normalized) {
    const response: SearchResponse = {
      found: false,
      detected_type,
      message: `Neplatný formát pro ${TYPE_LABEL_GENITIV[detected_type]}.`,
    }
    return respond(response)
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
        message:
          'Tento subjekt zatím nikdo nenahlásil. To NEZNAMENÁ, že je důvěryhodný — jen ho ještě nikdo nenahlásil.',
      }
      return respond(response)
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
      return respond(response)
    }

    // 7. Incidenty pro agregaci
    const { data: incidents, error: iErr } = await supabaseAdmin()
      .from('incidents')
      .select('category, incident_date')
      .eq('subject_id', subjectId)
      .in('status', PUBLIC_STATUSES)

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
    return respond(response)
  } catch (err) {
    console.error('Search route exception:', err)
    return respond({ error: 'Chyba serveru.' }, { status: 500 })
  }
}
