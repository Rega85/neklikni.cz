/**
 * /admin/subjekty/[id] — detail subjektu.
 *
 * Přístup: jen pro adminy (stejný guard jako ostatní admin stránky).
 * Zobrazuje: identifikátory (maskované, reveal on-click), kompletní
 * historii incidentů (VŠECHNY stavy, ne jen frontové — moderace tohle
 * agregovaně přes více nahlášení jednoho subjektu nikde neukazuje),
 * trust score, viditelnost, claim status.
 *
 * Akce: skrýt/odkrýt (SubjectVisibilityActions), nevratně smazat
 * s kaskádou (DeleteSubjectDialog) — obojí přes POST /api/admin/subjekty.
 */

import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { ArrowLeft, Flag } from 'lucide-react'
import Link from 'next/link'
import {
  CATEGORY_LABELS,
  RESOLUTION_STATUS_LABELS,
  type IncidentCategory,
  type IncidentResolutionStatus,
  type IncidentStatus,
} from '@/types/databaze'
import type { DatabazeDatabase } from '../../../api/databaze/_lib/database'
import { getAdminIdentity } from '../../../api/admin/_lib/auth'
import { RevealIdentifier } from '../../moderace/_components/RevealIdentifier'
import { SubjectVisibilityActions } from '../_components/SubjectVisibilityActions'
import { DeleteSubjectDialog } from '../_components/DeleteSubjectDialog'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Detail subjektu — Neklikni.cz',
  robots: { index: false, follow: false },
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const STATUS_LABEL: Record<IncidentStatus, { text: string; cls: string }> = {
  pending: { text: 'Čeká', cls: 'bg-amber-500/15 text-amber-300' },
  pending_merge_review: { text: 'Review sloučení', cls: 'bg-amber-500/15 text-amber-300' },
  ai_reviewed: { text: 'AI posouzeno', cls: 'bg-blue-500/15 text-blue-300' },
  notified: { text: 'Notifikováno', cls: 'bg-emerald-500/15 text-emerald-300' },
  published: { text: 'Zveřejněno', cls: 'bg-emerald-500/15 text-emerald-300' },
  objected: { text: 'Napadeno', cls: 'bg-orange-500/15 text-orange-300' },
  removed: { text: 'Odstraněno', cls: 'bg-red-500/15 text-red-300' },
  needs_more_info: { text: 'Doplnit', cls: 'bg-blue-500/15 text-blue-300' },
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString('cs-CZ', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function Field({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-0.5">{label}</p>
      <p className={`text-sm text-slate-100 truncate ${mono ? 'font-mono' : 'font-medium'}`}>{value}</p>
    </div>
  )
}

export default async function SubjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const admin = await getAdminIdentity()
  if (!admin) notFound()

  const { id: subjectId } = await params
  if (!UUID_RE.test(subjectId)) notFound()

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100 p-8">
        <p className="text-red-400">Server misconfigured — chybí Supabase env.</p>
      </main>
    )
  }
  const sb = createClient<DatabazeDatabase>(url, key)

  const { data: subject, error: subjectErr } = await sb
    .from('subjects')
    .select('*')
    .eq('id', subjectId)
    .maybeSingle()

  if (subjectErr || !subject) notFound()

  const [identifiersRes, incidentsRes] = await Promise.all([
    sb
      .from('subject_identifiers')
      .select('id, type, value_masked, verified, created_at')
      .eq('subject_id', subjectId)
      .order('created_at', { ascending: true }),
    sb
      .from('incidents')
      .select(
        'id, created_at, incident_date, category, category_other, severity, amount_czk, description, status, resolution_status, resolution_note, removed_reason, admin_note, public_at',
      )
      .eq('subject_id', subjectId)
      .order('created_at', { ascending: false }),
  ])

  const identifiers = identifiersRes.data ?? []
  const incidents = (incidentsRes.data ?? []) as Array<{
    id: string
    created_at: string
    incident_date: string
    category: IncidentCategory
    category_other: string | null
    severity: string
    amount_czk: number
    description: string
    status: IncidentStatus
    resolution_status: IncidentResolutionStatus
    resolution_note: string | null
    removed_reason: string | null
    admin_note: string | null
    public_at: string | null
  }>

  const isClaimed =
    subject.claimed_by !== null &&
    subject.claim_paid_until !== null &&
    new Date(subject.claim_paid_until) > new Date()

  // Hodnota, kterou musí admin přesně opsat pro smazání — stejná logika
  // jako server (první identifikátor, fallback na display_name_masked).
  const deleteConfirmValue = identifiers[0]?.value_masked ?? subject.display_name_masked ?? subjectId

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-4xl px-4 pt-24 pb-10 sm:pb-14">
        <div className="flex items-center gap-3 mb-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-300">
            <Flag size={12} /> Admin
          </div>
          <Link
            href="/admin/subjekty"
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-800/50 px-3 py-1 text-xs font-medium text-slate-300 hover:border-blue-500/30 hover:text-blue-200 transition-colors"
          >
            <ArrowLeft size={11} /> Zpět na seznam
          </Link>
        </div>

        <header className="mb-8">
          <h1 className="text-2xl font-black tracking-tight font-mono break-all">
            {subject.display_name_masked ?? subjectId}
          </h1>
          <p className="mt-1 text-xs text-slate-500 font-mono">{subjectId}</p>
        </header>

        {/* Základní informace */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 mb-5">
          <h2 className="text-[11px] font-black uppercase tracking-wider text-slate-500 mb-4">
            Základní informace
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <Field label="Trust score" value={String(subject.trust_score)} />
            <Field label="Viditelnost" value={subject.visibility_status} />
            <Field label="Claim" value={isClaimed ? 'Aktivně reaguje' : 'Bez vyjádření'} />
            <Field label="Vytvořen" value={formatDate(subject.created_at)} />
            <Field label="Aktualizován" value={formatDate(subject.updated_at)} />
          </div>
        </section>

        {/* Identifikátory */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 mb-5">
          <h2 className="text-[11px] font-black uppercase tracking-wider text-slate-500 mb-4">
            Identifikátory ({identifiers.length})
          </h2>
          <div className="flex flex-wrap gap-2">
            {identifiers.length === 0 ? (
              <span className="text-xs text-slate-500">—</span>
            ) : (
              identifiers.map((id) => (
                <RevealIdentifier key={id.id} identifierId={id.id} type={id.type} valueMasked={id.value_masked} />
              ))
            )}
          </div>
        </section>

        {/* Akce */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 mb-5">
          <h2 className="text-[11px] font-black uppercase tracking-wider text-slate-500 mb-4">
            Akce
          </h2>
          <div className="flex flex-wrap gap-3">
            <SubjectVisibilityActions subjectId={subjectId} visibilityStatus={subject.visibility_status} />
          </div>
          <div className="mt-3">
            <DeleteSubjectDialog subjectId={subjectId} confirmValue={deleteConfirmValue} />
          </div>
        </section>

        {/* Historie incidentů */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900/50 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-800">
            <h2 className="text-[11px] font-black uppercase tracking-wider text-slate-500">
              Historie nahlášení ({incidents.length})
            </h2>
          </div>

          {incidents.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-slate-500">Žádná nahlášení.</p>
          ) : (
            <ul className="divide-y divide-slate-800/60">
              {incidents.map((inc) => {
                const status = STATUS_LABEL[inc.status] ?? { text: inc.status, cls: 'bg-slate-700/30 text-slate-400' }
                return (
                  <li key={inc.id} className="p-5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs text-slate-500">
                        {formatDate(inc.created_at)} · {CATEGORY_LABELS[inc.category] ?? inc.category}
                        {inc.category_other ? ` (${inc.category_other})` : ''} · {inc.amount_czk.toLocaleString('cs-CZ')} Kč
                      </p>
                      <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${status.cls}`}>{status.text}</span>
                    </div>
                    <p className="mt-2 whitespace-pre-wrap text-sm text-slate-200">{inc.description}</p>
                    {inc.resolution_status !== 'active' && (
                      <p className="mt-2 text-xs text-slate-400">
                        Vyřešení: {RESOLUTION_STATUS_LABELS[inc.resolution_status] ?? inc.resolution_status}
                        {inc.resolution_note ? ` — ${inc.resolution_note}` : ''}
                      </p>
                    )}
                    {inc.removed_reason && (
                      <p className="mt-2 text-xs text-red-300">Důvod zamítnutí: {inc.removed_reason}</p>
                    )}
                    {inc.admin_note && (
                      <p className="mt-2 text-xs text-orange-300">Admin poznámka: {inc.admin_note}</p>
                    )}
                    <Link
                      href={`/admin/incident/${inc.id}`}
                      className="mt-2 inline-block text-xs text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      → Detail incidentu
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      </div>
    </main>
  )
}
