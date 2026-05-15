# Prompts 3-5 implementation review

Dump 4 souborů z modulu `/api/databaze` pro Pavlovo review.

---

## 1. app/api/databaze/_lib/database.ts

```typescript
/**
 * Minimal Database type pro tabulky z `/databaze` modulu.
 *
 * Dokud nejsou vygenerované `types/supabase.ts` přes
 * `supabase gen types typescript`, tahle definice slouží
 * jako typový kontrakt pro server-side Supabase admin client.
 *
 * Pokrývá tabulky:
 * - reporters
 * - subjects
 * - subject_identifiers
 * - incidents
 * - evidence
 * - audit_log
 *
 * Až budou generated types k dispozici, tohle nahradíme
 * importem `Database['public']` z `@/types/supabase`.
 */

import type {
  IdentifierType,
  IncidentCategory,
  IncidentPlatform,
  IncidentSeverity,
  IncidentStatus,
  EvidenceType,
  ReporterTrustLevel,
  SubjectVisibility,
} from '@/types/databaze'

// ── reporters ─────────────────────────────────────────

export type ReporterRow = {
  id: string
  email: string
  phone: string | null
  phone_verified: boolean
  bank_id_verified: boolean
  trust_level: ReporterTrustLevel
  reports_count: number
  false_reports_count: number
  banned: boolean
  banned_reason: string | null
  banned_at: string | null
  created_at: string
  updated_at: string
}

export type ReporterInsert = {
  id: string
  email: string
  phone?: string | null
  phone_verified?: boolean
  bank_id_verified?: boolean
  trust_level?: ReporterTrustLevel
  reports_count?: number
  false_reports_count?: number
  banned?: boolean
  banned_reason?: string | null
  banned_at?: string | null
  created_at?: string
  updated_at?: string
}


// ── subjects ──────────────────────────────────────────

export type SubjectRow = {
  id: string
  display_name_masked: string | null
  claimed_by: string | null
  claim_paid_until: string | null
  trust_score: number
  visibility_status: SubjectVisibility
  created_at: string
  updated_at: string
}

export type SubjectInsert = {
  id?: string
  display_name_masked?: string | null
  claimed_by?: string | null
  claim_paid_until?: string | null
  trust_score?: number
  visibility_status?: SubjectVisibility
  created_at?: string
  updated_at?: string
}


// ── subject_identifiers ───────────────────────────────

export type SubjectIdentifierRow = {
  id: string
  subject_id: string
  type: IdentifierType
  value: string
  value_hash: string
  value_masked: string
  verified: boolean
  created_at: string
}

export type SubjectIdentifierInsert = {
  id?: string
  subject_id: string
  type: IdentifierType
  value: string
  value_hash: string
  value_masked: string
  verified?: boolean
  created_at?: string
}


// ── incidents ─────────────────────────────────────────

export type IncidentRow = {
  id: string
  reporter_id: string
  subject_id: string
  incident_date: string
  platform: IncidentPlatform
  platform_other: string | null
  category: IncidentCategory
  category_other: string | null
  severity: IncidentSeverity
  amount_czk: number
  description: string
  contact_for_subject_email: string | null
  ai_confidence_score: number | null
  ai_summary: string | null
  ai_red_flags: unknown
  status: IncidentStatus
  notification_sent_at: string | null
  notification_email: string | null
  public_at: string | null
  objection_at: string | null
  removed_at: string | null
  removed_reason: string | null
  created_at: string
  updated_at: string
}

export type IncidentInsert = {
  id?: string
  reporter_id: string
  subject_id: string
  incident_date: string
  platform: IncidentPlatform
  platform_other?: string | null
  category: IncidentCategory
  category_other?: string | null
  severity: IncidentSeverity
  amount_czk?: number
  description: string
  contact_for_subject_email?: string | null
  ai_confidence_score?: number | null
  ai_summary?: string | null
  ai_red_flags?: unknown
  status?: IncidentStatus
  notification_sent_at?: string | null
  notification_email?: string | null
  public_at?: string | null
  objection_at?: string | null
  removed_at?: string | null
  removed_reason?: string | null
  created_at?: string
  updated_at?: string
}


// ── evidence ──────────────────────────────────────────

export type EvidenceRow = {
  id: string
  incident_id: string
  type: EvidenceType
  file_path: string
  file_hash: string
  file_size_bytes: number
  mime_type: string
  uploaded_at: string
  deleted_at: string | null
}

export type EvidenceInsert = {
  id?: string
  incident_id: string
  type: EvidenceType
  file_path: string
  file_hash: string
  file_size_bytes: number
  mime_type: string
  uploaded_at?: string
  deleted_at?: string | null
}


// ── audit_log ─────────────────────────────────────────

export type AuditLogRow = {
  id: string
  actor_type: 'reporter' | 'admin' | 'system' | 'public'
  actor_id: string | null
  action: string
  target_type: 'incident' | 'subject' | 'evidence' | 'reporter' | 'objection' | 'subscription'
  target_id: string | null
  ip_address: string | null
  user_agent: string | null
  metadata: Record<string, unknown>
  created_at: string
}

export type AuditLogInsert = {
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


// ── Database wrapper ──────────────────────────────────

export type DatabazeDatabase = {
  public: {
    Tables: {
      reporters: {
        Row: ReporterRow
        Insert: ReporterInsert
        Update: Partial<ReporterInsert>
        Relationships: []
      }
      subjects: {
        Row: SubjectRow
        Insert: SubjectInsert
        Update: Partial<SubjectInsert>
        Relationships: []
      }
      subject_identifiers: {
        Row: SubjectIdentifierRow
        Insert: SubjectIdentifierInsert
        Update: Partial<SubjectIdentifierInsert>
        Relationships: []
      }
      incidents: {
        Row: IncidentRow
        Insert: IncidentInsert
        Update: Partial<IncidentInsert>
        Relationships: []
      }
      evidence: {
        Row: EvidenceRow
        Insert: EvidenceInsert
        Update: Partial<EvidenceInsert>
        Relationships: []
      }
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
```

