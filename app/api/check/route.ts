/**
 * POST /api/check — sjednocený vstup (Fáze 2).
 *
 * Vezme libovolný text (zpráva, odkaz, holý identifikátor), přes
 * lib/inputParser.ts ho rozebere na entity a podle inputKind spustí
 * jen relevantní kontroly:
 *   - 'identifier' → jen databáze (subject_identifiers + ČOI)
 *   - 'message'    → jen AI analýza
 *   - 'url'/'mixed' → obojí paralelně
 * Výsledky sleje lib/verdictEngine.ts do jednotného verdiktu.
 *
 * Nikdo tenhle endpoint zatím nevolá — UI přijde ve Fázi 3.
 * /api/analyze a /api/databaze/search zůstávají nedotčené a
 * nezávislé, tenhle endpoint jen znovupoužívá jejich sdílené
 * knihovny (app/api/_lib/aiAnalysis.ts, databaze/_lib/crossReference.ts).
 *
 * Rate limiting je rozdělený podle nákladu:
 *   - AI větev (message/url/mixed) pálí tokeny → limit odpovídá
 *     cenníku (free/anon 2/24h, placené tarify jen obecná anti-abuse
 *     hranice). Při vyčerpání vrací 429 s `code: 'AI_LIMIT_REACHED'`
 *     a `upgradeRequired: true` — konverzní bod pro Fázi 3 UI, ne chyba.
 *   - Čistě databázová větev (identifier) je levná → volnější limit.
 */

import { NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { parseInput, type ParsedInput } from '@/lib/inputParser'
import { planChecks, buildVerdict, type DatabaseSignal, type AiSignal } from '@/lib/verdictEngine'
import {
  checkIdentifiersInDatabase,
  checkDomainsInCoi,
  type ExtractedIdentifier,
} from '../databaze/_lib/crossReference'
import { runAnalysis } from '../_lib/aiAnalysis'
import { checkRateLimit, hashForRL } from '../_lib/ratelimit'

export const dynamic = 'force-dynamic'

// ── Rate limit konfigurace ────────────────────────────
// AI větev musí odpovídat cenníku (free = 2 analýzy/den) — placené
// tarify nemají tenhle endpoint gatovaný kredity (viz verdictEngine
// docstring), jen obecnou anti-abuse hranicí.
const AI_LIMIT_FREE = 2
const AI_LIMIT_PAID = 50
// Databázová větev je bez AI nákladu → volnější.
const DB_LIMIT_FREE = 10
const DB_LIMIT_PAID = 100
const WINDOW = '24 h' as const

// ── Lazy-init Supabase admin ─────────────────────────

let _supabaseAdmin: ReturnType<typeof createSupabaseClient<any>> | null = null
function supabaseAdmin() {
  if (!_supabaseAdmin) {
    _supabaseAdmin = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )
  }
  return _supabaseAdmin
}

// ── Database check ────────────────────────────────────

async function runDatabaseChecks(parsed: ParsedInput): Promise<DatabaseSignal> {
  const identifiers: ExtractedIdentifier[] = [
    ...parsed.emails.map((v) => ({ type: 'email' as const, rawValue: v })),
    ...parsed.phones.map((v) => ({ type: 'phone' as const, rawValue: v })),
    ...parsed.bankAccounts.map((v) => ({ type: 'account' as const, rawValue: v })),
  ]

  const [matches, coiMatches] = await Promise.all([
    checkIdentifiersInDatabase(supabaseAdmin(), identifiers),
    checkDomainsInCoi(supabaseAdmin(), parsed.domains),
  ])

  return {
    coi_matches: coiMatches,
    identifier_matches: matches.map((m) => ({
      type: m.type,
      value_masked: m.value_masked,
      verified: m.verified,
      incident_count: m.incident_count,
      trust_score: m.trust_score,
    })),
  }
}

// ── AI check ──────────────────────────────────────────

