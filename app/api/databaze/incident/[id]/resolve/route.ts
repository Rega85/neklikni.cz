/**
 * POST /api/databaze/incident/[id]/resolve
 *
 * Nahlašovatel (vlastník incidentu) nebo admin oznámí, že se případ
 * vyřešil smírně, nebo že nahlášení bylo chybné/staženo. Nemaže se
 * nic — jen se zapíše `resolution_status` + volitelná poznámka.
 *
 * Auth: cookies (SSR) → userId. Mutace jde přes service-role klienta
 * s explicitní ownership kontrolou (stejný vzor jako /api/databaze/report).
 */

import { NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { DatabazeDatabase } from '../../../_lib/database'
import { getAdminIdentity } from '../../../../admin/_lib/auth'

export const dynamic = 'force-dynamic'

const RESOLUTION_NOTE_MAX = 300
const ALLOWED_STATUSES = new Set(['resolved_amicably', 'withdrawn'])

type SupabaseAdminClient = ReturnType<typeof createSupabaseClient<DatabazeDatabase>>
let _supabaseAdmin: SupabaseAdminClient | null = null
function supabaseAdmin(): SupabaseAdminClient {
  if (!_supabaseAdmin) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) throw new Error('Supabase admin env vars missing')
    _supabaseAdmin = createSupabaseClient<DatabazeDatabase>(url, key)
  }
  return _supabaseAdmin
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: incidentId } = await params

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
    userId = data.user?.id ?? null
  } catch (err) {
    console.error('Resolve auth error:', err)
  }

  if (!userId) {
    return NextResponse.json({ error: 'Pro tuto akci se musíte přihlásit.' }, { status: 401 })
  }

  // 2. Parse body
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Neplatný JSON.' }, { status: 400 })
  }
  const resolutionStatusRaw =
    body && typeof body === 'object' && 'resolution_status' in body
      ? (body as Record<string, unknown>).resolution_status
      : null
  if (typeof resolutionStatusRaw !== 'string' || !ALLOWED_STATUSES.has(resolutionStatusRaw)) {
    return NextResponse.json(
      { error: 'resolution_status musí být "resolved_amicably" nebo "withdrawn".' },
      { status: 400 },
    )
  }
  const resolutionStatus = resolutionStatusRaw as 'resolved_amicably' | 'withdrawn'

  const noteRaw =
    body && typeof body === 'object' && 'resolution_note' in body
      ? (body as Record<string, unknown>).resolution_note
      : null
  let resolutionNote: string | null = null
  if (typeof noteRaw === 'string' && noteRaw.trim() !== '') {
    if (noteRaw.length > RESOLUTION_NOTE_MAX) {
      return NextResponse.json(
        { error: `Poznámka může mít maximálně ${RESOLUTION_NOTE_MAX} znaků.` },
        { status: 400 },
      )
    }
    resolutionNote = noteRaw.trim()
  }

  // 3. Fetch incident + ownership/admin check
  const { data: incident, error: fetchErr } = await supabaseAdmin()
    .from('incidents')
    .select('id, reporter_id, resolution_status')
    .eq('id', incidentId)
    .maybeSingle()

  if (fetchErr) {
    console.error('Resolve incident lookup failed:', fetchErr)
    return NextResponse.json({ error: 'Chyba při hledání nahlášení.' }, { status: 500 })
  }
  if (!incident) {
    return NextResponse.json({ error: 'Nahlášení nenalezeno.' }, { status: 404 })
  }

  const isOwner = incident.reporter_id === userId
  if (!isOwner) {
    const admin = await getAdminIdentity()
    if (!admin) {
      return NextResponse.json(
        { error: 'Tuto akci může provést jen autor nahlášení nebo admin.' },
        { status: 403 },
      )
    }
  }

  // 4. Update
  const { error: updateErr } = await supabaseAdmin()
    .from('incidents')
    .update({
      resolution_status: resolutionStatus,
      resolution_note: resolutionNote,
      resolution_at: new Date().toISOString(),
    })
    .eq('id', incidentId)

  if (updateErr) {
    console.error('Resolve incident update failed:', updateErr)
    return NextResponse.json({ error: 'Nepodařilo se uložit změnu.' }, { status: 500 })
  }

  // 5. Audit log (best-effort)
  try {
    await supabaseAdmin()
      .from('audit_log')
      .insert({
        actor_type: isOwner ? 'reporter' : 'admin',
        actor_id: userId,
        action: 'resolve_incident',
        target_type: 'incident',
        target_id: incidentId,
        metadata: {
          previous_resolution_status: incident.resolution_status,
          new_resolution_status: resolutionStatus,
          resolution_note: resolutionNote,
        },
      })
  } catch (err) {
    console.error('Resolve audit_log insert failed:', err)
  }

  return NextResponse.json({ resolution_status: resolutionStatus })
}