---

## 2. app/api/databaze/_lib/precheck.ts

```typescript
/**
 * Shared AI precheck logic pro nahlášené incidenty.
 *
 * Volá se z `/api/databaze/precheck` (samostatný endpoint pro
 * frontend preview) i z `/api/databaze/report` (přímo při vytvoření
 * nahlášení — žádný HTTP roundtrip).
 *
 * Návaznost: docs/SPEC.md sekce 5.5, .claude/SKILL.md sekce 4.
 */

import Anthropic from '@anthropic-ai/sdk'
import type {
  AiPrecheckResult,
  EvidenceType,
  IncidentCategory,
  IncidentPlatform,
  IncidentSeverity,
} from '@/types/databaze'

const PRECHECK_MODEL = 'claude-sonnet-4-6'
const MAX_TOKENS = 800


// ── Lazy-init Anthropic client ───────────────────────

let _anthropic: Anthropic | null = null
function getAnthropic(): Anthropic {
  if (!_anthropic) {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY missing')
    _anthropic = new Anthropic({ apiKey })
  }
  return _anthropic
}


// ── Public input/output types ────────────────────────

export interface PrecheckInput {
  category: IncidentCategory
  category_other?: string | null
  severity: IncidentSeverity
  incident_date: string
  amount_czk: number
  platform: IncidentPlatform
  platform_other?: string | null
  description: string
  evidence_summary: {
    count: number
    types: EvidenceType[]
  }
}


export const FALLBACK_PRECHECK_RESULT: AiPrecheckResult = {
  confidence_score: 50,
  ai_summary: '',
  red_flags: [],
  recommendation: 'manual_review',
}


// ── System prompt (SPEC sekce 5.5 + SKILL sekce 4) ────

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


// ── Helpers ──────────────────────────────────────────

function extractJson(raw: string): unknown {
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


// ── Public function ──────────────────────────────────

/**
 * Pošle nahlášení Claude API a vrátí strukturovaný hodnocení.
 * Při jakékoli chybě (rate limit, parse fail, API down) vrací
 * `FALLBACK_PRECHECK_RESULT` — nikdy nevyhazuje.
 */
export async function runAiPrecheck(input: PrecheckInput): Promise<AiPrecheckResult> {
  const userMessage = JSON.stringify({
    category: input.category,
    category_other: input.category_other ?? null,
    severity: input.severity,
    incident_date: input.incident_date,
    amount_czk: input.amount_czk,
    platform: input.platform,
    platform_other: input.platform_other ?? null,
    description: input.description,
    evidence_summary: input.evidence_summary,
  })

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
    const validated = validateAiResponse(parsed)

    if (!validated) {
      console.error('runAiPrecheck: invalid AI response structure:', rawText)
      return FALLBACK_PRECHECK_RESULT
    }

    return validated
  } catch (err) {
    console.error('runAiPrecheck: AI call failed:', err)
    return FALLBACK_PRECHECK_RESULT
  }
}
```