async function runAiCheck(text: string, tier: string): Promise<AiSignal | null> {
  try {
    const result = await runAnalysis(text, tier)
    return {
      risk: result.risk,
      verdict: result.verdict,
      analysis: result.analysis,
      threats: result.threats ?? [],
      recommendation: result.recommendation,
      tactics: result.tactics,
      details: result.details,
    }
  } catch (err) {
    // AI výpadek nesmí shodit celý request — pokud DB větev běžela
    // taky (url/mixed), verdikt z ní pořád má cenu.
    console.warn('check: AI analysis failed, degrading to database-only verdict:', err)
    return null
  }
}

// ── POST handler ─────────────────────────────────────

export async function POST(req: Request) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Neplatný JSON.' }, { status: 400 })
  }

  const rawText =
    body && typeof body === 'object' && 'text' in body
      ? (body as Record<string, unknown>).text
      : null
  if (typeof rawText !== 'string' || rawText.trim().length < 2) {
    return NextResponse.json(
      { error: 'Zadejte text, odkaz nebo identifikátor ke kontrole.' },
      { status: 400 },
    )
  }
  if (rawText.length > 5000) {
    return NextResponse.json({ error: 'Text je příliš dlouhý. Maximum je 5000 znaků.' }, { status: 400 })
  }
  const text = rawText.trim()

  // Auth — stejný vzor jako /api/analyze a /api/databaze/search
  // (cookies, Bearer token jako fallback). Endpointy samotné nedotčené.
  let userId: string | null = null
  try {
    const cookieStore = await cookies()
    const supabaseCookies = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll() {},
        },
      },
    )
    const { data: { user } } = await supabaseCookies.auth.getUser()
    if (user) userId = user.id
  } catch (e) {
    console.warn('check: cookie auth failed:', e)
  }
  if (!userId) {
    const auth = req.headers.get('authorization') || ''
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null
    if (token) {
      const { data: { user } } = await supabaseAdmin().auth.getUser(token)
      if (user) userId = user.id
    }
  }

  let tier = 'free'
  if (userId) {
    const { data: profile } = await supabaseAdmin()
      .from('user_profiles')
      .select('tier')
      .eq('id', userId)
      .maybeSingle()
    tier = profile?.tier || 'free'
  }

  const parsed = parseInput(text)
  const plan = planChecks(parsed.inputKind)
  const isPaid = tier !== 'free'

  // Rate limit — rozdělený podle toho, jestli větev pálí AI tokeny.
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  const ipHash = await hashForRL(ip)
  const rlIdentifier = userId ?? ipHash

  const rlScope = plan.checkAi
    ? (isPaid ? 'check:ai:paid' : 'check:ai:free')
    : (isPaid ? 'check:db:paid' : 'check:db:free')
  const rlLimit = plan.checkAi
    ? (isPaid ? AI_LIMIT_PAID : AI_LIMIT_FREE)
    : (isPaid ? DB_LIMIT_PAID : DB_LIMIT_FREE)

  const rl = await checkRateLimit(rlIdentifier, rlScope, rlLimit, WINDOW)
  if (!rl.allowed) {
    if (plan.checkAi) {
      // Konverzní bod, ne chyba — Fáze 3 UI podle `code` nabídne
      // jednorázovou analýzu nebo předplatné.
      return NextResponse.json(
        {
          error: 'Denní limit AI ověření vyčerpán.',
          code: 'AI_LIMIT_REACHED',
          message: isPaid
            ? 'Vyčerpali jste denní limit ověření. Zkuste to za 24 hodin.'
            : 'Denní limit 2 AI ověření zdarma je vyčerpán. Pro víc ověření denně si pořiďte jednorázovou analýzu nebo předplatné.',
          limitReached: true,
          upgradeRequired: !isPaid,
        },
        { status: 429 },
      )
    }
    return NextResponse.json(
      {
        error: 'Denní limit ověření vyčerpán. Zkuste to za 24 hodin.',
        code: 'RATE_LIMITED',
        limitReached: true,
      },
      { status: 429 },
    )
  }

  const [database, ai] = await Promise.all([
    plan.checkDatabase ? runDatabaseChecks(parsed) : Promise.resolve(null),
    plan.checkAi ? runAiCheck(text, tier) : Promise.resolve(null),
  ])

  const verdict = buildVerdict({ parsed, database, ai })

  return NextResponse.json({
    inputKind: parsed.inputKind,
    tier,
    ...verdict,
  })
}
