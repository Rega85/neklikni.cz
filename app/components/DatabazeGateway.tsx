'use client'

/**
 * DatabazeGateway — sekce na homepage propagující modul `/databaze`.
 *
 * Druhá brána vedle AI analýzy zprávy. Obsahuje:
 *   - Vizuální "NEBO" divider
 *   - Nadpis a podnadpis
 *   - Native search formulář (GET → /databaze/hledat?q=...)
 *   - Stats counter (fetched client-side z /api/databaze/stats)
 *   - 2 CTA (Nahlásit, Jak to funguje)
 *
 * Jazyková hygiena: žádný "podvodník" / "podvod" jako nálepka osoby.
 */

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Database, Search as SearchIcon } from 'lucide-react'

interface Stats {
  subjects: number | null
  incidents: number | null
  reporters: number | null
}

function formatCount(n: number | null): string {
  if (n === null || n === 0) return '—'
  return n.toLocaleString('cs-CZ')
}

export default function DatabazeGateway() {
  const [stats, setStats] = useState<Stats>({
    subjects: null,
    incidents: null,
    reporters: null,
  })

  useEffect(() => {
    let cancelled = false
    fetch('/api/databaze/stats', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data && typeof data === 'object') {
          setStats(data as Stats)
        }
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <section className="w-full max-w-4xl mx-auto px-4 mt-12 sm:mt-16">
      {/* Divider "NEBO" */}
      <div className="flex items-center gap-4 mb-10" aria-hidden="true">
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-700 to-transparent" />
        <span className="text-xs font-bold uppercase tracking-widest text-slate-500">
          nebo
        </span>
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-700 to-transparent" />
      </div>

      {/* Header */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center gap-2 rounded-full border border-purple-500/30 bg-purple-500/5 px-4 py-1.5 text-xs font-medium text-purple-300 mb-4">
          <Database size={14} aria-hidden="true" />
          <span>Databáze incidentů</span>
        </div>
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight">
          Ověř konkrétní osobu, účet nebo číslo
        </h2>
        <p className="mt-3 text-sm sm:text-base text-slate-300 max-w-2xl mx-auto">
          Komunitní databáze nahlášených incidentů. Zjisti, zda byl subjekt už
          někým nahlášen — dřív než pošleš peníze.
        </p>
      </div>

      {/* Search form */}
      <form
        action="/databaze/hledat"
        method="get"
        className="flex flex-col sm:flex-row gap-3 mb-4"
      >
        <label htmlFor="db_q" className="sr-only">
          Identifikátor k vyhledání
        </label>
        <input
          id="db_q"
          name="q"
          type="search"
          required
          placeholder="+420 ... | email@... | 12345/0100"
          className="surface-card-elevated flex-1 rounded-xl border border-slate-800 bg-slate-950/60 p-4 text-base font-medium text-slate-100 placeholder:text-slate-500 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/30"
        />
        <button
          type="submit"
          className="brand-gradient inline-flex items-center justify-center gap-2 rounded-xl px-6 py-4 text-base font-semibold text-white shadow-[0_0_18px_-4px_rgba(168,85,247,0.6)] transition hover:shadow-[0_0_24px_-2px_rgba(236,72,153,0.7)] sm:px-8"
        >
          <SearchIcon size={18} aria-hidden="true" />
          Ověřit v databázi
        </button>
      </form>

      {/* Stats inline */}
      <p className="text-center text-sm text-slate-400 mb-6">
        <span className="font-semibold text-slate-200">
          {formatCount(stats.subjects)}
        </span>{' '}
        subjektů
        <span className="mx-2 text-slate-600">·</span>
        <span className="font-semibold text-slate-200">
          {formatCount(stats.incidents)}
        </span>{' '}
        nahlášení
        <span className="mx-2 text-slate-600">·</span>
        <span className="font-semibold text-slate-200">
          {formatCount(stats.reporters)}
        </span>{' '}
        nahlašovatelů
      </p>

      {/* CTAs */}
      <div className="flex flex-wrap items-center justify-center gap-4">
        <Link
          href="/databaze/nahlasit"
          className="brand-gradient inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-bold uppercase tracking-widest text-white shadow-[0_0_18px_-4px_rgba(168,85,247,0.6)] transition hover:shadow-[0_0_24px_-2px_rgba(236,72,153,0.7)]"
        >
          Nahlásit incident
        </Link>
        <Link
          href="/databaze"
          className="text-sm font-semibold text-purple-300 underline-offset-4 transition hover:text-purple-200 hover:underline"
        >
          Jak databáze funguje →
        </Link>
      </div>
    </section>
  )
}
