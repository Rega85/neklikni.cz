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
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { AlertTriangle, FileText, Flag, Paperclip } from 'lucide-react'
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
const EVIDENCE_URL_EXPIRY_SECONDS = 600 // 10 min — admin si stihne projít a obnovit přes reload

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

interface EvidenceItem {
  id: string
  file_path: string
  mime_type: string
  file_size_bytes: number
  signedUrl: string | null
}

function isImageMime(mime: string): boolean {
  return mime.startsWith('image/')
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} kB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

function fileBaseName(p: string): string {
  const parts = p.split('/')
  return parts[parts.length - 1] || p
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
          .select('id, incident_id, file_path, mime_type, file_size_bytes, deleted_at')
          .in('incident_id', incidentIds)
          .is('deleted_at', null)
      : Promise.resolve({ data: [], error: null }),
  ])

  const identifiersBySubject = new Map<string, Array<{ id: string; type: string; value_masked: string }>>()
  for (const row of (identifiersRes.data as Array<{ id: string; subject_id: string; type: string; value_masked: string }> | null) ?? []) {
    const list = identifiersBySubject.get(row.subject_id) ?? []
    list.push({ id: row.id, type: row.type, value_masked: row.value_masked })
    identifiersBySubject.set(row.subject_id, list)
  }

  const evidenceRows = (evidenceRes.data as Array<{
    id: string
    incident_id: string
    file_path: string
    mime_type: string
    file_size_bytes: number
  }> | null) ?? []

  // Vygeneruj signed URL pro každý soubor přes service_role. Krátká
  // expirace + bucket zůstává private = link platí jen po dobu této session,
  // nelze ho trvale sdílet.
  const signedUrlByPath = new Map<string, string | null>()
  if (evidenceRows.length > 0) {
    const paths = evidenceRows.map((r) => r.file_path)
    const { data: signed, error: signedErr } = await sb.storage
      .from('evidence')
      .createSignedUrls(paths, EVIDENCE_URL_EXPIRY_SECONDS)
    if (signedErr) {
      console.error('moderace: createSignedUrls failed', signedErr)
    }
    for (const item of signed ?? []) {
      if (item && item.path) {
        signedUrlByPath.set(item.path, item.error ? null : item.signedUrl)
      }
    }
  }

  const evidenceByIncident = new Map<string, EvidenceItem[]>()
  for (const row of evidenceRows) {
    const list = evidenceByIncident.get(row.incident_id) ?? []
    list.push({
      id: row.id,
      file_path: row.file_path,
      mime_type: row.mime_type,
      file_size_bytes: row.file_size_bytes,
      signedUrl: signedUrlByPath.get(row.file_path) ?? null,
    })
    evidenceByIncident.set(row.incident_id, list)
  }

  // Audit log: každý incident, ke kterému byly vygenerovány signed URL =
  // admin reálně viděl důkazy. Per-incident řádek, aby šlo dohledat kdo
  // a kdy se na konkrétní incident díval.
  if (evidenceByIncident.size > 0) {
    const headerStore = await headers()
    const ip = headerStore.get('x-forwarded-for')?.split(',')[0]?.trim() || null
    const userAgent = headerStore.get('user-agent') || null
    const auditRows = [...evidenceByIncident.entries()].map(([incidentId, items]) => ({
      actor_type: 'admin' as const,
      actor_id: admin.userId,
      action: 'view_evidence' as const,
      target_type: 'incident' as const,
      target_id: incidentId,
      ip_address: ip,
      user_agent: userAgent,
      metadata: {
        phase: 'moderation_render',
        evidence_count: items.length,
        evidence_ids: items.map((i) => i.id),
      },
    }))
    try {
      await sb.from('audit_log').insert(auditRows)
    } catch (err) {
      console.error('moderace: audit_log insert failed', err)
    }
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
              const evidenceItems = evidenceByIncident.get(row.id) ?? []
              const evidenceCount = evidenceItems.length
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

                  {evidenceItems.length > 0 && (
                    <div className="mt-4">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                        Důkazy ({evidenceCount}) <span className="text-slate-600 normal-case font-normal">· odkazy platné cca {Math.round(EVIDENCE_URL_EXPIRY_SECONDS / 60)} min</span>
                      </p>
                      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                        {evidenceItems.map((ev) => {
                          if (!ev.signedUrl) {
                            return (
                              <div
                                key={ev.id}
                                className="flex flex-col items-center justify-center gap-1 rounded-lg border border-red-500/30 bg-red-500/5 p-3 text-center text-[11px] text-red-300"
                              >
                                <Paperclip size={14} />
                                <span>URL se nepodařilo vygenerovat</span>
                                <span className="font-mono text-slate-500 text-[10px]">{fileBaseName(ev.file_path)}</span>
                              </div>
                            )
                          }
                          if (isImageMime(ev.mime_type)) {
                            return (
                              <a
                                key={ev.id}
                                href={ev.signedUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                title={`${fileBaseName(ev.file_path)} · ${formatBytes(ev.file_size_bytes)}`}
                                className="group relative block overflow-hidden rounded-lg border border-slate-700 bg-slate-950/60 hover:border-purple-500/50 transition-colors"
                              >
                                <img
                                  src={ev.signedUrl}
                                  alt="Důkaz"
                                  className="aspect-square w-full object-cover"
                                />
                                <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-2 py-1 text-[10px] text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity">
                                  {formatBytes(ev.file_size_bytes)} · klikni pro zvětšení
                                </span>
                              </a>
                            )
                          }
                          return (
                            <a
                              key={ev.id}
                              href={ev.signedUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border border-slate-700 bg-slate-950/60 hover:border-purple-500/50 hover:bg-slate-900 transition-colors p-2 text-center"
                            >
                              <FileText size={22} className="text-purple-300" />
                              <span className="text-[11px] font-semibold text-slate-200">{ev.mime_type.split('/')[1]?.toUpperCase() ?? 'Soubor'}</span>
                              <span className="text-[10px] text-slate-500">{formatBytes(ev.file_size_bytes)}</span>
                            </a>
                          )
                        })}
                      </div>
                    </div>
                  )}

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
