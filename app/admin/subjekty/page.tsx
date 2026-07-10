/**
 * /admin/subjekty — seznam nahlášených subjektů (GDPR takedown nástroj).
 *
 * Přístup: jen pro adminy (stejný guard jako /admin/moderace,
 * /admin/uzivatele). Non-admin dostane 404.
 *
 * Vyhledávání (`?q=`): stejná detekce/normalizace/hash jako veřejné
 * /api/databaze/search, ale bez rate limitu (admin) — při přesné shodě
 * rovnou přesměruje na detail.
 *
 * Filtr `?filter=orphaned`: subjekty bez jediného kvalifikujícího
 * incidentu (isQualifyingIncident) — po nasazení
 * supabase/migrations/20260710_subject_visibility_trigger.sql by tohle
 * měla být prázdná množina; pokud se tu něco objeví, je to signál, že
 * trigger něco nepokryl (např. ruční SQL zásah mimo appku).
 *
 * TODO (mimo Fázi 1): stránkování při větším objemu dat (dnes limit 200,
 * žádný UI page-picker); bulk akce.
 */

import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { Flag, Search, ShieldAlert } from 'lucide-react'
import Link from 'next/link'
import type { IdentifierType, IncidentStatus, SubjectVisibility } from '@/types/databaze'
import { detectIdentifierType, hashIdentifier, normalizeByType, normalizePhoneVariants } from '@/utils/databaze/identifiers'
import type { DatabazeDatabase } from '../../api/databaze/_lib/database'
import { getAdminIdentity } from '../../api/admin/_lib/auth'
import { isQualifyingIncident } from '../../api/databaze/_lib/crossReference'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Subjekty — Neklikni.cz',
  robots: { index: false, follow: false },
}

const LIST_LIMIT = 200

const VISIBILITY_LABEL: Record<SubjectVisibility, { text: string; cls: string }> = {
  active: { text: 'Aktivní', cls: 'bg-emerald-500/10 text-emerald-300 ring-emerald-500/20' },
  hidden_objection: { text: 'Skryto (admin)', cls: 'bg-amber-500/15 text-amber-300 ring-amber-500/30' },
  removed: { text: 'Odstraněno', cls: 'bg-slate-700/30 text-slate-400 ring-slate-600/30' },
  pending: { text: 'Čeká', cls: 'bg-blue-500/15 text-blue-300 ring-blue-500/30' },
}

const STATUS_BADGE_CLS: Partial<Record<IncidentStatus, string>> = {
  published: 'bg-emerald-500/15 text-emerald-300',
  notified: 'bg-emerald-500/15 text-emerald-300',
  removed: 'bg-slate-700/40 text-slate-400',
  pending: 'bg-amber-500/15 text-amber-300',
  ai_reviewed: 'bg-blue-500/15 text-blue-300',
  needs_more_info: 'bg-blue-500/15 text-blue-300',
  objected: 'bg-orange-500/15 text-orange-300',
  pending_merge_review: 'bg-amber-500/15 text-amber-300',
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('cs-CZ', { year: 'numeric', month: '2-digit', day: '2-digit' })
}

interface SubjectListRow {
  id: string
  display_name_masked: string | null
  trust_score: number
  visibility_status: SubjectVisibility
  created_at: string
}

