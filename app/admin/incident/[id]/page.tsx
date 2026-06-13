/**
 * /admin/incident/[id] — detail incidentu v libovolném stavu.
 *
 * Přístup: jen pro adminy (stejný guard jako ostatní admin stránky).
 * Na rozdíl od /admin/moderace tato stránka zobrazí incident v jakémkoli
 * stavu (published, removed, pending, …). ModerationActions se zobrazí
 * jen pokud je incident stále ve frontě (pending/ai_reviewed/needs_more_info).
 *
 * Bezpečnost: důkazy jen přes signed URL (10 min), každý přístup k důkazům
 * zapíše audit_log stejně jako moderace.
 */

import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { AlertTriangle, ArrowLeft, FileText, Flag, Paperclip } from 'lucide-react'
import Link from 'next/link'
import {
  CATEGORY_LABELS,
  PLATFORM_LABELS,
  SEVERITY_LABELS,
  type IncidentCategory,
  type IncidentPlatform,
  type IncidentSeverity,
  type IncidentStatus,
} from '@/types/databaze'
import { getAdminIdentity } from '../../../api/admin/_lib/auth'
import { RevealIdentifier } from '../../moderace/_components/RevealIdentifier'
import { ModerationActions } from '../../moderace/_components/ModerationActions'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Detail nahlášení — Neklikni.cz',
  robots: { index: false, follow: false },
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const EVIDENCE_URL_EXPIRY_SECONDS = 600 // 10 min

const QUEUE_STATUSES: IncidentStatus[] = ['ai_reviewed', 'pending', 'needs_more_info']

