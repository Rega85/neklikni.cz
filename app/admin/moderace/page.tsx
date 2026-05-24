/**
 * /admin/moderace — fronta nahlášení čekajících na schválení.
 *
 * Přístup: jen pro adminy (řádek v `public.app_admins`). Non-admin (i ne-
 * přihlášený) dostane 404 — nechceme prozradit, že stránka existuje.
 *
 * Co dělá: vypíše incidenty se statusem 'ai_reviewed' nebo 'pending',
 * každý s tlačítky Schválit / Zamítnout (form POST na /api/admin/moderace).
 *
 * NEJE to plný admin panel — žádná správa uživatelů, plateb, statistik.
 */

import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { AlertTriangle, FileText, Flag } from 'lucide-react'
import {
  CATEGORY_LABELS,
  PLATFORM_LABELS,
  SEVERITY_LABELS,
  type IncidentCategory,
  type IncidentPlatform,
  type IncidentSeverity,
  type IncidentStatus,
} from '@/types/databaze'
import type { DatabazeDatabase } from '../../api/databaze/_lib/database'
import { getAdminIdentity } from '../../api/admin/_lib/auth'
import { RevealIdentifier } from './_components/RevealIdentifier'
import { ModerationActions } from './_components/ModerationActions'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Moderační fronta — Neklikni.cz',
  robots: { index: false, follow: false },
}

const QUEUE_STATUSES: IncidentStatus[] = ['ai_reviewed', 'pending', 'needs_more_info']

interface QueueRow {
  id: string
  created_at: string
  incident_date: string
  category: IncidentCategory
  category_other: string | null
  platform: IncidentPlatform
  platform_other: string | null
  severity: IncidentSeverity
  amount_czk: number
  description: string
  status: 'ai_reviewed' | 'pending' | 'needs_more_info'
  subject_id: string
  ai_confidence_score: number | null
  ai_summary: string | null
  ai_red_flags: unknown
  admin_note: string | null
  reporter_id: string
}

