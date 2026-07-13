/**
 * POST /api/admin/compare-models
 *
 * DOČASNÝ rozhodovací nástroj — Opus 4.5 (současný TIER_MODELS.oneshot/full)
 * vs Sonnet 5 (kandidát) na stejném produkčním promptu z aiAnalysis.ts.
 * Běží tam, kde reálně žije ANTHROPIC_API_KEY (preview deployment), ne
 * lokálně — žádný secret se nepřenáší.
 *
 * Admin-only (getAdminIdentity, stejný vzor jako ostatní /api/admin/*).
 * Jeden text = jedno volání = dvě Anthropic volání paralelně (Opus +
 * Sonnet 5) — vědomě NErozjíždí všech N testovacích zpráv v jednom
 * requestu, aby se neriskoval function timeout. Orchestrace přes N
 * zpráv se dělá z volající strany (viz scripts/compare-models.ts pro
 * seznam testovacích zpráv).
 *
 * SMAZAT po rozhodnutí o swapu — není to trvalá funkce produktu.
 */

import { NextResponse } from 'next/server'
import { getAdminIdentity } from '../_lib/auth'
import { runAnalysis } from '../../_lib/aiAnalysis'

export const dynamic = 'force-dynamic'

const OPUS = 'claude-opus-4-5'
const SONNET5 = 'claude-sonnet-5'

function levelForScore(score: number): 'green' | 'orange' | 'red' {
  if (score >= 80) return 'red'
  if (score >= 40) return 'orange'
  return 'green'
}

async function runOne(model: string, text: string) {
  try {
    const data = await runAnalysis(text, 'full', [], model)
    return {
      risk: data.risk,
      verdict: data.verdict,
      analysis: data.analysis,
      threats: data.threats ?? [],
      level: levelForScore(data.risk),
    }
  } catch (err) {
    return {
      risk: null,
      verdict: '',
      analysis: '',
      threats: [],
      level: 'error' as const,
      error: err instanceof Error ? err.message : String(err),
    }
  }
}

export async function POST(req: Request) {
  const admin = await getAdminIdentity()
  if (!admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Neplatný JSON' }, { status: 400 })
  }

  const text =
    body && typeof body === 'object' && 'text' in body
      ? (body as Record<string, unknown>).text
      : null
  if (typeof text !== 'string' || text.trim().length < 2) {
    return NextResponse.json({ error: 'Chybí text' }, { status: 400 })
  }

  const [opus, sonnet5] = await Promise.all([
    runOne(OPUS, text),
    runOne(SONNET5, text),
  ])

  return NextResponse.json({ opus, sonnet5 })
}
