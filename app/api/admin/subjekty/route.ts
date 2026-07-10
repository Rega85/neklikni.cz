/**
 * POST /api/admin/subjekty
 *
 * Admin-only akce nad subjektem — jádro GDPR takedown nástroje
 * `/admin/subjekty` (splnit slib "záznam odstraníme" z /gdpr bodu 13
 * bez ruční SQL/Supabase dashboardu).
 *
 * Akce:
 *   hide   → visibility_status = 'hidden_objection'. Záměrně JINÝ stav
 *            než 'removed', protože trg_incidents_refresh_subject_visibility
 *            (viz supabase/migrations/20260710_subject_visibility_trigger.sql)
 *            sahá jen na 'active'/'removed' — takhle admin skrytí přežije
 *            i budoucí změny na incidentech subjektu (nový incident by
 *            jinak mohl skrytí tiše zrušit).
 *   unhide → přepočítá visibility_status stejným pravidlem jako trigger
 *            (má aspoň 1 kvalifikující incident? active : removed) —
 *            ne natvrdo 'active', ať se znovu neobjeví bug z 2026-07,
 *            který tenhle nástroj řeší.
 *   delete → NEVRATNÉ smazání. Pořadí je záměrné: napřed soubory ve
 *            Storage bucketu `evidence`, teprve pak DB DELETE (FK CASCADE
 *            smaže subject_identifiers/incidents/evidence řádky/
 *            objections/claim_subscriptions/claim_responses samo).
 *            Když selže krok 1, nic se nesmazalo. Když by síla mazání
 *            selhala uprostřed po kroku 1, zůstanou osiřelé soubory
 *            (dohledatelné, žádná PII v DB) — bezpečnější než opačně
 *            (osiřelé důkazy bez záznamu, že měly být smazané).
 *            Vyžaduje `confirmText` === maskovaná hodnota prvního
 *            identifikátoru subjektu, ověřeno i server-side.
 *
 * Každá akce se zapíše do audit_log (u delete PŘED samotným smazáním —
 * jinak by po CASCADE nebylo co logovat).
 *
 * TODO (mimo Fázi 1, vědomě odloženo):
 *  - "Oprava" záznamu (GDPR /gdpr bod 13 slibuje "odstraníme NEBO
 *    opravíme") — tenhle nástroj umí jen odstranit. Oprava vyžaduje
 *    ověřit, že opravená verze je pravdivá, což je jiný, těžší problém.
 *  - Samoobslužný `/databaze/namitka/[token]` flow — tabulka `objections`
 *    a SQL funkce `submit_objection()` v DB existují (viz
 *    20260514_120000_create_reports_database.sql), ale nic je zatím
 *    nepoužívá. Nahlášená osoba dnes musí napsat na info@neklikni.cz.
 *  - Hromadné akce (bulk hide/delete), merge duplicitních subjektů.
 */

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getAdminIdentity } from '../_lib/auth'
import type { DatabazeDatabase } from '../../databaze/_lib/database'
import { isQualifyingIncident } from '../../databaze/_lib/crossReference'

export const dynamic = 'force-dynamic'

