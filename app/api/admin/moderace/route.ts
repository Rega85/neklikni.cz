/**
 * POST /api/admin/moderace
 *
 * Admin-only akce na fronty čekajících nahlášení. Přijímá HTML form
 * (x-www-form-urlencoded) z /admin/moderace, aby stránka fungovala bez JS:
 *   incident_id=<uuid>&action=approve|reject
 *
 * Approve  → status='published', public_at=now()
 * Reject   → status='removed',  removed_at=now(), removed_reason='admin_review'
 *
 * Vždy zapíše audit_log řádek. Po úspěchu 303 redirect zpět na /admin/moderace.
 */

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getAdminIdentity } from '../_lib/auth'
import type { DatabazeDatabase } from '../../databaze/_lib/database'

export const dynamic = 'force-dynamic'

function backToQueue() {
  return NextResponse.redirect(new URL('/admin/moderace', process.env.NEXT_PUBLIC_APP_URL || 'https://www.neklikni.cz'), 303)
}

export async function POST(req: Request) {
  const admin = await getAdminIdentity()
  if (!admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let form: FormData
  try {
    form = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Neplatný request' }, { status: 400 })
  }

  const incidentId = form.get('incident_id')
  const action = form.get('action')
  if (typeof incidentId !== 'string' || !/^[0-9a-f-]{36}$/i.test(incidentId)) {
    return NextResponse.json({ error: 'Neplatné incident_id' }, { status: 400 })
  }
  if (action !== 'approve' && action !== 'reject') {
    return NextResponse.json({ error: 'Neplatná akce' }, { status: 400 })
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }
  const sb = createClient<DatabazeDatabase>(url, key)

  const now = new Date().toISOString()
  let auditAction: 'update_incident' | 'remove_incident'
  let updateResult
  if (action === 'approve') {
    auditAction = 'update_incident'
    updateResult = await sb
      .from('incidents')
      .update({ status: 'published', public_at: now })
      .eq('id', incidentId)
      .in('status', ['ai_reviewed', 'pending'])
      .select('id')
      .maybeSingle()
  } else {
    auditAction = 'remove_incident'
    updateResult = await sb
      .from('incidents')
      .update({ status: 'removed', removed_at: now, removed_reason: 'admin_review' })
      .eq('id', incidentId)
      .in('status', ['ai_reviewed', 'pending'])
      .select('id')
      .maybeSingle()
  }

  if (updateResult.error) {
    console.error('Admin moderation update failed:', updateResult.error)
    return NextResponse.json({ error: 'DB update selhal' }, { status: 500 })
  }
  if (!updateResult.data) {
    // Incident neexistuje nebo už není ve frontě (race s jiným adminem).
    return backToQueue()
  }

  try {
    await sb.from('audit_log').insert({
      actor_type: 'admin',
      actor_id: admin.userId,
      action: auditAction,
      target_type: 'incident',
      target_id: incidentId,
      ip_address: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null,
      user_agent: req.headers.get('user-agent') || null,
      metadata: {
        phase: 'moderation',
        decision: action,
      },
    })
  } catch (err) {
    console.error('Admin moderation audit log failed:', err)
  }

  return backToQueue()
}