export default async function SubjektyPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; filter?: string }>
}) {
  const admin = await getAdminIdentity()
  if (!admin) notFound()

  const { q, filter } = await searchParams

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

  // ── Vyhledávání podle identifikátoru → přímý redirect na detail ──────
  let searchError: string | null = null
  const query = q?.trim()
  if (query) {
    const detected = detectIdentifierType(query)
    if (!detected) {
      searchError = 'Formát nelze rozpoznat.'
    } else {
      const hashes: string[] =
        detected === 'phone'
          ? await Promise.all(normalizePhoneVariants(query).map(hashIdentifier))
          : await (async () => {
              const norm = normalizeByType(detected as IdentifierType, query)
              return norm ? [await hashIdentifier(norm)] : []
            })()

      if (hashes.length === 0) {
        searchError = `Neplatný formát.`
      } else {
        const { data: idRow } = await sb
          .from('subject_identifiers')
          .select('subject_id')
          .in('value_hash', hashes)
          .limit(1)
          .maybeSingle()
        if (idRow) {
          redirect(`/admin/subjekty/${idRow.subject_id}`)
        }
        searchError = 'Žádný subjekt s tímhle identifikátorem nenalezen.'
      }
    }
  }

  // ── Seznam subjektů + agregace ────────────────────────────────────────
  const { data: subjectsData, error: subjErr } = await sb
    .from('subjects')
    .select('id, display_name_masked, trust_score, visibility_status, created_at')
    .order('created_at', { ascending: false })
    .limit(LIST_LIMIT)

  const subjects = (subjectsData ?? []) as SubjectListRow[]
  const subjectIds = subjects.map((s) => s.id)

  const [identifiersRes, incidentsRes] = await Promise.all([
    subjectIds.length > 0
      ? sb.from('subject_identifiers').select('subject_id, type, value_masked').in('subject_id', subjectIds)
      : Promise.resolve({ data: [] as Array<{ subject_id: string; type: IdentifierType; value_masked: string }> }),
    subjectIds.length > 0
      ? sb.from('incidents').select('subject_id, status, resolution_status').in('subject_id', subjectIds)
      : Promise.resolve({ data: [] as Array<{ subject_id: string; status: IncidentStatus; resolution_status: string | null }> }),
  ])

  const identifiersBySubject = new Map<string, Array<{ type: IdentifierType; value_masked: string }>>()
  for (const row of identifiersRes.data ?? []) {
    const list = identifiersBySubject.get(row.subject_id) ?? []
    list.push({ type: row.type, value_masked: row.value_masked })
    identifiersBySubject.set(row.subject_id, list)
  }

  const statusCountsBySubject = new Map<string, Map<IncidentStatus, number>>()
  const qualifyingCountBySubject = new Map<string, number>()
  for (const row of incidentsRes.data ?? []) {
    const counts = statusCountsBySubject.get(row.subject_id) ?? new Map<IncidentStatus, number>()
    counts.set(row.status, (counts.get(row.status) ?? 0) + 1)
    statusCountsBySubject.set(row.subject_id, counts)

    if (isQualifyingIncident(row)) {
      qualifyingCountBySubject.set(row.subject_id, (qualifyingCountBySubject.get(row.subject_id) ?? 0) + 1)
    }
  }

  const showOrphanedOnly = filter === 'orphaned'
  const visibleSubjects = showOrphanedOnly
    ? subjects.filter((s) => (qualifyingCountBySubject.get(s.id) ?? 0) === 0)
    : subjects

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-6xl px-4 pt-24 pb-10 sm:pb-14">
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-300">
            <Flag size={12} /> Admin
          </div>
          <Link
            href="/admin/moderace"
            className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-800/50 px-3 py-1 text-xs font-medium text-slate-300 hover:border-blue-500/30 hover:text-blue-200 transition-colors"
          >
            ← Moderační fronta
          </Link>
          <Link
            href="/admin/uzivatele"
            className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-800/50 px-3 py-1 text-xs font-medium text-slate-300 hover:border-blue-500/30 hover:text-blue-200 transition-colors"
          >
            → Uživatelé
          </Link>
        </div>

        <header className="mb-6">
          <h1 className="text-3xl font-black tracking-tight">Subjekty</h1>
          <p className="mt-2 text-sm text-slate-400">
            Přihlášen jako {admin.email ?? admin.userId}. Celkem {subjects.length} subjektů
            {showOrphanedOnly ? ' (filtr: bez kvalifikujícího incidentu)' : ''}.
          </p>
        </header>

        {/* Vyhledávání */}
        <form method="GET" className="mb-4 flex gap-2">
          <input
            type="text"
            name="q"
            defaultValue={q ?? ''}
            placeholder="Telefon, e-mail, účet, web, FB profil…"
            className="flex-1 rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
          />
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-500/15 px-4 py-2 text-sm font-semibold text-blue-300 ring-1 ring-blue-500/40 hover:bg-blue-500/25"
          >
            <Search size={14} /> Hledat
          </button>
        </form>
        {searchError && <p className="mb-4 text-sm text-amber-300">{searchError}</p>}

        <div className="mb-4">
          {showOrphanedOnly ? (
            <Link href="/admin/subjekty" className="text-xs text-slate-400 hover:text-slate-200 transition-colors">
              ← zobrazit všechny subjekty
            </Link>
          ) : (
            <Link
              href="/admin/subjekty?filter=orphaned"
              className="inline-flex items-center gap-1.5 text-xs text-amber-300 hover:text-amber-200 transition-colors"
            >
              <ShieldAlert size={12} /> Audit: zobrazit jen subjekty bez kvalifikujícího incidentu
            </Link>
          )}
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/50">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-left">
                <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Identifikátory</th>
                <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Incidenty</th>
                <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 text-center">Trust</th>
                <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Viditelnost</th>
                <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Vytvořen</th>
                <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {visibleSubjects.map((s) => {
                const idents = identifiersBySubject.get(s.id) ?? []
                const statusCounts = statusCountsBySubject.get(s.id) ?? new Map()
                const qualifying = qualifyingCountBySubject.get(s.id) ?? 0
                const vis = VISIBILITY_LABEL[s.visibility_status]
                return (
                  <tr key={s.id} className="hover:bg-slate-900/80 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {idents.length === 0 ? (
                          <span className="text-xs text-slate-600">—</span>
                        ) : (
                          idents.map((id, i) => (
                            <span key={i} className="rounded-full border border-slate-700 bg-slate-950/60 px-2 py-0.5 font-mono text-[11px] text-slate-300">
                              {id.value_masked}
                            </span>
                          ))
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-1">
                        {[...statusCounts.entries()].map(([status, count]) => (
                          <span
                            key={status}
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${STATUS_BADGE_CLS[status as IncidentStatus] ?? 'bg-slate-700/30 text-slate-400'}`}
                          >
                            {count}× {status}
                          </span>
                        ))}
                        {qualifying === 0 && (
                          <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-bold text-red-300 ring-1 ring-red-500/30">
                            bez kvalif. incidentu
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center text-xs font-bold text-slate-300">{s.trust_score}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold ring-1 ${vis.cls}`}>
                        {vis.text}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-400">{formatDate(s.created_at)}</td>
                    <td className="px-4 py-3">
                      <Link href={`/admin/subjekty/${s.id}`} className="text-xs text-blue-400 hover:text-blue-300 transition-colors whitespace-nowrap">
                        → Detail
                      </Link>
                    </td>
                  </tr>
                )
              })}
              {visibleSubjects.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-500">
                    {showOrphanedOnly ? 'Žádné osiřelé subjekty — dobré znamení.' : 'Žádní subjekti.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {subjErr && <p className="mt-3 text-sm text-red-400">DB error: {subjErr.message}</p>}
      </div>
    </main>
  )
}