const STATUS_STYLE: Record<string, string> = {
  pending:              'bg-amber-500/10 text-amber-300 ring-1 ring-amber-500/30',
  needs_more_info:      'bg-orange-500/10 text-orange-300 ring-1 ring-orange-500/30',
  ai_reviewed:          'bg-blue-500/10 text-blue-300 ring-1 ring-blue-500/30',
  pending_merge_review: 'bg-amber-500/10 text-amber-300 ring-1 ring-amber-500/30',
  notified:             'bg-sky-500/10 text-sky-300 ring-1 ring-sky-500/30',
  published:            'bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/30',
  objected:             'bg-blue-500/10 text-blue-300 ring-1 ring-blue-500/30',
  removed:              'bg-red-500/10 text-red-300 ring-1 ring-red-500/30',
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString('cs-CZ', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
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

function isImageMime(mime: string): boolean {
  return mime.startsWith('image/')
}

function parseRedFlags(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.filter((x): x is string => typeof x === 'string')
  return []
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-0.5 text-sm font-medium text-slate-100">{value}</p>
    </div>
  )
}

export default async function IncidentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const admin = await getAdminIdentity()
  if (!admin) notFound()

  const { id: incidentId } = await params
  if (!UUID_RE.test(incidentId)) notFound()

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100 p-8">
        <p className="text-red-400">Server misconfigured — chybí Supabase env.</p>
      </main>
    )
  }

  // Untyped client — admin_note a další sloupce nejsou v DatabazeDatabase
  const sb = createClient(url, key)

  // Fetch the incident (any status)
  const { data: incidentRaw, error: incidentErr } = await sb
    .from('incidents')
    .select(
      'id, created_at, incident_date, category, category_other, platform, platform_other, severity, amount_czk, description, status, subject_id, reporter_id, ai_confidence_score, ai_summary, ai_red_flags, admin_note',
    )
    .eq('id', incidentId)
    .maybeSingle()

  if (incidentErr) {
    console.error('incident detail: fetch failed', incidentErr)
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100 p-8">
        <p className="text-red-400">DB chyba: {incidentErr.message}</p>
      </main>
    )
  }
  if (!incidentRaw) notFound()

  const incident = incidentRaw as {
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
    status: IncidentStatus
    subject_id: string
    reporter_id: string
    ai_confidence_score: number | null
    ai_summary: string | null
    ai_red_flags: unknown
    admin_note: string | null
  }

  const isInQueue = (QUEUE_STATUSES as string[]).includes(incident.status)
  const redFlags = parseRedFlags(incident.ai_red_flags)

  // Identifiers for the subject
  const { data: identifiersRaw } = await sb
    .from('subject_identifiers')
    .select('id, type, value_masked')
    .eq('subject_id', incident.subject_id)

  const identifiers = (identifiersRaw ?? []) as Array<{ id: string; type: string; value_masked: string }>

  // Evidence with signed URLs
  const { data: evidenceRaw } = await sb
    .from('evidence')
    .select('id, file_path, mime_type, file_size_bytes')
    .eq('incident_id', incidentId)
    .is('deleted_at', null)

  const rawEvidence = (evidenceRaw ?? []) as Array<{
    id: string; file_path: string; mime_type: string; file_size_bytes: number
  }>

  interface EvidenceItem {
    id: string; file_path: string; mime_type: string; file_size_bytes: number; signedUrl: string | null
  }

  let evidenceItems: EvidenceItem[] = []

  if (rawEvidence.length > 0) {
    const paths = rawEvidence.map((e) => e.file_path)
    const { data: signed, error: signedErr } = await sb.storage
      .from('evidence')
      .createSignedUrls(paths, EVIDENCE_URL_EXPIRY_SECONDS)

    if (signedErr) {
      console.error('incident detail: createSignedUrls failed', signedErr)
    }

    const signedMap = new Map<string, string | null>()
    for (const item of signed ?? []) {
      if (item?.path) signedMap.set(item.path, item.error ? null : item.signedUrl)
    }

    evidenceItems = rawEvidence.map((e) => ({
      ...e,
      signedUrl: signedMap.get(e.file_path) ?? null,
    }))

    // Audit log — admin viděl důkazy
    try {
      const headerStore = await headers()
      await sb.from('audit_log').insert({
        actor_type: 'admin',
        actor_id: admin.userId,
        action: 'view_evidence',
        target_type: 'incident',
        target_id: incidentId,
        ip_address: headerStore.get('x-forwarded-for')?.split(',')[0]?.trim() || null,
        user_agent: headerStore.get('user-agent') || null,
        metadata: {
          phase: 'incident_detail_render',
          evidence_count: evidenceItems.length,
          evidence_ids: evidenceItems.map((e) => e.id),
        },
      })
    } catch (err) {
      console.error('incident detail: audit_log insert failed', err)
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-4xl px-4 pt-24 pb-10 sm:pb-14">

        {/* Navigace */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-300">
            <Flag size={12} /> Admin
          </div>
          <Link
            href={`/admin/uzivatele/${incident.reporter_id}`}
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-800/50 px-3 py-1 text-xs font-medium text-slate-300 hover:border-blue-500/30 hover:text-blue-200 transition-colors"
          >
            <ArrowLeft size={11} /> Profil uživatele
          </Link>
          <Link
            href="/admin/moderace"
            className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-800/50 px-3 py-1 text-xs font-medium text-slate-300 hover:border-blue-500/30 hover:text-blue-200 transition-colors"
          >
            Moderační fronta
          </Link>
        </div>

        {/* Záhlaví */}
        <header className="mb-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <p className="text-xs text-slate-500">
                ID <span className="font-mono text-slate-400">{incident.id}</span>
              </p>
              <p className="text-xs text-slate-500">
                Přijato {formatDate(incident.created_at)} · Incident {incident.incident_date}
              </p>
            </div>
            <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider ${STATUS_STYLE[incident.status] ?? 'bg-slate-700/30 text-slate-400'}`}>
              {incident.status}
            </span>
          </div>
        </header>

        {/* Metadata */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-5">
          <Field label="Kategorie"    value={CATEGORY_LABELS[incident.category] ?? incident.category} />
          <Field label="Platforma"    value={PLATFORM_LABELS[incident.platform] ?? incident.platform} />
          <Field label="Závažnost"    value={SEVERITY_LABELS[incident.severity] ?? incident.severity} />
          <Field label="AI confidence" value={incident.ai_confidence_score !== null ? `${incident.ai_confidence_score}/100` : '—'} />
          <Field label="Částka"       value={`${incident.amount_czk.toLocaleString('cs-CZ')} Kč`} />
          <Field label="Důkazy"       value={String(evidenceItems.length)} />
        </div>

        {/* Identifikátory subjektu */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5 mb-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-3">
            Subjekt (identifikátory)
          </p>
          <div className="flex flex-wrap gap-2">
            {identifiers.length === 0 ? (
              <span className="text-xs text-slate-500">—</span>
            ) : (
              identifiers.map((id) => (
                <RevealIdentifier
                  key={id.id}
                  identifierId={id.id}
                  incidentId={incidentId}
                  type={id.type}
                  valueMasked={id.value_masked}
                />
              ))
            )}
          </div>
        </div>

        {/* Důkazy */}
        {evidenceItems.length > 0 && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5 mb-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-3">
              Důkazy ({evidenceItems.length})
              <span className="text-slate-600 normal-case font-normal ml-1">
                · signed URL platná cca {Math.round(EVIDENCE_URL_EXPIRY_SECONDS / 60)} min
              </span>
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
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
                      className="group relative block overflow-hidden rounded-lg border border-slate-700 bg-slate-950/60 hover:border-blue-500/50 transition-colors"
                    >
                      <img src={ev.signedUrl} alt="Důkaz" className="aspect-square w-full object-cover" />
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
                    className="flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border border-slate-700 bg-slate-950/60 hover:border-blue-500/50 hover:bg-slate-900 transition-colors p-2 text-center"
                  >
                    <FileText size={22} className="text-blue-300" />
                    <span className="text-[11px] font-semibold text-slate-200">
                      {ev.mime_type.split('/')[1]?.toUpperCase() ?? 'Soubor'}
                    </span>
                    <span className="text-[10px] text-slate-500">{formatBytes(ev.file_size_bytes)}</span>
                  </a>
                )
              })}
            </div>
          </div>
        )}

        {/* Popis */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5 mb-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2">Popis nahlašovatele</p>
          <p className="whitespace-pre-wrap text-sm text-slate-200 leading-relaxed">{incident.description}</p>
        </div>

        {/* AI shrnutí + red flags */}
        {incident.ai_summary && (
          <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4 mb-4">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2">
              <FileText size={11} /> AI shrnutí
            </p>
            <p className="text-sm text-slate-300">{incident.ai_summary}</p>
          </div>
        )}

        {redFlags.length > 0 && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 mb-4">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-amber-300 mb-2">
              <AlertTriangle size={11} /> AI red flags
            </p>
            <ul className="space-y-1 text-sm text-amber-200/90">
              {redFlags.map((f, i) => <li key={i}>· {f}</li>)}
            </ul>
          </div>
        )}

        {incident.admin_note && (
          <div className="rounded-xl border border-orange-500/30 bg-orange-500/5 p-4 mb-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-orange-300 mb-1">Admin poznámka</p>
            <p className="whitespace-pre-wrap text-sm text-orange-100/90">{incident.admin_note}</p>
          </div>
        )}

        {/* Moderační akce — jen pokud je incident ve frontě */}
        {isInQueue && (
          <div className="rounded-2xl border border-slate-700 bg-slate-900/50 p-5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-3">Moderační akce</p>
            <ModerationActions incidentId={incidentId} />
          </div>
        )}

        {/* Stav pro zpracované incidenty */}
        {!isInQueue && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/30 p-5 text-center text-sm text-slate-500">
            Incident byl zpracován — stav: <span className="font-bold text-slate-300">{incident.status}</span>.
            Moderační akce nejsou dostupné.
          </div>
        )}

      </div>
    </main>
  )
}
