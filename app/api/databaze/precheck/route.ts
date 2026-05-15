/**
 * POST /api/databaze/precheck
 *
 * AI předkontrola nahlášeného incidentu (před uložením do DB).
 * Vrací confidence score 0-100, faktický summary, red flags a doporučení.
 *
 * Návaznost: docs/SPEC.md sekce 5.5 a .claude/SKILL.md sekce 4
 * (jazyková hygiena — KRITICKÉ pro system prompt).
 *
 * Auth: vyžaduje přihlášeného uživatele (Supabase Auth cookies).
 * Rate limit: max 10 prechecků za hodinu na uživatele (in-memory).
 *
 * AI logika je v `../_lib/precheck.ts` (shared se `/report` endpointem).
 */

import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type {
  IncidentCategory,
  IncidentSeverity,
  IncidentPlatform,
  EvidenceType,
} from '@/types/databaze'
import { runAiPrecheck, type PrecheckInput } from '../_lib/precheck'

export const dynamic = 'force-dynamic'

const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000 // 1 hour
const RATE_LIMIT_MAX = 10


// ── MVP rate limit — in-memory, resets on deploy. Replace
// ── with Redis or usage_daily table in v2.

const rateLimitMap = new Map<string, number[]>()

function checkAndRecordRateLimit(userId: string): boolean {
  const now = Date.now()
  const cutoff = now - RATE_LIMIT_WINDOW_MS
  const stamps = (rateLimitMap.get(userId) ?? []).filter((t) => t > cutoff)
  if (stamps.length >= RATE_LIMIT_MAX) {
    rateLimitMap.set(userId, stamps)
    return false
  }
  stamps.push(now)
  rateLimitMap.set(userId, stamps)
  return true
}


// ── Request validation ───────────────────────────────

const VALID_CATEGORIES: IncidentCategory[] = [
  'non_delivery',
  'misrepresentation',
  'fake_courier',
  'disappeared_listing',
  'fake_profile',
  'romance',
  'investment',
  'rental',
  'tickets',
  'employment',
  'other',
]

const VALID_SEVERITIES: IncidentSeverity[] = [
  'attempt',
  'minor',
  'medium',
  'major',
  'severe',
]

const VALID_PLATFORMS: IncidentPlatform[] = [
  'fb_marketplace',
  'fb_groups',
  'sbazar',
  'bazos',
  'vinted',
  'aukro',
  'email',
  'sms',
  'phone',
  'other',
]

const VALID_EVIDENCE_TYPES: EvidenceType[] = [
  'screenshot',
  'payment_proof',
  'communication',
  'other',
]


function validateBody(raw: unknown): PrecheckInput | string {
  if (!raw || typeof raw !== 'object') return 'Tělo požadavku musí být JSON objekt'
  const b = raw as Record<string, unknown>

  if (typeof b.category !== 'string' || !VALID_CATEGORIES.includes(b.category as IncidentCategory)) {
    return 'Neplatná kategorie'
  }
  if (b.category_other !== undefined && b.category_other !== null && typeof b.category_other !== 'string') {
    return 'Neplatný category_other'
  }
  if (typeof b.severity !== 'string' || !VALID_SEVERITIES.includes(b.severity as IncidentSeverity)) {
    return 'Neplatná závažnost'
  }
  if (typeof b.incident_date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(b.incident_date)) {
    return 'Neplatné datum (očekáván ISO YYYY-MM-DD)'
  }
  if (typeof b.amount_czk !== 'number' || b.amount_czk < 0) {
    return 'Neplatná částka'
  }
  if (typeof b.platform !== 'string' || !VALID_PLATFORMS.includes(b.platform as IncidentPlatform)) {
    return 'Neplatná platforma'
  }
  if (b.platform_other !== undefined && b.platform_other !== null && typeof b.platform_other !== 'string') {
    return 'Neplatný platform_other'
  }
  if (typeof b.description !== 'string' || b.description.length < 50 || b.description.length > 1000) {
    return 'Popis musí být 50–1000 znaků'
  }
  if (!b.evidence_summary || typeof b.evidence_summary !== 'object') {
    return 'Chybí evidence_summary'
  }
  const es = b.evidence_summary as Record<string, unknown>
  if (typeof es.count !== 'number' || es.count < 0) {
    return 'Neplatný evidence_summary.count'
  }
  if (!Array.isArray(es.types) || !es.types.every((t) => typeof t === 'string' && VALID_EVIDENCE_TYPES.includes(t as EvidenceType))) {
    return 'Neplatné evidence_summary.types'
  }

  return {
    category: b.category as IncidentCategory,
    category_other: (b.category_other as string | undefined) ?? null,
    severity: b.severity as IncidentSeverity,
    incident_date: b.incident_date,
    amount_czk: b.amount_czk,
    platform: b.platform as IncidentPlatform,
    platform_other: (b.platform_other as string | undefined) ?? null,
    description: b.description,
    evidence_summary: {
      count: es.count,
      types: es.types as EvidenceType[],
    },
  }
}


// ── POST handler ─────────────────────────────────────

export async function POST(req: Request) {
  // 1. Auth
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
    console.error('Precheck auth error:', err)
  }

  if (!userId) {
    return NextResponse.json(
      { error: 'Pro AI předkontrolu se musíte přihlásit.' },
      { status: 401 },
    )
  }

  // 2. Validace body
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Neplatný JSON.' }, { status: 400 })
  }

  const validated = validateBody(body)
  if (typeof validated === 'string') {
    return NextResponse.json({ error: validated }, { status: 400 })
  }

  // 3. Rate limit (in-memory)
  if (!checkAndRecordRateLimit(userId)) {
    return NextResponse.json(
      { error: `Limit ${RATE_LIMIT_MAX} AI předkontrol za hodinu vyčerpán. Zkuste to za chvíli.` },
      { status: 429 },
    )
  }

  // 4. AI volání (shared logika)
  const result = await runAiPrecheck(validated)

  // Audit log NOT written here — precheck is a technical intermediate
  // step, not a discrete action. Audit happens in /api/databaze/report
  // when incident is actually created (then we have a real target_id).

  return NextResponse.json(result)
}
