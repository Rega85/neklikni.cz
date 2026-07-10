/**
 * Verdikt engine (Fáze 2 sjednoceného vstupu) — čisté slévání signálů
 * z databázových kontrol a AI analýzy do jednotné odpovědi.
 *
 * Žádné I/O zde — vstup jsou už hotové výsledky kontrol (viz
 * app/api/check/route.ts, který tuto funkci volá). Díky tomu je
 * slévací logika 100% testovatelná bez mockování Supabase/Anthropic.
 *
 * Pravidla slévání jsou produktové rozhodnutí (viz komentáře u
 * buildVerdict) — AI výstup nikdy nesmí zmírnit tvrdou databázovou
 * shodu, jen ji smí zpřísnit.
 */

import type { InputKind, ParsedInput } from './inputParser'
import type { IdentifierType } from '@/types/databaze'
import { identifierLabel } from '@/utils/databaze/identifiers'

export type VerdictLevel = 'green' | 'orange' | 'red'

export interface CoiMatchSignal {
  domain: string
  reason: string | null
  category: string | null
  source: string
  source_url: string | null
}

export interface IdentifierMatchSignal {
  type: IdentifierType
  value_masked: string
  verified: boolean
  incident_count: number
  trust_score: number
}

export interface DatabaseSignal {
  coi_matches: CoiMatchSignal[]
  identifier_matches: IdentifierMatchSignal[]
}

export interface AiSignal {
  risk: number
  verdict: string
  analysis: string
  threats: string[]
  recommendation: string
  /** Jen PRO/oneshot prompt tyhle pole vyplňuje. */
  tactics?: string[]
  details?: Record<string, unknown>
}

export interface VerdictInput {
  parsed: ParsedInput
  database: DatabaseSignal | null
  ai: AiSignal | null
}

export interface Verdict {
  level: VerdictLevel
  score: number
  headline: string
  actions: string[]
  sources: {
    database: DatabaseSignal | null
    ai: AiSignal | null
  }
}

/**
 * Rozhodne, které kontroly pro daný inputKind spustit. Identifikátor
 * bez volného textu nemá z čeho AI usuzovat → AI se vůbec nevolá
 * (šetří tokeny). Čistá zpráva bez URL/identifikátoru nemá co hledat
 * v databázi.
 */
export function planChecks(inputKind: InputKind): { checkDatabase: boolean; checkAi: boolean } {
  switch (inputKind) {
    case 'identifier':
      return { checkDatabase: true, checkAi: false }
    case 'message':
      return { checkDatabase: false, checkAi: true }
    case 'url':
    case 'mixed':
      return { checkDatabase: true, checkAi: true }
  }
}

const GREEN_HEADLINE = 'Nenašli jsme významné rizikové signály.'

const ACTIONS: Record<VerdictLevel, string[]> = {
  red: [
    'Nereagujte a neposílejte žádné peníze ani osobní údaje.',
    'Nahlaste to do naší databáze — pomůžete tak dalším lidem.',
  ],
  orange: [
    'Buďte opatrní — ověřte protistranu jiným způsobem (BankID, osobní vyzvednutí, escrow).',
    'Než pošlete peníze nebo údaje, zkontrolujte identifikátor v naší databázi.',
  ],
  green: [
    'I tak buďte obezřetní u plateb předem a sdílení osobních údajů.',
    'V případě pochybností ověřte protistranu v naší databázi.',
  ],
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n))
}

function levelForScore(score: number): VerdictLevel {
  if (score >= 80) return 'red'
  if (score >= 40) return 'orange'
  return 'green'
}

function coiHeadline(match: CoiMatchSignal): string {
  return `Tento e-shop (${match.domain}) je na seznamu rizikových e-shopů ČOI.`
}

function verifiedIdentifierHeadline(match: IdentifierMatchSignal): string {
  return `Tento identifikátor (${identifierLabel(match.type).toLowerCase()}) je evidován jako ověřený rizikový kontakt v naší databázi.`
}

const COMMUNITY_REPORT_HEADLINE =
  'Tento údaj se objevil v komunitním nahlášení, které zatím nebylo ověřeno.'

/**
 * Sleje databázové a AI signály do jednoho verdiktu.
 *
 * a) Tvrdá shoda (ČOI doména NEBO ověřený identifikátor) → red, score
 *    min. 80. AI smí score jen zvýšit, nikdy ho nesmí stáhnout dolů —
 *    AI výstup zůstává viditelný v sources.ai, ale nezmírní verdikt.
 * b) Neověřená komunitní shoda → orange, +30 ke skóre (báze buď AI
 *    risk, nebo 40 když AI neběželo), capnuto do orange pásma 40-79 —
 *    samotné neověřené nahlášení nesmí samo eskalovat na red.
 * c)/d) Databáze čistá → score = AI risk, level podle pásma
 *    (green 0-39 / orange 40-79 / red 80-100). Zelený verdikt má vždy
 *    pevnou headline, nikdy slovo "bezpečné"/"v pořádku".
 * e) Identifier vstup bez shody a bez AI (viz planChecks) → green
 *    fallback s nízkým baseline skóre.
 */
export function buildVerdict(input: VerdictInput): Verdict {
  const { database, ai } = input
  const coiMatches = database?.coi_matches ?? []
  const identifierMatches = database?.identifier_matches ?? []
  const verifiedMatch = identifierMatches.find((m) => m.verified)
  const hardMatch = coiMatches.length > 0 || Boolean(verifiedMatch)
  const unverifiedMatch = !hardMatch && identifierMatches.length > 0

  let level: VerdictLevel
  let score: number
  let headline: string

  if (hardMatch) {
    level = 'red'
    score = clamp(Math.max(80, ai?.risk ?? 0), 80, 100)
    headline = coiMatches.length > 0 ? coiHeadline(coiMatches[0]) : verifiedIdentifierHeadline(verifiedMatch!)
  } else if (unverifiedMatch) {
    level = 'orange'
    score = clamp((ai?.risk ?? 40) + 30, 40, 79)
    headline = COMMUNITY_REPORT_HEADLINE
  } else if (ai) {
    score = clamp(ai.risk, 0, 100)
    level = levelForScore(score)
    headline = level === 'green' ? GREEN_HEADLINE : ai.verdict
  } else {
    score = 10
    level = 'green'
    headline = GREEN_HEADLINE
  }

  return {
    level,
    score,
    headline,
    actions: ACTIONS[level],
    sources: {
      database,
      ai,
    },
  }
}
