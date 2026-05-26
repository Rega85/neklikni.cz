/**
 * POST /api/admin/moderace
 *
 * Admin-only akce na frontu čekajících nahlášení. Přijímá HTML form
 * (x-www-form-urlencoded) z /admin/moderace, aby stránka fungovala bez JS:
 *   incident_id=<uuid>&action=approve|reject|needs_more_info&note=<string>
 *
 * Approve         → status='published', public_at=now()
 * Reject          → status='removed', removed_at=now(), removed_reason=<note>
 * Needs more info → status='needs_more_info', admin_note=<note>
 *
 * Pro reject + needs_more_info je note povinná (min. 3 znaky). Pokud je
 * incident už mimo frontu (race s jiným adminem), update je no-op a vrátíme
 * redirect zpět na frontu bez chyby.
 *
 * Po úspěšné akci se nahlašovateli pošle e-mail (best-effort, selhání
 * neshodí request) a vše se zapíše do audit_log.
 */

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getAdminIdentity } from '../_lib/auth'
import type { DatabazeDatabase } from '../../databaze/_lib/database'
import type { IncidentStatus } from '@/types/databaze'
import {
  sendReporterIncidentNeedsInfo,
  sendReporterIncidentRejected,
} from '../../databaze/_lib/email'

export const dynamic = 'force-dynamic'

const QUEUE_STATUSES: IncidentStatus[] = ['ai_reviewed', 'pending', 'needs_more_info']
const ACTIONS = ['approve', 'reject', 'needs_more_info'] as const
type ModerationAction = (typeof ACTIONS)[number]

function backToQueue() {
  return NextResponse.redirect(
    new URL('/admin/moderace', process.env.NEXT_PUBLIC_APP_URL || 'https://www.neklikni.cz'),
    303,
  )
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
  const actionRaw = form.get('action')
  const noteRaw = form.get('note')

  if (typeof incidentId !== 'string' || !/^[0-9a-f-]{36}$/i.test(incidentId)) {
    return NextResponse.json({ error: 'Neplatné incident_id' }, { status: 400 })
  }
  if (typeof actionRaw !== 'string' || !(ACTIONS as readonly string[]).includes(actionRaw)) {
    return NextResponse.json({ error: 'Neplatná akce' }, { status: 400 })
  }
  const action = actionRaw as ModerationAction
  const note = typeof noteRaw === 'string' ? noteRaw.trim() : ''

  if ((action === 'reject' || action === 'needs_more_info') && note.length < 3) {
    return NextResponse.json(
      { error: 'Důvod / poznámka je u této akce povinná (min. 3 znaky).' },
      { status: 400 },
    )
  }
  if (note.length > 2000) {
    return NextResponse.json(
      { error: 'Poznámka je příliš dlouhá (max 2000 znaků).' },
      { status: 400 },
    )
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }
  const sb = createClient<DatabazeDatabase>(url, key)

  // Update incident (jen pokud je dosud ve frontě — chrání před race se
  // souběžným adminem nebo opakovaným kliknutím).
  const now = new Date().toISOString()
  type UpdatedRow = { id: string; reporter_id: string }
  let updateResult: { data: UpdatedRow | null; error: unknown } = { data: null, error: null }
  let auditAction: 'update_incident' | 'remove_incident'

  if (action === 'approve') {
    auditAction = 'update_incident'
    updateResult = (await sb
      .from('incidents')
      .update({ status: 'published', public_at: now })
      .eq('id', incidentId)
      .in('status', QUEUE_STATUSES)
      .select('id, reporter_id')
      .maybeSingle()) as { data: UpdatedRow | null; error: unknown }
  } else if (action === 'reject') {
    auditAction = 'remove_incident'
    updateResult = (await sb
      .from('incidents')
      .update({
        status: 'removed',
        removed_at: now,
        removed_reason: note,
      })
      .eq('id', incidentId)
      .in('status', QUEUE_STATUSES)
      .select('id, reporter_id')
      .maybeSingle()) as { data: UpdatedRow | null; error: unknown }
  } else {
    // needs_more_info
    auditAction = 'update_incident'
    updateResult = (await sb
      .from('incidents')
      .update({
        status: 'needs_more_info',
        admin_note: note,
      })
      .eq('id', incidentId)
      .in('status', QUEUE_STATUSES)
      .select('id, reporter_id')
      .maybeSingle()) as { data: UpdatedRow | null; error: unknown }
  }

  if (updateResult.error) {
    console.error('Admin moderation update failed:', updateResult.error)
    return NextResponse.json({ error: 'DB update selhal' }, { status: 500 })
  }
  if (!updateResult.data) {
    // Incident neexistuje, nebo už není ve frontě (race / opakovaný klik).
    return backToQueue()
  }
  const updated = updateResult.data

  // Reporter e-mail (best-effort). Pro approve zatím neposíláme — incident
  // se zveřejnil a reporter to vidí přímo v aplikaci; samostatný "approve"
  // mail je backlog.
  if (action === 'reject' || action === 'needs_more_info') {
    try {
      const { data: reporter, error: reporterErr } = await sb
        .from('reporters')
        .select('email')
        .eq('id', updated.reporter_id)
        .maybeSingle()
      if (reporterErr) {
        console.error('Reporter lookup failed for moderation notification:', {
          incidentId,
          reporterId: updated.reporter_id,
          err: reporterErr,
        })
      }
      const reporterEmail = reporter?.email ?? null
      if (!reporterEmail) {
        // Tichý skip by skryl, že reporter nemá email — log to explicitly, ať
        // jde z produkčních logů poznat, proč mail nedorazil.
        console.warn('Skipping reporter notification — no email on file', {
          incidentId,
          reporterId: updated.reporter_id,
          action,
        })
      } else if (action === 'reject') {
        await sendReporterIncidentRejected(reporterEmail, incidentId, note)
      } else {
        await sendReporterIncidentNeedsInfo(reporterEmail, incidentId, note)
      }
    } catch (err) {
      console.error('Reporter notification email failed:', { incidentId, action, err })
    }
  }

  // Audit log
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
        note: action === 'approve' ? null : note,
      },
    })
  } catch (err) {
    console.error('Admin moderation audit log failed:', err)
  }

  return backToQueue()
}
