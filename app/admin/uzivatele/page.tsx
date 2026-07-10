/**
 * /admin/uzivatele — seznam registrovaných uživatelů.
 *
 * Přístup: jen pro adminy (stejný guard jako /admin/moderace).
 * Non-admin dostane 404.
 *
 * Zobrazuje: email, datum registrace, poslední přihlášení,
 * počet nahlášení, stav (active/banned), akce ban/unban.
 */

import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { Flag, Users } from 'lucide-react'
import Link from 'next/link'
import { getAdminIdentity } from '../../api/admin/_lib/auth'
import type { DatabazeDatabase } from '../../api/databaze/_lib/database'
import { BanActions } from './_components/BanActions'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Uživatelé — Neklikni.cz',
  robots: { index: false, follow: false },
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

function isBanned(bannedUntil: string | null | undefined): boolean {
  if (!bannedUntil) return false
  return new Date(bannedUntil) > new Date()
}

export default async function UzivatelePage() {
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

  const listResult = await sb.auth.admin.listUsers({ perPage: 1000 })
  const users = listResult.data?.users ?? []
  const usersErr = listResult.error

  // Počty nahlášení per reporter (reporter_id = auth user id)
  const { data: incidentRows } = await sb
    .from('incidents')
    .select('reporter_id')

  const countByReporter = new Map<string, number>()
  for (const row of incidentRows ?? []) {
    if (row.reporter_id) {
      countByReporter.set(row.reporter_id, (countByReporter.get(row.reporter_id) ?? 0) + 1)
    }
  }

  // Seřadit: zablokovaní nahoře, pak dle created_at desc
  const sorted = [...users].sort((a, b) => {
    const aBanned = isBanned(a.banned_until)
    const bBanned = isBanned(b.banned_until)
    if (aBanned !== bBanned) return aBanned ? -1 : 1
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-6xl px-4 pt-24 pb-10 sm:pb-14">
        <header className="mb-8">
          <div className="flex items-center gap-3">
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
              href="/admin/subjekty"
              className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-800/50 px-3 py-1 text-xs font-medium text-slate-300 hover:border-blue-500/30 hover:text-blue-200 transition-colors"
            >
              → Subjekty
            </Link>
          </div>
          <h1 className="mt-3 flex items-center gap-2 text-3xl font-black tracking-tight">
            <Users size={26} /> Registrovaní uživatelé
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Přihlášen jako {admin.email ?? admin.userId}. Celkem {users.length} uživatelů.
          </p>
          {usersErr && (
            <p className="mt-3 text-sm text-red-400">Chyba načítání: {String(usersErr)}</p>
          )}
        </header>

        <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/50">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-left">
                <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Email</th>
                <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Registrován</th>
                <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Poslední přihlášení</th>
                <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 text-center">Nahlášení</th>
                <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Stav</th>
                <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Akce</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {sorted.map((user) => {
                const banned = isBanned(user.banned_until)
                const incidentCount = countByReporter.get(user.id) ?? 0
                return (
                  <tr
                    key={user.id}
                    className={`transition-colors hover:bg-slate-900/80 ${banned ? 'bg-red-950/20' : ''}`}
                  >
                    <td className="px-4 py-3 font-mono text-xs">
                      <Link
                        href={`/admin/uzivatele/${user.id}`}
                        className="text-slate-200 hover:text-blue-300 transition-colors"
                      >
                        {user.email ?? '—'}
                      </Link>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-400">
                      {formatDate(user.created_at)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-400">
                      {formatDate(user.last_sign_in_at)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {incidentCount > 0 ? (
                        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-blue-500/20 text-xs font-bold text-blue-300">
                          {incidentCount}
                        </span>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {banned ? (
                        <span className="inline-flex items-center rounded-full bg-red-500/15 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-red-300 ring-1 ring-red-500/30">
                          Zablokován
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-emerald-300 ring-1 ring-emerald-500/20">
                          Aktivní
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <BanActions userId={user.id} isBanned={banned} />
                    </td>
                  </tr>
                )
              })}
              {sorted.length === 0 && !usersErr && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-500">
                    Žádní uživatelé.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  )
}
