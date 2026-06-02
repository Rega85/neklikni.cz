/**
 * /admin/uzivatele/[id] — detail registrovaného uživatele.
 *
 * Přístup: jen pro adminy (stejný guard jako ostatní admin stránky).
 * Zobrazuje: základní info, tarif, stav, seznam nahlášení.
 * Akce: reset hesla, ban/unban.
 */

import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { ArrowLeft, Flag } from 'lucide-react'
import Link from 'next/link'
import { getAdminIdentity } from '../../../api/admin/_lib/auth'
import { BanActions } from '../_components/BanActions'
import { PasswordResetButton } from '../_components/PasswordResetButton'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Detail uživatele — Neklikni.cz',
  robots: { index: false, follow: false },
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

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

function isBanned(bannedUntil: string | null | undefined): boolean {
  if (!bannedUntil) return false
  return new Date(bannedUntil) > new Date()
}

const STATUS_LABEL: Record<string, { text: string; cls: string }> = {
  pending:              { text: 'Čeká',             cls: 'bg-amber-500/15 text-amber-300' },
  pending_merge_review: { text: 'Review sloučení',  cls: 'bg-amber-500/15 text-amber-300' },
  ai_reviewed:          { text: 'AI posouzeno',     cls: 'bg-blue-500/15 text-blue-300' },
  notified:             { text: 'Notifikováno',     cls: 'bg-blue-500/15 text-blue-300' },
  published:            { text: 'Zveřejněno',       cls: 'bg-emerald-500/15 text-emerald-300' },
  objected:             { text: 'Napadeno',         cls: 'bg-orange-500/15 text-orange-300' },
  removed:              { text: 'Odstraněno',       cls: 'bg-red-500/15 text-red-300' },
  needs_more_info:      { text: 'Doplnit',          cls: 'bg-purple-500/15 text-purple-300' },
}

function Field({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-0.5">{label}</p>
      <p className={`text-sm text-slate-100 truncate ${mono ? 'font-mono' : 'font-medium'}`}>{value}</p>
    </div>
  )
}

export default async function UserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const admin = await getAdminIdentity()
  if (!admin) notFound()

  const { id: userId } = await params
  if (!UUID_RE.test(userId)) notFound()

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100 p-8">
        <p className="text-red-400">Server misconfigured — chybí Supabase env.</p>
      </main>
    )
  }

  // Untyped client — dotazujeme user_profiles, které není v DatabazeDatabase
  const sb = createClient(url, key)

  const { data: { user }, error: userErr } = await sb.auth.admin.getUserById(userId)
  if (userErr || !user) notFound()

  const [profileRes, incidentsRes] = await Promise.all([
    sb
      .from('user_profiles')
      .select('tier, credits_remaining')
      .eq('id', userId)
      .maybeSingle(),
    sb
      .from('incidents')
      .select('id, created_at, category, status, severity')
      .eq('reporter_id', userId)
      .order('created_at', { ascending: false })
      .limit(100),
  ])

  const profile = profileRes.data as { tier: string; credits_remaining: number } | null
  const incidents = (incidentsRes.data ?? []) as Array<{
    id: string
    created_at: string
    category: string
    status: string
    severity: string
  }>

  const banned = isBanned(user.banned_until)

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-4xl px-4 pt-24 pb-10 sm:pb-14">

        {/* Navigace */}
        <div className="flex items-center gap-3 mb-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-500/10 px-3 py-1 text-xs font-medium text-purple-300">
            <Flag size={12} /> Admin
          </div>
          <Link
            href="/admin/uzivatele"
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-800/50 px-3 py-1 text-xs font-medium text-slate-300 hover:border-purple-500/30 hover:text-purple-200 transition-colors"
          >
            <ArrowLeft size={11} /> Zpět na seznam
          </Link>
          <Link
            href="/admin/moderace"
            className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-800/50 px-3 py-1 text-xs font-medium text-slate-300 hover:border-purple-500/30 hover:text-purple-200 transition-colors"
          >
            ← Moderační fronta
          </Link>
        </div>

        {/* Záhlaví */}
        <header className="mb-8">
          <h1 className="text-2xl font-black tracking-tight font-mono break-all">
            {user.email ?? userId}
          </h1>
          <p className="mt-1 text-xs text-slate-500 font-mono">{userId}</p>
        </header>

        {/* Základní informace */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 mb-5">
          <h2 className="text-[11px] font-black uppercase tracking-wider text-slate-500 mb-4">
            Základní informace
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <Field label="E-mail"                value={user.email ?? '—'} mono />
            <Field label="Registrován"           value={formatDate(user.created_at)} />
            <Field label="Poslední přihlášení"   value={formatDate(user.last_sign_in_at)} />
            <Field label="Stav"                  value={banned ? 'Zablokován' : 'Aktivní'} />
            <Field label="Tarif"                 value={profile?.tier ?? '—'} />
            <Field label="Zbývající analýzy"     value={profile?.credits_remaining !== undefined ? String(profile.credits_remaining) : '—'} />
          </div>
        </section>

        {/* Akce */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 mb-5">
          <h2 className="text-[11px] font-black uppercase tracking-wider text-slate-500 mb-4">
            Akce
          </h2>
          <div className="flex flex-wrap gap-3">
            {user.email && (
              <PasswordResetButton userId={userId} userEmail={user.email} />
            )}
            <BanActions userId={userId} isBanned={banned} />
          </div>
        </section>

        {/* Nahlášení */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900/50 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-800">
            <h2 className="text-[11px] font-black uppercase tracking-wider text-slate-500">
              Nahlášení ({incidents.length})
            </h2>
          </div>

          {incidents.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-slate-500">Žádná nahlášení.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800/60 text-left">
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">ID</th>
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Datum</th>
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Kategorie</th>
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Závažnost</th>
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Stav</th>
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {incidents.map((inc) => {
                    const status = STATUS_LABEL[inc.status] ?? { text: inc.status, cls: 'bg-slate-700/30 text-slate-400' }
                    return (
                      <tr key={inc.id} className="hover:bg-slate-900/40 transition-colors">
                        <td className="px-4 py-3 font-mono text-xs text-slate-500">
                          {inc.id.slice(0, 8)}…
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-400">
                          {formatDate(inc.created_at)}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-300">{inc.category}</td>
                        <td className="px-4 py-3 text-xs text-slate-400">{inc.severity}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold ${status.cls}`}>
                            {status.text}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <Link
                            href={`/admin/incident/${inc.id}`}
                            className="text-xs text-purple-400 hover:text-purple-300 transition-colors whitespace-nowrap"
                          >
                            → Detail
                          </Link>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

      </div>
    </main>
  )
}
