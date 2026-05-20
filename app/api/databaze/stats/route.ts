/**
 * GET /api/databaze/stats
 *
 * Veřejný endpoint vracející agregované counts pro modul `/databaze`.
 * Používá se na homepage v `DatabazeGateway` (client-side fetch).
 *
 * Response:
 *   { subjects: number | null, incidents: number | null, reporters: number | null }
 *
 * Null znamená "data nejsou k dispozici" (chybí env, migrace neproběhla,
 * tabulky neexistují) — UI by mělo zobrazit "—".
 */

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { IncidentStatus } from '@/types/databaze'
import type { DatabazeDatabase } from '../_lib/database'

export const dynamic = 'force-dynamic'

const PUBLIC_STATUSES: IncidentStatus[] = ['published', 'notified', 'ai_reviewed']

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    return NextResponse.json({
      subjects: null,
      incidents: null,
      reporters: null,
    })
  }

  try {
    const sb = createClient<DatabazeDatabase>(url, key)
    const [subjectsRes, incidentsRes, reportersRes] = await Promise.all([
      sb
        .from('subjects')
        .select('*', { count: 'exact', head: true })
        .eq('visibility_status', 'active'),
      sb
        .from('incidents')
        .select('*', { count: 'exact', head: true })
        .in('status', PUBLIC_STATUSES),
      sb.from('reporters').select('*', { count: 'exact', head: true }),
    ])

    return NextResponse.json({
      subjects: subjectsRes.error ? null : subjectsRes.count ?? 0,
      incidents: incidentsRes.error ? null : incidentsRes.count ?? 0,
      reporters: reportersRes.error ? null : reportersRes.count ?? 0,
    })
  } catch (err) {
    console.error('Stats endpoint exception:', err)
    return NextResponse.json({
      subjects: null,
      incidents: null,
      reporters: null,
    })
  }
}
