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
 * Rate limit: max 10 prechecků za hodinu na uživatele.
 */

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import Anthropic from '@anthropic-ai/sdk'
import type {
  IncidentCategory,
  IncidentSeverity,
  IncidentPlatform,
  EvidenceType,
  AiPrecheckResult,
} from '@/types/databaze'

export const dynamic = 'force-dynamic'

const PRECHECK_MODEL = 'claude-sonnet-4-6'
const MAX_TOKENS = 800
const RATE_LIMIT_PER_HOUR = 10


// =====================================================
// Minimal Database type pro audit_log (dokud nejsou
// vygenerované types/supabase.ts přes `supabase gen types`)
// =====================================================

type AuditLogInsert = {
  id?: string
  actor_type: 'reporter' | 'admin' | 'system' | 'public'
  actor_id?: string | null
  action: string
  target_type: 'incident' | 'subject' | 'evidence' | 'reporter' | 'objection' | 'subscription'
  target_id?: string | null
  ip_address?: string | null
  user_agent?: string | null
  metadata?: Record<string, unknown>
  created_at?: string
}

type AuditLogRow = Required<Omit<AuditLogInsert, 'id' | 'created_at'>> & {
  id: string
  created_at: string
}

type DatabazeDatabase = {
  public: {
    Tables: {
      audit_log: {
        Row: AuditLogRow
        Insert: AuditLogInsert
        Update: Partial<AuditLogInsert>
        Relationships: []
      }
    }
    Views: { [_ in never]: never }
    Functions: { [_ in never]: never }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}


// =====================================================
// Lazy-init clients (avoid build-time crash without env)
// =====================================================

let _anthropic: Anthropic | null = null
function getAnthropic(): Anthropic {
  if (!_anthropic) {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY missing')
    _anthropic = new Anthropic({ apiKey })
  }
  return _anthropic
}


type SupabaseAdminClient = ReturnType<typeof createClient<DatabazeDatabase>>
let _supabaseAdmin: SupabaseAdminClient | null = null
function supabaseAdmin(): SupabaseAdminClient {
  if (!_supabaseAdmin) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) throw new Error('Supabase admin env vars missing')
    _supabaseAdmin = createClient<DatabazeDatabase>(url, key)
  }
  return _supabaseAdmin
}


// =====================================================
// Request validation
// =====================================================

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


interface PrecheckRequestBody {
  category: IncidentCategory
  category_other?: string
  severity: IncidentSeverity
  incident_date: string
  amount_czk: number
  platform: IncidentPlatform
  platform_other?: string
  description: string
  evidence_summary: {
    count: number
    types: EvidenceType[]
  }
}