---

## 3. app/api/databaze/precheck/route.ts

```typescript
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
 *
 * AI logika je v `../_lib/precheck.ts` (shared se `/report` endpointem).
 */

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type {
  IncidentCategory,
  IncidentSeverity,
  IncidentPlatform,
  EvidenceType,
} from '@/types/databaze'
import type { DatabazeDatabase } from '../_lib/database'
import { runAiPrecheck, type PrecheckInput } from '../_lib/precheck'

export const dynamic = 'force-dynamic'

const RATE_LIMIT_PER_HOUR = 10


// ── Lazy-init Supabase admin ─────────────────────────

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

  // 3. Rate limit
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
    } else if ((count ?? 0) >= RATE_LIMIT_PER_HOUR) {
      return NextResponse.json(
        { error: `Limit ${RATE_LIMIT_PER_HOUR} AI předkontrol za hodinu vyčerpán. Zkuste to za chvíli.` },
        { status: 429 },
      )
    }
  } catch (err) {
    console.error('Precheck rate-limit exception:', err)
  }

  // 4. AI volání (shared logika)
  const result = await runAiPrecheck(validated)

  // 5. Audit log
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
  }

  return NextResponse.json(result)
}
```

---

## 4. app/api/databaze/report/route.ts

```typescript
/**
 * POST /api/databaze/report
 *
 * Vytvoření nahlášení incidentu. Multipart/form-data kvůli souborům.
 *
 * Návaznost: docs/SPEC.md sekce 5.1 (Proces nahlášení) a sekce 4
 * (datový model).
 *
 * Workflow (high-level):
 *  1. Auth (cookies) → 401 pokud nepřihlášen
 *  2. Parse + validace multipart fields
 *  3. Rate limit: max 3 nahlášení / 24h / reporter
 *  4. Upsert reporters row (nebo 403 pokud banned)
 *  5. Normalize + hash identifierů
 *  6. Match existing subjects (nebo vytvoř nový / pending_merge_review)
 *  7. Run AI precheck (shared `_lib/precheck.ts`)
 *  8. INSERT incident s computed status
 *  9. Upload každého souboru do storage + INSERT evidence
 * 10. Rollback při file upload chybě (storage cleanup + DELETE incident)
 * 11. Pokud máme notification_email a status='ai_reviewed' → 'notified'
 *     (skutečné odeslání e-mailu zatím TODO, v dalším promptu)
 * 12. Audit log
 * 13. Response 201 s incident_id, status a user-friendly message
 */

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import {
  normalizePhone,
  normalizeAccount,
  normalizeEmail,
  normalizeFacebookUrl,
  normalizeVarSymbol,
  hashIdentifier,
  maskIdentifier,
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE_BYTES,
} from '@/utils/databaze/identifiers'
import type {
  EvidenceType,
  IdentifierType,
  IncidentCategory,
  IncidentPlatform,
  IncidentSeverity,
  IncidentStatus,
} from '@/types/databaze'
import type { DatabazeDatabase } from '../_lib/database'
import { runAiPrecheck } from '../_lib/precheck'

export const dynamic = 'force-dynamic'

const REPORTS_PER_DAY_LIMIT = 3
const MIN_EVIDENCE_FILES = 2
const MAX_EVIDENCE_FILES = 5

const STORAGE_BUCKET = 'evidence'

const VALID_CATEGORIES: ReadonlySet<IncidentCategory> = new Set([
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
])

const VALID_SEVERITIES: ReadonlySet<IncidentSeverity> = new Set([
  'attempt',
  'minor',
  'medium',
  'major',
  'severe',
])

const VALID_PLATFORMS: ReadonlySet<IncidentPlatform> = new Set([
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
])

const VALID_IDENTIFIER_TYPES: ReadonlySet<IdentifierType> = new Set([
  'phone',
  'account',
  'email',
  'facebook_url',
  'var_symbol',
  'other',
])

const MIME_TO_EXT: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
}


// ── Lazy-init Supabase admin ─────────────────────────

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


// ── Types pro internal pipeline ──────────────────────

interface ParsedIdentifier {
  type: IdentifierType
  rawValue: string
  normalizedValue: string
  hash: string
  masked: string
}

interface ParsedFields {
  incident_date: string
  platform: IncidentPlatform
  platform_other: string | null
  category: IncidentCategory
  category_other: string | null
  severity: IncidentSeverity
  amount_czk: number
  description: string
  contact_for_subject_email: string | null
  identifiers: Array<{ type: IdentifierType; value: string }>
  files: File[]
  truth_confirmation: boolean
  data_processing_consent: boolean
}


// ── Helpers ──────────────────────────────────────────

function normalizeByType(
  type: IdentifierType,
  raw: string,
): string | null {
  switch (type) {
    case 'phone':
      return normalizePhone(raw)
    case 'account':
      return normalizeAccount(raw)
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


function mimeToEvidenceType(mime: string): EvidenceType {
  if (mime.startsWith('image/')) return 'screenshot'
  return 'other'
}


async function hashFile(file: File): Promise<string> {
  const buffer = await file.arrayBuffer()
  const digest = await crypto.subtle.digest('SHA-256', buffer)
  const bytes = new Uint8Array(digest)
  let hex = ''
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, '0')
  }
  return hex
}


function parseBoolean(raw: FormDataEntryValue | null): boolean {
  if (typeof raw !== 'string') return false
  return raw === 'true' || raw === '1' || raw === 'on'
}


function statusMessage(status: IncidentStatus): string {
  switch (status) {
    case 'pending':
      return 'Nahlášení bylo přijato a čeká na manuální kontrolu. Výsledek vám pošleme e-mailem.'
    case 'pending_merge_review':
      return 'Nahlášení bylo přijato. Detekovali jsme potenciální konflikt s jinými záznamy v databázi; admin to bude posuzovat. Výsledek vám pošleme e-mailem.'
    case 'ai_reviewed':
      return 'Nahlášení bylo přijato a prošlo automatickou kontrolou. Bude zveřejněno po krátké pauze.'
    case 'notified':
      return 'Nahlášení bylo přijato. Dotčená osoba byla informována a má 14 dní na vyjádření, poté bude záznam zveřejněn.'
    default:
      return 'Nahlášení bylo přijato.'
  }
}


// ── Parsing + validace multipart formdata ─────────────

function parseFormData(form: FormData): ParsedFields | string {
  const incident_date = form.get('incident_date')
  if (typeof incident_date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(incident_date)) {
    return 'Neplatné incident_date (YYYY-MM-DD)'
  }

  const platform = form.get('platform')
  if (typeof platform !== 'string' || !VALID_PLATFORMS.has(platform as IncidentPlatform)) {
    return 'Neplatná platforma'
  }

  const platform_other = form.get('platform_other')
  const platform_other_value =
    typeof platform_other === 'string' && platform_other.trim() !== ''
      ? platform_other.trim()
      : null

  const category = form.get('category')
  if (typeof category !== 'string' || !VALID_CATEGORIES.has(category as IncidentCategory)) {
    return 'Neplatná kategorie'
  }

  const category_other = form.get('category_other')
  const category_other_value =
    typeof category_other === 'string' && category_other.trim() !== ''
      ? category_other.trim()
      : null

  const severity = form.get('severity')
  if (typeof severity !== 'string' || !VALID_SEVERITIES.has(severity as IncidentSeverity)) {
    return 'Neplatná závažnost'
  }

  const amountRaw = form.get('amount_czk')
  const amount_czk = typeof amountRaw === 'string' ? Number(amountRaw) : NaN
  if (!Number.isFinite(amount_czk) || amount_czk < 0) {
    return 'Neplatná částka'
  }

  const description = form.get('description')
  if (typeof description !== 'string' || description.length < 50 || description.length > 1000) {
    return 'Popis musí být 50–1000 znaků'
  }

  const contactRaw = form.get('contact_for_subject_email')
  let contact_for_subject_email: string | null = null
  if (typeof contactRaw === 'string' && contactRaw.trim() !== '') {
    const normalized = normalizeEmail(contactRaw)
    if (!normalized) return 'Neplatný kontakt na dotčenou osobu (e-mail)'
    contact_for_subject_email = normalized
  }

  // identifiers jako JSON string
  const identifiersRaw = form.get('identifiers')
  if (typeof identifiersRaw !== 'string') return 'Chybí identifiers'
  let identifiersParsed: unknown
  try {
    identifiersParsed = JSON.parse(identifiersRaw)
  } catch {
    return 'identifiers musí být validní JSON array'
  }
  if (!Array.isArray(identifiersParsed) || identifiersParsed.length === 0) {
    return 'Musíte uvést alespoň jeden identifikátor protistrany'
  }
  const identifiers: Array<{ type: IdentifierType; value: string }> = []
  for (const item of identifiersParsed) {
    if (!item || typeof item !== 'object') return 'Neplatný identifier (musí být objekt)'
    const it = item as Record<string, unknown>
    if (typeof it.type !== 'string' || !VALID_IDENTIFIER_TYPES.has(it.type as IdentifierType)) {
      return 'Neplatný identifier.type'
    }
    if (typeof it.value !== 'string' || it.value.trim() === '') {
      return 'Neplatný identifier.value'
    }
    identifiers.push({ type: it.type as IdentifierType, value: it.value })
  }

  // konsenty
  const truth_confirmation = parseBoolean(form.get('truth_confirmation'))
  if (!truth_confirmation) return 'Musíte potvrdit pravdivost údajů'
  const data_processing_consent = parseBoolean(form.get('data_processing_consent'))
  if (!data_processing_consent) return 'Musíte souhlasit se zpracováním osobních údajů'

  // soubory
  const filesRaw = form.getAll('evidence_files')
  const files: File[] = []
  for (const f of filesRaw) {
    if (f instanceof File) files.push(f)
  }
  if (files.length < MIN_EVIDENCE_FILES || files.length > MAX_EVIDENCE_FILES) {
    return `Musíte nahrát ${MIN_EVIDENCE_FILES}–${MAX_EVIDENCE_FILES} souborů jako důkaz`
  }
  for (const f of files) {
    if (f.size > MAX_FILE_SIZE_BYTES) {
      return `Soubor "${f.name}" přesahuje limit ${MAX_FILE_SIZE_BYTES / 1024 / 1024} MB`
    }
    if (!ALLOWED_MIME_TYPES.includes(f.type as (typeof ALLOWED_MIME_TYPES)[number])) {
      return `Soubor "${f.name}" má nepodporovaný formát (${f.type})`
    }
  }

  return {
    incident_date,
    platform: platform as IncidentPlatform,
    platform_other: platform_other_value,
    category: category as IncidentCategory,
    category_other: category_other_value,
    severity: severity as IncidentSeverity,
    amount_czk,
    description,
    contact_for_subject_email,
    identifiers,
    files,
    truth_confirmation,
    data_processing_consent,
  }
}


// ── POST handler ─────────────────────────────────────

export async function POST(req: Request) {
  // 1. Auth
  let userId: string | null = null
  let userEmail: string | null = null
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
    if (data.user) {
      userId = data.user.id
      userEmail = data.user.email ?? null
    }
  } catch (err) {
    console.error('Report auth error:', err)
  }

  if (!userId || !userEmail) {
    return NextResponse.json(
      { error: 'Pro nahlášení incidentu se musíte přihlásit.' },
      { status: 401 },
    )
  }

  // 2. Parse multipart form
  let form: FormData
  try {
    form = await req.formData()
  } catch (err) {
    console.error('Report formData parse failed:', err)
    return NextResponse.json({ error: 'Neplatná multipart data.' }, { status: 400 })
  }
  const parsed = parseFormData(form)
  if (typeof parsed === 'string') {
    return NextResponse.json({ error: parsed }, { status: 400 })
  }

  // 3. Rate limit (incidents za posledních 24h)
  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { count, error: countErr } = await supabaseAdmin()
      .from('incidents')
      .select('*', { count: 'exact', head: true })
      .eq('reporter_id', userId)
      .gte('created_at', since)

    if (countErr) {
      console.error('Report rate-limit lookup failed:', countErr)
    } else if ((count ?? 0) >= REPORTS_PER_DAY_LIMIT) {
      return NextResponse.json(
        {
          error: `Limit ${REPORTS_PER_DAY_LIMIT} nahlášení za 24 hodin vyčerpán. Zkuste to později.`,
        },
        { status: 429 },
      )
    }
  } catch (err) {
    console.error('Report rate-limit exception:', err)
  }

  // 4. Upsert reporter / banned check
  try {
    const { data: existing, error: selectErr } = await supabaseAdmin()
      .from('reporters')
      .select('id, banned')
      .eq('id', userId)
      .maybeSingle()

    if (selectErr) {
      console.error('Report reporter lookup failed:', selectErr)
      return NextResponse.json(
        { error: 'Nepodařilo se ověřit váš profil.' },
        { status: 500 },
      )
    }

    if (existing?.banned) {
      return NextResponse.json(
        { error: 'Váš účet byl pozastaven, nemůžete podávat nová nahlášení.' },
        { status: 403 },
      )
    }

    if (!existing) {
      const { error: insertErr } = await supabaseAdmin()
        .from('reporters')
        .insert({ id: userId, email: userEmail })
      if (insertErr) {
        console.error('Report reporter insert failed:', insertErr)
        return NextResponse.json(
          { error: 'Nepodařilo se vytvořit profil nahlašovatele.' },
          { status: 500 },
        )
      }
    }
  } catch (err) {
    console.error('Report reporter upsert exception:', err)
    return NextResponse.json(
      { error: 'Chyba serveru při ověřování profilu.' },
      { status: 500 },
    )
  }

  // 5. Normalize + hash identifierů
  const parsedIdentifiers: ParsedIdentifier[] = []
  for (const item of parsed.identifiers) {
    const normalized = normalizeByType(item.type, item.value)
    if (!normalized) {
      return NextResponse.json(
        { error: `Neplatný ${item.type}: "${item.value}"` },
        { status: 400 },
      )
    }
    const hash = await hashIdentifier(normalized)
    parsedIdentifiers.push({
      type: item.type,
      rawValue: item.value,
      normalizedValue: normalized,
      hash,
      masked: maskIdentifier(normalized, item.type),
    })
  }

  // 6. Subject matching přes value_hash
  let subjectId: string
  let needsMergeReview = false
  let conflictingSubjectIds: string[] = []
  const newIdentifiersToInsert: ParsedIdentifier[] = []

  try {
    const hashes = parsedIdentifiers.map((i) => i.hash)
    const { data: existingIdentifiers, error: idLookupErr } = await supabaseAdmin()
      .from('subject_identifiers')
      .select('subject_id, value_hash')
      .in('value_hash', hashes)

    if (idLookupErr) {
      console.error('Report identifier lookup failed:', idLookupErr)
      return NextResponse.json(
        { error: 'Chyba při vyhledávání existujících záznamů.' },
        { status: 500 },
      )
    }

    const existingHashes = new Set<string>()
    const matchedSubjectIds = new Set<string>()
    for (const row of existingIdentifiers ?? []) {
      existingHashes.add(row.value_hash)
      matchedSubjectIds.add(row.subject_id)
    }

    for (const id of parsedIdentifiers) {
      if (!existingHashes.has(id.hash)) {
        newIdentifiersToInsert.push(id)
      }
    }

    if (matchedSubjectIds.size === 0) {
      // Vytvoř nový subject
      const firstId = parsedIdentifiers[0]
      const displayName = firstId.masked
      const { data: newSubject, error: subjectInsertErr } = await supabaseAdmin()
        .from('subjects')
        .insert({ display_name_masked: displayName })
        .select('id')
        .single()
      if (subjectInsertErr || !newSubject) {
        console.error('Report subject insert failed:', subjectInsertErr)
        return NextResponse.json(
          { error: 'Nepodařilo se vytvořit subjekt.' },
          { status: 500 },
        )
      }
      subjectId = newSubject.id
    } else if (matchedSubjectIds.size === 1) {
      subjectId = [...matchedSubjectIds][0]
    } else {
      // Konflikt: identifikátory patří k více subjektům
      needsMergeReview = true
      conflictingSubjectIds = [...matchedSubjectIds]
      subjectId = conflictingSubjectIds[0]
    }

    // INSERT nových identifikátorů pod tento subject
    if (newIdentifiersToInsert.length > 0) {
      const rows = newIdentifiersToInsert.map((i) => ({
        subject_id: subjectId,
        type: i.type,
        value: i.normalizedValue,
        value_hash: i.hash,
        value_masked: i.masked,
      }))
      const { error: idInsertErr } = await supabaseAdmin()
        .from('subject_identifiers')
        .insert(rows)
      if (idInsertErr) {
        console.error('Report identifier insert failed:', idInsertErr)
        return NextResponse.json(
          { error: 'Nepodařilo se uložit identifikátory.' },
          { status: 500 },
        )
      }
    }
  } catch (err) {
    console.error('Report subject matching exception:', err)
    return NextResponse.json(
      { error: 'Chyba při zpracování identifikátorů.' },
      { status: 500 },
    )
  }

  // 7. AI precheck (shared lib, bez HTTP roundtripu)
  const aiResult = await runAiPrecheck({
    category: parsed.category,
    category_other: parsed.category_other,
    severity: parsed.severity,
    incident_date: parsed.incident_date,
    amount_czk: parsed.amount_czk,
    platform: parsed.platform,
    platform_other: parsed.platform_other,
    description: parsed.description,
    evidence_summary: {
      count: parsed.files.length,
      types: parsed.files.map((f) => mimeToEvidenceType(f.type)),
    },
  })

  // 8. Determine notification email (priority: contact > identifier type=email)
  let notification_email: string | null = parsed.contact_for_subject_email
  if (!notification_email) {
    const emailIdentifier = parsedIdentifiers.find((i) => i.type === 'email')
    if (emailIdentifier) {
      notification_email = emailIdentifier.normalizedValue
    }
  }

  // 9. Compute initial status
  let initialStatus: IncidentStatus
  if (needsMergeReview) {
    initialStatus = 'pending_merge_review'
  } else if (aiResult.confidence_score < 60) {
    initialStatus = 'pending'
  } else {
    initialStatus = 'ai_reviewed'
  }

  // 10. INSERT incident
  let incidentId: string
  try {
    const { data: newIncident, error: incidentInsertErr } = await supabaseAdmin()
      .from('incidents')
      .insert({
        reporter_id: userId,
        subject_id: subjectId,
        incident_date: parsed.incident_date,
        platform: parsed.platform,
        platform_other: parsed.platform_other,
        category: parsed.category,
        category_other: parsed.category_other,
        severity: parsed.severity,
        amount_czk: parsed.amount_czk,
        description: parsed.description,
        contact_for_subject_email: parsed.contact_for_subject_email,
        ai_confidence_score: aiResult.confidence_score,
        ai_summary: aiResult.ai_summary,
        ai_red_flags: aiResult.red_flags,
        status: initialStatus,
        notification_email,
      })
      .select('id')
      .single()

    if (incidentInsertErr || !newIncident) {
      console.error('Report incident insert failed:', incidentInsertErr)
      return NextResponse.json(
        { error: 'Nepodařilo se vytvořit nahlášení.' },
        { status: 500 },
      )
    }
    incidentId = newIncident.id
  } catch (err) {
    console.error('Report incident insert exception:', err)
    return NextResponse.json(
      { error: 'Chyba při vytváření nahlášení.' },
      { status: 500 },
    )
  }

  // 11. Upload souborů + INSERT evidence (s rollbackem při chybě)
  const uploadedPaths: string[] = []
  try {
    for (const file of parsed.files) {
      const fileHash = await hashFile(file)
      const ext = MIME_TO_EXT[file.type] ?? 'bin'
      const path = `${incidentId}/${fileHash}.${ext}`

      const { error: uploadErr } = await supabaseAdmin()
        .storage.from(STORAGE_BUCKET)
        .upload(path, file, {
          contentType: file.type,
          upsert: false,
          cacheControl: '3600',
        })

      if (uploadErr) {
        throw new Error(`Upload "${file.name}" selhal: ${uploadErr.message}`)
      }
      uploadedPaths.push(path)

      const { error: evidenceInsertErr } = await supabaseAdmin()
        .from('evidence')
        .insert({
          incident_id: incidentId,
          type: mimeToEvidenceType(file.type),
          file_path: path,
          file_hash: fileHash,
          file_size_bytes: file.size,
          mime_type: file.type,
        })

      if (evidenceInsertErr) {
        throw new Error(`Evidence DB insert selhal: ${evidenceInsertErr.message}`)
      }
    }
  } catch (err) {
    console.error('Report evidence upload failed, rolling back:', err)
    // Rollback: smaž uploadnuté soubory + incident (CASCADE smaže evidence rows)
    if (uploadedPaths.length > 0) {
      try {
        await supabaseAdmin().storage.from(STORAGE_BUCKET).remove(uploadedPaths)
      } catch (cleanupErr) {
        console.error('Rollback storage cleanup failed:', cleanupErr)
      }
    }
    try {
      await supabaseAdmin().from('incidents').delete().eq('id', incidentId)
    } catch (cleanupErr) {
      console.error('Rollback incident delete failed:', cleanupErr)
    }
    return NextResponse.json(
      { error: 'Nepodařilo se uložit důkazy. Zkuste to znovu.' },
      { status: 500 },
    )
  }

  // 12. Pokud máme e-mail a status='ai_reviewed', přepni na 'notified'
  let finalStatus: IncidentStatus = initialStatus
  if (notification_email && initialStatus === 'ai_reviewed') {
    try {
      const { error: notifyErr } = await supabaseAdmin()
        .from('incidents')
        .update({
          status: 'notified',
          notification_sent_at: new Date().toISOString(),
        })
        .eq('id', incidentId)
      if (notifyErr) {
        console.error('Report status notify update failed:', notifyErr)
        // Necháme status='ai_reviewed' — cron job pak publish za 14 dní
      } else {
        finalStatus = 'notified'
        // TODO: Enqueue Resend e-mail job (v dalším promptu)
      }
    } catch (err) {
      console.error('Report status notify exception:', err)
    }
  }

  // 13. Audit log
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null
    const userAgent = req.headers.get('user-agent') || null
    await supabaseAdmin()
      .from('audit_log')
      .insert({
        actor_type: 'reporter',
        actor_id: userId,
        action: 'create_incident',
        target_type: 'incident',
        target_id: incidentId,
        ip_address: ip,
        user_agent: userAgent,
        metadata: {
          phase: 'commit',
          subject_id: subjectId,
          status: finalStatus,
          ai_confidence_score: aiResult.confidence_score,
          ai_recommendation: aiResult.recommendation,
          red_flag_count: aiResult.red_flags.length,
          files_count: parsed.files.length,
          new_identifiers_count: newIdentifiersToInsert.length,
          needs_merge_review: needsMergeReview,
          conflicting_subject_ids: conflictingSubjectIds,
        },
      })
  } catch (err) {
    console.error('Report audit_log insert failed:', err)
  }

  // 14. Response
  return NextResponse.json(
    {
      incident_id: incidentId,
      status: finalStatus,
      message: statusMessage(finalStatus),
    },
    { status: 201 },
  )
}
```
