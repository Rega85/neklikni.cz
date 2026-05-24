/**
 * POST /api/admin/reveal-identifier
 *
 * Admin-only odkrytí plné hodnoty subject_identifier (vrací sloupec `value`,
 * který je jinak v public view zaslepený). Každé volání zaloguje audit_log
 * řádek s actor/IP/UA pro forenzní stopu — odkrývání identifikátorů je
 * citlivá operace.
 *
 * Body (JSON):
 *   { identifier_id: uuid, incident_id?: uuid }
 *
 * Response 200:
 *   { type, value, value_masked }
 */

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getAdminIdentity } from '../_lib/auth'
import type { DatabazeDatabase } from '../../databaze/_lib/database'

export const dynamic = 'force-dynamic'

const UUID_RE = /^[0-9a-f-]{36}$/i

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

  const identifierId =
    body && typeof body === 'object' && 'identifier_id' in body
      ? (body as Record<string, unknown>).identifier_id
      : null
  if (typeof identifierId !== 'string' || !UUID_RE.test(identifierId)) {
    return NextResponse.json({ error: 'Neplatné identifier_id' }, { status: 400 })
  }
  const incidentIdRaw =
    body && typeof body === 'object' && 'incident_id' in body
      ? (body as Record<string, unknown>).incident_id
      : null
  const incidentId =
    typeof incidentIdRaw === 'string' && UUID_RE.test(incidentIdRaw) ? incidentIdRaw : null

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }
  const sb = createClient<DatabazeDatabase>(url, key)

  const { data: idRow, error: idErr } = await sb
    .from('subject_identifiers')
    .select('id, subject_id, type, value, value_masked')
    .eq('id', identifierId)
    .maybeSingle()

  if (idErr) {
    console.error('reveal-identifier lookup failed:', idErr)
    return NextResponse.json({ error: 'DB chyba' }, { status: 500 })
  }
  if (!idRow) {
    return NextResponse.json({ error: 'Identifier nenalezen' }, { status: 404 })
  }

  try {
    await sb.from('audit_log').insert({
      actor_type: 'admin',
      actor_id: admin.userId,
      action: 'reveal_identifier',
      target_type: 'subject',
      target_id: idRow.subject_id,
      ip_address: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null,
      user_agent: req.headers.get('user-agent') || null,
      metadata: {
        identifier_id: idRow.id,
        identifier_type: idRow.type,
        incident_id: incidentId,
      },
    })
  } catch (err) {
    console.error('reveal-identifier audit_log failed:', err)
  }

  return NextResponse.json({
    type: idRow.type,
    value: idRow.value,
    value_masked: idRow.value_masked,
  })
}