function formatDate(iso: string): string {
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

function parseRedFlags(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.filter((x): x is string => typeof x === 'string')
  return []
}

export default async function ModeracePage() {
  const admin = await getAdminIdentity()
  if (!admin) notFound()

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

  const { data: incidents, error } = await sb
    .from('incidents')
    .select(
      'id, created_at, incident_date, category, category_other, platform, platform_other, severity, amount_czk, description, status, subject_id, ai_confidence_score, ai_summary, ai_red_flags, admin_note, reporter_id',
    )
    .in('status', QUEUE_STATUSES)
    .order('created_at', { ascending: false })
    .limit(100)

  const queue: QueueRow[] = (incidents as QueueRow[] | null) ?? []

  const subjectIds = [...new Set(queue.map((r) => r.subject_id))]
  const incidentIds = queue.map((r) => r.id)

  const [identifiersRes, evidenceRes] = await Promise.all([
    subjectIds.length > 0
      ? sb
          .from('subject_identifiers')
          .select('id, subject_id, type, value_masked')
          .in('subject_id', subjectIds)
      : Promise.resolve({ data: [], error: null }),
    incidentIds.length > 0
      ? sb
          .from('evidence')
          .select('incident_id')
          .in('incident_id', incidentIds)
      : Promise.resolve({ data: [], error: null }),
  ])

  const identifiersBySubject = new Map<string, Array<{ id: string; type: string; value_masked: string }>>()
  for (const row of (identifiersRes.data as Array<{ id: string; subject_id: string; type: string; value_masked: string }> | null) ?? []) {
    const list = identifiersBySubject.get(row.subject_id) ?? []
    list.push({ id: row.id, type: row.type, value_masked: row.value_masked })
    identifiersBySubject.set(row.subject_id, list)
  }

  const evidenceCountByIncident = new Map<string, number>()
  for (const row of (evidenceRes.data as Array<{ incident_id: string }> | null) ?? []) {
    evidenceCountByIncident.set(row.incident_id, (evidenceCountByIncident.get(row.incident_id) ?? 0) + 1)
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-5xl px-4 py-10 sm:py-14">
        <header className="mb-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-500/10 px-3 py-1 text-xs font-medium text-purple-300">
            <Flag size={12} /> Admin
          </div>
          <h1 className="mt-3 text-3xl font-black tracking-tight">Moderační fronta</h1>
          <p className="mt-2 text-sm text-slate-400">
            Přihlášen jako {admin.email ?? admin.userId}. Čeká celkem {queue.length} nahlášení.
          </p>
          {error && (
            <p className="mt-3 text-sm text-red-400">DB error: {error.message}</p>
          )}
        </header>

        {queue.length === 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-8 text-center text-slate-400">
            Fronta je prázdná — nic ke schválení.
          </div>
        ) : (
          <ul className="space-y-4">
            {queue.map((row) => {
              const idents = identifiersBySubject.get(row.subject_id) ?? []
              const redFlags = parseRedFlags(row.ai_red_flags)
              const evidenceCount = evidenceCountByIncident.get(row.id) ?? 0
              return (
                <li key={row.id} className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="text-xs text-slate-500">
                        ID <span className="font-mono text-slate-400">{row.id}</span>
                      </p>
                      <p className="text-xs text-slate-500">
                        Přijato {formatDate(row.created_at)} · Incident {row.incident_date}
                      </p>
                    </div>
                    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider ${
                      row.status === 'pending'
                        ? 'bg-amber-500/10 text-amber-300 ring-1 ring-amber-500/30'
                        : row.status === 'needs_more_info'
                        ? 'bg-orange-500/10 text-orange-300 ring-1 ring-orange-500/30'
                        : 'bg-blue-500/10 text-blue-300 ring-1 ring-blue-500/30'
                    }`}>{row.status}</span>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <Field label="Kategorie" value={CATEGORY_LABELS[row.category] ?? row.category} />
                    <Field label="Platforma" value={PLATFORM_LABELS[row.platform] ?? row.platform} />
                    <Field label="Závažnost" value={SEVERITY_LABELS[row.severity] ?? row.severity} />
                    <Field
                      label="AI confidence"
                      value={row.ai_confidence_score !== null ? `${row.ai_confidence_score}/100` : '—'}
                    />
                    <Field label="Částka" value={`${row.amount_czk.toLocaleString('cs-CZ')} Kč`} />
                    <Field label="Důkazy" value={String(evidenceCount)} />
                  </div>

                  <div className="mt-4">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Subjekt (identifikátory)</p>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {idents.length === 0 ? (
                        <span className="text-xs text-slate-500">—</span>
                      ) : (
                        idents.map((id) => (
                          <RevealIdentifier
                            key={id.id}
                            identifierId={id.id}
                            incidentId={row.id}
                            type={id.type}
                            valueMasked={id.value_masked}
                          />
                        ))
                      )}
                    </div>
                  </div>

                  <div className="mt-4">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Popis nahlašovatele</p>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-slate-200">{row.description}</p>
                  </div>

                  {row.ai_summary && (
                    <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/40 p-3">
                      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                        <FileText size={11} /> AI shrnutí
                      </p>
                      <p className="mt-1 text-sm text-slate-300">{row.ai_summary}</p>
                    </div>
                  )}

                  {redFlags.length > 0 && (
                    <div className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3">
                      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-amber-300">
                        <AlertTriangle size={11} /> AI red flags
                      </p>
                      <ul className="mt-1 space-y-1 text-sm text-amber-200/90">
                        {redFlags.map((f, i) => (
                          <li key={i}>· {f}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {row.admin_note && (
                    <div className="mt-3 rounded-xl border border-orange-500/30 bg-orange-500/5 p-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-orange-300">Předchozí admin poznámka</p>
                      <p className="mt-1 whitespace-pre-wrap text-sm text-orange-100/90">{row.admin_note}</p>
                    </div>
                  )}

                  <ModerationActions incidentId={row.id} />
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </main>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-0.5 text-sm font-medium text-slate-100">{value}</p>
    </div>
  )
}
