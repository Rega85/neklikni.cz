/**
 * POST /api/admin/uzivatele
 *
 * Ban / unban uživatele na auth úrovni (auth.admin.updateUserById + ban_duration).
 * Synchronizuje stav i do reporters tabulky (best-effort).
 * Každá akce se zapíše do audit_log.
 *
 * Body: { userId: uuid, action: 'ban' | 'unban' }
 */

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getAdminIdentity } from '../_lib/auth'
import type { DatabazeDatabase } from '../../databaze/_lib/database'
import { sendPasswordResetEmail } from '../../databaze/_lib/email'

export const dynamic = 'force-dynamic'

const ACTIONS = ['ban', 'unban', 'reset_password'] as const
type AdminAction = (typeof ACTIONS)[number]

export async function POST(req: Request) {
  const admin = await getAdminIdentity()
  if (!admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Neplatný JSON.' }, { status: 400 })
  }

  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Neplatný request.' }, { status: 400 })
  }

  const { userId, action } = body as { userId?: unknown; action?: unknown }

  if (typeof userId !== 'string' || !/^[0-9a-f-]{36}$/i.test(userId)) {
    return NextResponse.json({ error: 'Neplatné userId.' }, { status: 400 })
  }
  if (typeof action !== 'string' || !(ACTIONS as readonly string[]).includes(action)) {
    return NextResponse.json({ error: 'Neplatná akce.' }, { status: 400 })
  }
  const act = action as AdminAction

  // Blokujeme self-ban — admin nemůže zablokovat sám sebe
  if (act !== 'reset_password' && userId === admin.userId) {
    return NextResponse.json({ error: 'Nelze zablokovat vlastní účet.' }, { status: 400 })
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    return NextResponse.json({ error: 'Server misconfigured.' }, { status: 500 })
  }

  const sb = createClient<DatabazeDatabase>(url, key)

  // ── Reset hesla ─────────────────────────────────────────────────────────
  if (act === 'reset_password') {
    const { data: userData, error: getUserErr } = await sb.auth.admin.getUserById(userId)
    if (getUserErr || !userData.user?.email) {
      return NextResponse.json({ error: 'Uživatel nenalezen nebo nemá e-mail.' }, { status: 404 })
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.neklikni.cz'
    const { data: linkData, error: linkErr } = await sb.auth.admin.generateLink({
      type: 'recovery',
      email: userData.user.email,
      options: { redirectTo: `${appUrl}/auth/callback?next=/update-password` },
    })
    if (linkErr || !linkData?.properties?.action_link) {
      console.error('admin/uzivatele: generateLink failed', linkErr)
      return NextResponse.json({ error: 'Generování odkazu selhalo.' }, { status: 500 })
    }

    const sent = await sendPasswordResetEmail(userData.user.email, linkData.properties.action_link)
    if (!sent) {
      return NextResponse.json({ error: 'E-mail se nepodařilo odeslat.' }, { status: 500 })
    }

    try {
      await sb.from('audit_log').insert({
        actor_type: 'admin',
        actor_id: admin.userId,
        action: 'admin_reset_password',
        target_type: 'reporter',
        target_id: userId,
        ip_address: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null,
        user_agent: req.headers.get('user-agent') || null,
        metadata: { admin_email: admin.email, user_email: userData.user.email },
      })
    } catch (err) {
      console.error('admin/uzivatele: audit_log (reset) failed', err)
    }

    return NextResponse.json({ ok: true, action: 'reset_password' })
  }

  // ── Ban / Unban ──────────────────────────────────────────────────────────
  // Auth-level ban přes Supabase Admin API
  // ban_duration '876000h' ≈ 100 let = efektivně permanentní ban
  // ban_duration 'none' = okamžité odblokování
  const { error: authErr } = await sb.auth.admin.updateUserById(userId, {
    ban_duration: act === 'ban' ? '876000h' : 'none',
  })
  if (authErr) {
    console.error('admin/uzivatele: auth.admin.updateUserById failed', authErr)
    return NextResponse.json({ error: 'Auth update selhal.' }, { status: 500 })
  }

  // Sync do reporters tabulky (best-effort — uživatel nemusí mít reporters záznam)
  try {
    const now = new Date().toISOString()
    if (act === 'ban') {
      await sb
        .from('reporters')
        .update({
          banned: true,
          banned_at: now,
          banned_reason: `Admin ban by ${admin.email ?? admin.userId}`,
        })
        .eq('id', userId)
    } else {
      await sb
        .from('reporters')
        .update({ banned: false, banned_at: null, banned_reason: null })
        .eq('id', userId)
    }
  } catch (err) {
    console.error('admin/uzivatele: reporters sync failed (best-effort)', err)
  }

  // Audit log
  try {
    await sb.from('audit_log').insert({
      actor_type: 'admin',
      actor_id: admin.userId,
      action: act === 'ban' ? 'ban_user' : 'unban_user',
      target_type: 'reporter',
      target_id: userId,
      ip_address: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null,
      user_agent: req.headers.get('user-agent') || null,
      metadata: { admin_email: admin.email },
    })
  } catch (err) {
    console.error('admin/uzivatele: audit_log insert failed', err)
  }

  return NextResponse.json({ ok: true, action: act })
}
