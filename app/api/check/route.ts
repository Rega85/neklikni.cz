/**
 * POST /api/check — sjednocený vstup.
 *
 * Vezme libovolný text (zpráva, odkaz, holý identifikátor) a/nebo
 * screenshoty, přes lib/inputParser.ts rozebere text na entity a podle
 * inputKind spustí jen relevantní kontroly:
 *   - 'identifier' → jen databáze (subject_identifiers + ČOI)
 *   - 'message'    → jen AI analýza
 *   - 'url'/'mixed' → obojí paralelně
 * Výsledky sleje lib/verdictEngine.ts do jednotného verdiktu.
 *
 * /api/analyze a /api/databaze/search zůstávají nedotčené a
 * nezávislé, tenhle endpoint jen znovupoužívá jejich sdílené
 * knihovny (app/api/_lib/aiAnalysis.ts, databaze/_lib/crossReference.ts).
 *
 * Screenshoty — EPHEMERNÍ, stejný model jako /api/analyze a jak už
 * dnes slibuje /gdpr ("nejsou po dokončení analýzy ukládány"): jdou
 * jen do Claude API volání (runAnalysis) a zahodí se. Žádný Supabase
 * Storage bucket, žádná retence. Gatováno na oneshot/full (viz níže),
 * max MAX_IMAGES obrázků, MAX_IMAGE_BYTES na obrázek — stejné limity
 * jako /api/analyze až na počet (tady schválně nižší, cílovka nahrává
 * typicky jeden screenshot).
 *
 * Rate limiting je rozdělený podle nákladu:
 *   - AI větev (message/url/mixed, nebo cokoliv se screenshotem) pálí
 *     tokeny → limit odpovídá cenníku (free/anon 2/24h, placené tarify
 *     jen obecná anti-abuse hranice). Při vyčerpání vrací 429 s
 *     `code: 'AI_LIMIT_REACHED'` a `upgradeRequired: true`.
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

// ── Screenshoty ────────────────────────────────────────
// Nižší strop než /api/analyze (4) — cílovka nahrává typicky jeden
// screenshot, dva jsou rezerva (např. delší konverzace na dva
// snímky). Menší limit = menší request payload = menší riziko
// narazit na limit těla requestu u serverless funkce.
const MAX_IMAGES = 2
const MAX_IMAGE_BYTES = 4 * 1024 * 1024
const IMAGE_TIERS = ['oneshot', 'full']

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

// ── Sdílení výsledku ──────────────────────────────────
// Stejný vzor jako saveResult() v /api/analyze: server ukládá výsledek,
// který sám dopočítal — nikdy tvar dodaný klientem (VerdictCard by jinak
// mohl publikovat na /report/[id] cokoliv, co si kdokoliv vymyslí).
// Best-effort, nesmí shodit response, když insert selže.
async function saveShareableVerdict(
  text: string,
  tier: string,
  inputKind: ParsedInput['inputKind'],
  verdict: ReturnType<typeof buildVerdict>,
): Promise<string | null> {
  try {
    const { data } = await supabaseAdmin()
      .from('shared_results')
      .insert({
        original_text: text,
        risk: verdict.score,
        verdict: verdict.headline,
        analysis: verdict.sources.ai?.analysis ?? null,
        threats: verdict.sources.ai?.threats ?? [],
        recommendation: verdict.actions[0] ?? null,
        tier,
        level: verdict.level,
        input_kind: inputKind,
        actions: verdict.actions,
        sources: verdict.sources,
        created_at: new Date().toISOString(),
      })
      .select('id')
      .single()
    return data?.id ?? null
  } catch (e) {
    console.warn('check: failed to save shareable verdict:', e)
    return null
  }
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

async function runAiCheck(text: string, tier: string, images: string[] = []): Promise<AiSignal | null> {
  try {
    const result = await runAnalysis(text, tier, images)
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
      : ''

  // images: pole data-URL base64 stringů, stejný tvar jako /api/analyze.
  const rawImages: unknown[] =
    body && typeof body === 'object' && Array.isArray((body as Record<string, unknown>).images)
      ? (body as Record<string, unknown>).images as unknown[]
      : []
  const images: string[] = []
  for (const item of rawImages) {
    if (typeof item === 'string' && item.length > 0) images.push(item)
  }
  const hasImages = images.length > 0

  if (!hasImages && (typeof rawText !== 'string' || rawText.trim().length < 2)) {
    return NextResponse.json(
      { error: 'Zadejte text, odkaz nebo identifikátor ke kontrole, nebo nahrajte screenshot.' },
      { status: 400 },
    )
  }
  if (!hasImages && typeof rawText === 'string' && rawText.length > 5000) {
    return NextResponse.json({ error: 'Text je příliš dlouhý. Maximum je 5000 znaků.' }, { status: 400 })
  }
  if (images.length > MAX_IMAGES) {
    return NextResponse.json({ error: `Maximum ${MAX_IMAGES} screenshoty na jednu kontrolu.` }, { status: 400 })
  }
  for (const img of images) {
    const base64Data = img.split(',')[1] ?? img
    if (Math.ceil(base64Data.length * 0.75) > MAX_IMAGE_BYTES) {
      return NextResponse.json({ error: 'Některý screenshot je příliš velký. Maximum jsou 4 MB na obrázek.' }, { status: 400 })
    }
  }
  const text = typeof rawText === 'string' ? rawText.trim() : ''

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

  // Screenshoty — gatováno na oneshot/full, stejný vzor jako /api/analyze.
  if (hasImages) {
    if (!userId) {
      return NextResponse.json(
        {
          error: 'Pro nahrání screenshotu se musíte přihlásit a mít tarif Full nebo Jednorázová.',
          code: 'IMAGE_UPLOAD_REQUIRES_PAID_TIER',
          upgradeRequired: true,
          requireRegistration: true,
        },
        { status: 403 },
      )
    }
    if (!IMAGE_TIERS.includes(tier)) {
      return NextResponse.json(
        {
          error: 'Analýza screenshotů je dostupná pro tarif Full nebo Jednorázová.',
          code: 'IMAGE_UPLOAD_REQUIRES_PAID_TIER',
          upgradeRequired: true,
        },
        { status: 403 },
      )
    }
  }

  const parsed = parseInput(text)
  const planFromText = planChecks(parsed.inputKind)
  // Screenshot vždy vynutí AI větev, i kdyby doprovodný text sám o sobě
  // vypadal jako holý identifikátor (planChecks by jinak AI přeskočilo —
  // viz lib/verdictEngine.ts planChecks/'identifier'). Databázová větev
  // se řídí podle textu beze změny (obrázek sám o sobě nic k
  // prohledání do databáze nedává, dokud ho AI nepřečte).
  const plan = hasImages ? { ...planFromText, checkAi: true } : planFromText
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
    plan.checkAi ? runAiCheck(text, tier, images) : Promise.resolve(null),
  ])

  const verdict = buildVerdict({ parsed, database, ai })
  // shared_results.original_text — u čistého screenshotu bez textu
  // nahradit popisným placeholderem (stejný vzor jako saveResult()
  // v /api/analyze), ať řádek nezůstane s prázdným original_text.
  const textForSharing = text || (images.length > 0 ? `[Analýza ${images.length > 1 ? images.length + ' screenshotů' : 'screenshotu'}]` : text)
  const shareId = await saveShareableVerdict(textForSharing, tier, parsed.inputKind, verdict)

  return NextResponse.json({
    inputKind: parsed.inputKind,
    tier,
    shareId,
    ...verdict,
  })
}
