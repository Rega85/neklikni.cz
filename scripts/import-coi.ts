/**
 * Import veřejného seznamu rizikových e-shopů ČOI do databáze.
 *
 * Použití:
 *   npx tsx scripts/import-coi.ts [--dry-run]
 *
 * Vyžaduje env proměnné:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Idempotentní: upsert podle domain — opakované spuštění
 * nevytvoří duplikáty, pouze aktualizuje reason/reported_date.
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// ── Config ───────────────────────────────────────────

const DATA_FILE = resolve(process.cwd(), 'data/coi_eshops.json')
const DRY_RUN = process.argv.includes('--dry-run')
const BATCH_SIZE = 100

// ── Types ────────────────────────────────────────────

interface CoiJsonEntry {
  domain: string
  raw_url?: string
  reason?: string
  category?: string
  reported_date?: string
  source?: string
  source_url?: string
}

interface CoiDbRow {
  domain: string
  reason: string | null
  category: string | null
  reported_date: string | null
  source: string
  source_url: string | null
}

// ── Domain normalizace ───────────────────────────────

function normalizeDomain(raw: string): string | null {
  if (typeof raw !== 'string' || raw.trim() === '') return null

  let cleaned = raw.trim().toLowerCase()
  cleaned = cleaned.replace(/^https?:\/\//, '')
  cleaned = cleaned.replace(/^www\./, '')
  // Ponech jen část před lomítkem (COI ukládá jen domény)
  cleaned = cleaned.split('/')[0].split('?')[0].split('#')[0]
  cleaned = cleaned.replace(/\/+$/, '')

  // Základní validace tvaru domény (tečka + písmenné TLD)
  if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*\.[a-z]{2,}$/.test(cleaned)) {
    return null
  }

  return cleaned
}

// ── Main ─────────────────────────────────────────────

async function main() {
  console.log(`📂 Načítám ${DATA_FILE}…`)
  let rawData: unknown
  try {
    rawData = JSON.parse(readFileSync(DATA_FILE, 'utf-8'))
  } catch (err) {
    console.error('❌ Nelze načíst JSON soubor:', err)
    process.exit(1)
  }

  if (!Array.isArray(rawData)) {
    console.error('❌ JSON soubor musí být pole objektů.')
    process.exit(1)
  }

  const entries = rawData as CoiJsonEntry[]
  console.log(`📊 Načteno ${entries.length} záznamů`)

  // Normalizace + validace
  const rows: CoiDbRow[] = []
  const skipped: string[] = []

  for (const entry of entries) {
    const domain = normalizeDomain(entry.domain ?? entry.raw_url ?? '')
    if (!domain) {
      skipped.push(String(entry.domain ?? entry.raw_url ?? '(prázdné)'))
      continue
    }
    rows.push({
      domain,
      reason: entry.reason?.trim() ?? null,
      category: entry.category?.trim() ?? null,
      reported_date: entry.reported_date ?? null,
      source: entry.source ?? 'ČOI',
      source_url: entry.source_url ?? null,
    })
  }

  if (skipped.length > 0) {
    console.warn(`⚠️  Přeskočeno ${skipped.length} záznamů s neplatnou doménou:`)
    skipped.slice(0, 10).forEach((d) => console.warn(`   - ${d}`))
    if (skipped.length > 10) console.warn(`   … a ${skipped.length - 10} dalších`)
  }

  // Deduplicate po normalizaci (jeden domain může být ve vstupním JSON vícekrát)
  const seen = new Set<string>()
  const deduped = rows.filter((r) => {
    if (seen.has(r.domain)) return false
    seen.add(r.domain)
    return true
  })

  console.log(`✅ Po normalizaci: ${deduped.length} unikátních domén`)

  if (DRY_RUN) {
    console.log('🔍 DRY RUN — žádná data se nezapíší. Prvních 5 řádků:')
    deduped.slice(0, 5).forEach((r) => console.log(' ', JSON.stringify(r)))
    return
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  // Podporuje SUPABASE_SERVICE_ROLE_KEY i SUPABASE_SERVICE_KEY (lokální alias)
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('❌ Chybí NEXT_PUBLIC_SUPABASE_URL nebo SUPABASE_SERVICE_ROLE_KEY / SUPABASE_SERVICE_KEY')
    process.exit(1)
  }

  const client = createClient(supabaseUrl, serviceRoleKey)

  // Batch upsert
  let inserted = 0
  let errors = 0

  for (let i = 0; i < deduped.length; i += BATCH_SIZE) {
    const batch = deduped.slice(i, i + BATCH_SIZE)
    const { error } = await client
      .from('coi_risky_eshops')
      .upsert(batch, {
        onConflict: 'domain',
        ignoreDuplicates: false,
      })

    if (error) {
      console.error(`❌ Chyba při dávce ${i}–${i + batch.length}:`, error.message)
      errors++
    } else {
      inserted += batch.length
      const pct = Math.round(((i + batch.length) / deduped.length) * 100)
      process.stdout.write(`\r⬆️  ${inserted}/${deduped.length} (${pct}%)`)
    }
  }

  console.log(`\n\n✅ Import dokončen: ${inserted} záznamů upsertováno, ${errors} chyb`)

  if (errors > 0) process.exit(1)
}

main().catch((err) => {
  console.error('❌ Neočekávaná chyba:', err)
  process.exit(1)
})