const ACTIONS = ['hide', 'unhide', 'delete'] as const
type SubjectAction = (typeof ACTIONS)[number]
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
    return NextResponse.json({ error: 'Neplatný JSON.' }, { status: 400 })
  }
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Neplatný request.' }, { status: 400 })
  }

  const { subjectId, action, confirmText } = body as {
    subjectId?: unknown
    action?: unknown
    confirmText?: unknown
  }

  if (typeof subjectId !== 'string' || !UUID_RE.test(subjectId)) {
    return NextResponse.json({ error: 'Neplatné subjectId.' }, { status: 400 })
  }
  if (typeof action !== 'string' || !(ACTIONS as readonly string[]).includes(action)) {
    return NextResponse.json({ error: 'Neplatná akce.' }, { status: 400 })
  }
  const act = action as SubjectAction

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    return NextResponse.json({ error: 'Server misconfigured.' }, { status: 500 })
  }
  const sb = createClient<DatabazeDatabase>(url, key)

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null
  const userAgent = req.headers.get('user-agent') || null

  // ── Hide ──────────────────────────────────────────────────────────────
  if (act === 'hide') {
    const { data, error } = await sb
      .from('subjects')
      .update({ visibility_status: 'hidden_objection' })
      .eq('id', subjectId)
      .select('id')
      .maybeSingle()
    if (error) {
      console.error('admin/subjekty hide failed:', error)
      return NextResponse.json({ error: 'DB update selhal.' }, { status: 500 })
    }
    if (!data) return NextResponse.json({ error: 'Subjekt nenalezen.' }, { status: 404 })

    try {
      await sb.from('audit_log').insert({
        actor_type: 'admin',
        actor_id: admin.userId,
        action: 'hide_subject',
        target_type: 'subject',
        target_id: subjectId,
        ip_address: ip,
        user_agent: userAgent,
        metadata: { admin_email: admin.email },
      })
    } catch (err) {
      console.error('admin/subjekty hide audit_log failed:', err)
    }
    return NextResponse.json({ ok: true, visibility_status: 'hidden_objection' })
  }

  // ── Unhide ────────────────────────────────────────────────────────────
  if (act === 'unhide') {
    const { data: incidents, error: incErr } = await sb
      .from('incidents')
      .select('status, resolution_status')
      .eq('subject_id', subjectId)
    if (incErr) {
      console.error('admin/subjekty unhide incidents lookup failed:', incErr)
      return NextResponse.json({ error: 'DB chyba.' }, { status: 500 })
    }
    const hasQualifying = (incidents ?? []).some(isQualifyingIncident)
    const nextStatus = hasQualifying ? 'active' : 'removed'

    const { data, error } = await sb
      .from('subjects')
      .update({ visibility_status: nextStatus })
      .eq('id', subjectId)
      .select('id')
      .maybeSingle()
    if (error) {
      console.error('admin/subjekty unhide failed:', error)
      return NextResponse.json({ error: 'DB update selhal.' }, { status: 500 })
    }
    if (!data) return NextResponse.json({ error: 'Subjekt nenalezen.' }, { status: 404 })

    try {
      await sb.from('audit_log').insert({
        actor_type: 'admin',
        actor_id: admin.userId,
        action: 'unhide_subject',
        target_type: 'subject',
        target_id: subjectId,
        ip_address: ip,
        user_agent: userAgent,
        metadata: { admin_email: admin.email, resolved_visibility: nextStatus },
      })
    } catch (err) {
      console.error('admin/subjekty unhide audit_log failed:', err)
    }
    return NextResponse.json({ ok: true, visibility_status: nextStatus })
  }

  // ── Delete (nevratné) ────────────────────────────────────────────────
  const { data: subjectRow, error: subjectErr } = await sb
    .from('subjects')
    .select('id, display_name_masked')
    .eq('id', subjectId)
    .maybeSingle()
  if (subjectErr) {
    console.error('admin/subjekty delete subject lookup failed:', subjectErr)
    return NextResponse.json({ error: 'DB chyba.' }, { status: 500 })
  }
  if (!subjectRow) {
    return NextResponse.json({ error: 'Subjekt nenalezen.' }, { status: 404 })
  }

  const { data: identifierRows, error: identErr } = await sb
    .from('subject_identifiers')
    .select('id, type, value_masked')
    .eq('subject_id', subjectId)
  if (identErr) {
    console.error('admin/subjekty delete identifiers lookup failed:', identErr)
    return NextResponse.json({ error: 'DB chyba.' }, { status: 500 })
  }

  // Vyžaduj přesné opsání stejné maskované hodnoty, kterou UI zobrazuje
  // jako potvrzovací text — server-side re-check, ne jen klientská kontrola.
  const expectedConfirm = identifierRows?.[0]?.value_masked ?? subjectRow.display_name_masked ?? ''
  if (typeof confirmText !== 'string' || confirmText.trim() !== expectedConfirm) {
    return NextResponse.json(
      { error: 'Potvrzovací text neodpovídá maskovanému identifikátoru.' },
      { status: 400 },
    )
  }

  const { data: incidentRows, error: incLookupErr } = await sb
    .from('incidents')
    .select('id')
    .eq('subject_id', subjectId)
  if (incLookupErr) {
    console.error('admin/subjekty delete incidents lookup failed:', incLookupErr)
    return NextResponse.json({ error: 'DB chyba.' }, { status: 500 })
  }
  const incidentIds = (incidentRows ?? []).map((r) => r.id)

  let evidencePaths: string[] = []
  if (incidentIds.length > 0) {
    const { data: evidenceRows, error: evErr } = await sb
      .from('evidence')
      .select('file_path')
      .in('incident_id', incidentIds)
    if (evErr) {
      console.error('admin/subjekty delete evidence lookup failed:', evErr)
      return NextResponse.json({ error: 'DB chyba.' }, { status: 500 })
    }
    evidencePaths = (evidenceRows ?? []).map((r) => r.file_path)
  }

  // 1. Storage soubory napřed — viz docstring nahoře pro zdůvodnění pořadí.
  if (evidencePaths.length > 0) {
    const { error: storageErr } = await sb.storage.from('evidence').remove(evidencePaths)
    if (storageErr) {
      console.error('admin/subjekty delete storage cleanup failed:', storageErr)
      return NextResponse.json(
        { error: 'Smazání souborů z úložiště selhalo — subjekt NEBYL smazán, zkuste to znovu.' },
        { status: 500 },
      )
    }
  }

  // 2. Audit log PŘED DB smazáním — jediná stopa, co po CASCADE zbyde.
  //    target_id v audit_log nemá FK na subjects, přežije smazání v pořádku.
  try {
    await sb.from('audit_log').insert({
      actor_type: 'admin',
      actor_id: admin.userId,
      action: 'delete_subject',
      target_type: 'subject',
      target_id: subjectId,
      ip_address: ip,
      user_agent: userAgent,
      metadata: {
        admin_email: admin.email,
        identifiers_masked: (identifierRows ?? []).map((r) => ({ type: r.type, value_masked: r.value_masked })),
        incident_count: incidentIds.length,
        evidence_file_count: evidencePaths.length,
      },
    })
  } catch (err) {
    console.error('admin/subjekty delete audit_log failed:', err)
  }

  // 3. DB delete — FK CASCADE smaže vše navázané.
  const { error: deleteErr } = await sb.from('subjects').delete().eq('id', subjectId)
  if (deleteErr) {
    console.error('admin/subjekty delete failed:', deleteErr)
    return NextResponse.json(
      { error: 'Smazání subjektu z DB selhalo (soubory z úložiště už byly smazané).' },
      { status: 500 },
    )
  }

  return NextResponse.json({ ok: true, deleted: true })
}