function validateBody(raw: unknown): PrecheckRequestBody | string {
  if (!raw || typeof raw !== 'object') return 'Tělo požadavku musí být JSON objekt'
  const b = raw as Record<string, unknown>

  if (typeof b.category !== 'string' || !VALID_CATEGORIES.includes(b.category as IncidentCategory)) {
    return 'Neplatná kategorie'
  }
  if (b.category_other !== undefined && typeof b.category_other !== 'string') {
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
  if (b.platform_other !== undefined && typeof b.platform_other !== 'string') {
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
    category_other: b.category_other as string | undefined,
    severity: b.severity as IncidentSeverity,
    incident_date: b.incident_date,
    amount_czk: b.amount_czk,
    platform: b.platform as IncidentPlatform,
    platform_other: b.platform_other as string | undefined,
    description: b.description,
    evidence_summary: {
      count: es.count,
      types: es.types as EvidenceType[],
    },
  }
}


// =====================================================
// System prompt (SPEC sekce 5.5 + SKILL sekce 4)
// =====================================================

const SYSTEM_PROMPT = `Jsi expert na detekci pomstychtivých, manipulativních a nepravdivých nahlášení podvodů na českých bazarech a online platformách.

Hodnotíš jediné nahlášení a vracíš strukturované JSON hodnocení.

POSUĎ:
1. Konzistence — odpovídá popis kategorii a závažnosti?
2. Tón — působí věcně, nebo pomstychtivě/emocionálně?
3. Specifičnost — obsahuje konkrétní detaily (datum, částka, modus operandi), nebo jen obecné nadávky?
4. Důkazy — počet a typ odpovídá popisu? Drobné nahlášení s 5+ důkazy je podezřelé jako přílišné odhodlání; závažné incidenty by měly mít alespoň 2 důkazy.
5. Red flags — jazyk pomsty, vágní obvinění, nesedící časové údaje, urážky, ad hominem.

VRAŤ POUZE validní JSON bez markdown bloků v tomto tvaru:
{
  "confidence_score": <číslo 0-100>,
  "ai_summary": "<2-3 věty>",
  "red_flags": ["<string>", ...],
  "recommendation": "<auto_publish | manual_review | reject>"
}

PRAVIDLA SKÓRE:
- 80-100 = vypadá zcela autenticky, věcný tón, konkrétní detaily, odpovídající důkazy → auto_publish
- 60-79 = většinou autenticky, drobné nejasnosti → auto_publish s vyšší prioritou pro spot-check
- 30-59 = nejasné signály, nutná manuální kontrola → manual_review
- 0-29 = silně pochybné, pravděpodobně pomsta nebo nepravdivé → reject

KRITICKÁ JAZYKOVÁ PRAVIDLA PRO ai_summary (právní compliance, ČR):

NIKDY nepoužij tato slova:
- "podvodník", "zloděj", "lhář" — hodnocení charakteru, trestněprávní pojmy
- "podvedl", "ukradl", "spáchal", "okradl" — implikují vinu
- "falešný" o osobě — implikuje úmysl
- "nepoctivý", "vinen", "trestaný" — hodnocení/rozsudek
- "podvodné jednání" — implikuje protiprávnost

VŽDY používej faktický, pasivní jazyk:
- "byl evidován v souvislosti s..."
- "nahlašující uvádí, že..."
- "podle nahlášení nebylo zboží doručeno"
- "nahlášení popisuje pattern..."
- "subjekt je předmětem nahlášení typu X"

PŘÍKLAD ŠPATNÉHO ai_summary:
"Podvodník neposlal zboží po platbě 2500 Kč."

PŘÍKLAD SPRÁVNÉHO ai_summary:
"Nahlašující uvádí, že po platbě 2500 Kč na účet nedošlo k doručení zboží přes Sbazar."

DALŠÍ PRAVIDLA:
- Pokud popis obsahuje urážky nebo emocionální nadávky → automaticky přidej red_flag "ad hominem / pomstychtivý jazyk"
- Pokud je popis kratší než 100 znaků a závažnost major/severe → red_flag "nedostatečný popis pro deklarovanou závažnost"
- Pokud datum incidentu je v budoucnosti nebo starší 2 roky → red_flag "nesedící časový rámec"
- ai_summary musí být v češtině, latinkou
- red_flags mohou být v češtině nebo angličtině podle vhodnosti`


// =====================================================
// Helpers
// =====================================================

function extractJson(raw: string): unknown {
  // Strip markdown fences
  const stripped = raw.replace(/```(?:json)?\s*/gi, '').replace(/```/g, '').trim()
  try {
    return JSON.parse(stripped)
  } catch {
    // Try balanced braces walk
  }
  let depth = 0
  let start = -1
  for (let i = 0; i < stripped.length; i++) {
    if (stripped[i] === '{') {
      if (depth === 0) start = i
      depth++
    } else if (stripped[i] === '}') {
      depth--
      if (depth === 0 && start !== -1) {
        try {
          return JSON.parse(stripped.slice(start, i + 1))
        } catch {
          // continue
        }
        start = -1
      }
    }
  }
  throw new Error('AI nevrátila validní JSON')
}


function validateAiResponse(parsed: unknown): AiPrecheckResult | null {
  if (!parsed || typeof parsed !== 'object') return null
  const p = parsed as Record<string, unknown>

  if (
    typeof p.confidence_score !== 'number' ||
    p.confidence_score < 0 ||
    p.confidence_score > 100
  ) {
    return null
  }
  if (typeof p.ai_summary !== 'string') return null
  if (!Array.isArray(p.red_flags) || !p.red_flags.every((f) => typeof f === 'string')) {
    return null
  }
  if (
    typeof p.recommendation !== 'string' ||
    !['auto_publish', 'manual_review', 'reject'].includes(p.recommendation)
  ) {
    return null
  }

  return {
    confidence_score: p.confidence_score,
    ai_summary: p.ai_summary,
    red_flags: p.red_flags as string[],
    recommendation: p.recommendation as AiPrecheckResult['recommendation'],
  }
}


const FALLBACK_RESULT: AiPrecheckResult = {
  confidence_score: 50,
  ai_summary: '',
  red_flags: [],
  recommendation: 'manual_review',
}


// =====================================================
// POST handler
// =====================================================

export async function POST(req: Request) {
  // ── 1. Auth (cookie-based) ────────────────────────────
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
          setAll() {
            // Route handler — cookies se neupravují
          },
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

  // ── 2. Validace body ──────────────────────────────────
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

  // ── 3. Rate limit (audit_log za poslední 1h) ──────────
  try {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    const { count, error: countErr } = await supabaseAdmin()
      .from('audit_log')
      .select('*', { count: 'exact', head: true })
      .eq('actor_type', 'reporter')
      .eq('actor_id', userId)
      .eq('action', 'create_incident')
      .gte('created_at', oneHourAgo)
      .filter('metadata->>phase', 'eq', 'precheck')

    if (countErr) {
      console.error('Precheck rate-limit lookup failed:', countErr)
      // Soft-fail: pokud se rate limit nepodaří zkontrolovat, pustíme dál
    } else if ((count ?? 0) >= RATE_LIMIT_PER_HOUR) {
      return NextResponse.json(
        {
          error: `Limit ${RATE_LIMIT_PER_HOUR} AI předkontrol za hodinu vyčerpán. Zkuste to za chvíli.`,
        },
        { status: 429 },
      )
    }
  } catch (err) {
    console.error('Precheck rate-limit exception:', err)
  }

  // ── 4. AI volání ──────────────────────────────────────
  const userMessage = JSON.stringify({
    category: validated.category,
    category_other: validated.category_other ?? null,
    severity: validated.severity,
    incident_date: validated.incident_date,
    amount_czk: validated.amount_czk,
    platform: validated.platform,
    platform_other: validated.platform_other ?? null,
    description: validated.description,
    evidence_summary: validated.evidence_summary,
  })

  let result: AiPrecheckResult
  try {
    const msg = await getAnthropic().messages.create({
      model: PRECHECK_MODEL,
      max_tokens: MAX_TOKENS,
      system: [
        {
          type: 'text',
          text: SYSTEM_PROMPT,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: [
        {
          role: 'user',
          content: `Posuď toto nahlášení a vrať JSON:\n\n${userMessage}`,
        },
      ],
    })

    const rawText = msg.content[0]?.type === 'text' ? msg.content[0].text : ''
    const parsed = extractJson(rawText)
    const validatedAi = validateAiResponse(parsed)

    if (!validatedAi) {
      console.error('Precheck AI returned invalid structure:', rawText)
      result = FALLBACK_RESULT
    } else {
      result = validatedAi
    }
  } catch (err) {
    console.error('Precheck AI call failed:', err)
    result = FALLBACK_RESULT
  }

  // ── 5. Audit log ──────────────────────────────────────
  try {
    await supabaseAdmin()
      .from('audit_log')
      .insert({
        actor_type: 'reporter',
        actor_id: userId,
        action: 'create_incident',
        target_type: 'incident',
        target_id: null,
        metadata: {
          phase: 'precheck',
          confidence_score: result.confidence_score,
          recommendation: result.recommendation,
          red_flag_count: result.red_flags.length,
        },
      })
  } catch (err) {
    console.error('Precheck audit_log insert failed:', err)
    // Soft-fail: audit failure nesmí vyřadit endpoint
  }

  return NextResponse.json(result)
}
