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

// Stable version. claude-sonnet-4-6 was speculative; verify availability
// before upgrading.
const PRECHECK_MODEL = 'claude-sonnet-4-5'
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

const SYSTEM_PROMPT = `Jsi expert na detekci pomstychtivých, manipulativních a nepravdivých nahlášení obchodních incidentů na českých bazarech a online platformách.

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
