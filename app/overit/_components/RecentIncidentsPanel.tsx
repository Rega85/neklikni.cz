/**
 * Klidový stav pravého panelu na desktopu — "Poslední nahlášené podvody".
 * Sociální důkaz, ne cirkus: STATICKÝ seznam, žádná rotace/auto-advance
 * (na rozdíl od AnalysisScanner). Jen jemný fade-in při načtení panelu.
 *
 * Na mobilu se nevykresluje vůbec (viz OveritClient — `hidden md:block`).
 */

import { ShieldAlert } from "lucide-react";
import { CATEGORY_LABELS } from "@/types/databaze";
import type { RecentIncidentCard } from "@/app/databaze/_lib/recentIncidents";

function formatShortDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("cs-CZ", { day: "numeric", month: "numeric" });
}

interface Props {
  incidents: RecentIncidentCard[];
}

export default function RecentIncidentsPanel({ incidents }: Props) {
  if (incidents.length === 0) return null;

  return (
    <div data-testid="recent-incidents-panel" className="surface-card p-6 space-y-4">
      <h2 className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-muted-foreground">
        <ShieldAlert size={14} /> Poslední nahlášené podvody
      </h2>
      <ul className="space-y-3">
        {incidents.map((inc) => (
          <li key={inc.id} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-secondary/30 px-4 py-3">
            <div className="min-w-0">
              <p className="text-sm font-mono text-foreground truncate">{inc.identifierMasked}</p>
              <p className="text-xs text-muted-foreground">
                {CATEGORY_LABELS[inc.category] ?? inc.category}
                {inc.subjectIncidentCount > 1 ? ` · ${inc.subjectIncidentCount}× nahlášeno` : ""}
              </p>
            </div>
            <span className="shrink-0 text-[11px] text-muted-foreground tabular-nums">{formatShortDate(inc.publicAt)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
