"use client";

/**
 * Výsledková karta pro /overit — dvě vrstvy:
 *  - nahoře vždy viditelné: semafor, skóre, headline, "co dělat teď"
 *  - dole rozklikávací "Zobrazit detaily": databáze (fakt) vs. AI (vyhodnocení)
 *
 * Typy odpovědi jsou 1:1 s lib/verdictEngine.ts — žádná vlastní kopie.
 */

import { useState } from "react";
import {
  ChevronDown,
  Database,
  Sparkles,
  ShieldCheck,
  ShieldAlert,
  Users,
  ExternalLink,
  Share2,
  Download,
  Check,
} from "lucide-react";
import RiskGauge from "@/app/components/RiskGauge";
import { identifierLabel } from "@/utils/databaze/identifiers";
import { trackEvent } from "@/app/lib/analytics";
import type { VerdictLevel, DatabaseSignal, AiSignal } from "@/lib/verdictEngine";
import type { InputKind } from "@/lib/inputParser";

export interface VerdictCardProps {
  inputKind: InputKind;
  level: VerdictLevel;
  score: number;
  headline: string;
  actions: string[];
  sources: {
    database: DatabaseSignal | null;
    ai: AiSignal | null;
  };
  /** Null, když se uložení sdíleného výsledku nepovedlo (best-effort) — tlačítka se pak skryjí. */
  shareId?: string | null;
}

function buildReportHtml(props: VerdictCardProps): string {
  const { level, score, headline, actions, sources } = props;
  const date = new Date().toLocaleDateString("cs-CZ");
  const actionsHtml =
    actions.length > 0
      ? `<ul class="threats">${actions.map((a) => `<li>${a}</li>`).join("")}</ul>`
      : "";
  const aiHtml = sources.ai
    ? `<div class="section"><h3>AI analýza</h3><p>${sources.ai.analysis}</p></div>`
    : "";
  const dbMatches = [
    ...sources.database?.coi_matches.map((m) => `ČOI: ${m.domain}${m.reason ? ` — ${m.reason}` : ""}`) ?? [],
    ...sources.database?.identifier_matches.map(
      (m) => `${identifierLabel(m.type)}: ${m.value_masked} (${m.incident_count} ${m.incident_count === 1 ? "incident" : "incidentů"}${m.verified ? ", ověřeno" : ", komunitní nahlášení"})`,
    ) ?? [],
  ];
  const dbHtml =
    dbMatches.length > 0
      ? `<div class="section"><h3>Nález v databázi</h3><ul class="threats">${dbMatches.map((m) => `<li>${m}</li>`).join("")}</ul></div>`
      : "";
  return `<!DOCTYPE html>
<html><head>
  <title>NeKlikni.cz - Výsledek ověření</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 700px; margin: 40px auto; padding: 20px; color: #1f2937; }
    .header { text-align: center; margin-bottom: 30px; }
    .logo { font-size: 24px; font-weight: bold; color: #3b82f6; }
    .risk { font-size: 48px; font-weight: bold; text-align: center; margin: 20px 0; }
    .risk.red { color: #ef4444; }
    .risk.orange { color: #f59e0b; }
    .risk.green { color: #10b981; }
    .verdict { font-size: 22px; text-align: center; font-weight: bold; margin-bottom: 20px; }
    .section { margin: 20px 0; padding: 15px; background: #f9fafb; border-radius: 8px; }
    .section h3 { margin: 0 0 10px; color: #4b5563; }
    .threats { list-style: none; padding: 0; }
    .threats li { padding: 5px 0; }
    .threats li::before { content: "⚠ "; }
    .footer { text-align: center; margin-top: 40px; color: #9ca3af; font-size: 12px; }
    @media print { body { margin: 0; } }
  </style>
</head><body>
  <div class="header"><div class="logo">NeKlikni.cz</div><div>Výsledek ověření</div></div>
  <div class="risk ${level}">${score}%</div>
  <div class="verdict">${headline}</div>
  ${dbHtml}
  ${aiHtml}
  ${actionsHtml ? `<div class="section"><h3>Co dělat teď</h3>${actionsHtml}</div>` : ""}
  <div class="footer">Vygenerováno na neklikni.cz • ${date}</div>
</body></html>`;
}

const LEVEL_STYLES: Record<VerdictLevel, { border: string; headerBg: string; dot: string; text: string }> = {
  green: {
    border: "border-success/40",
    headerBg: "bg-gradient-to-b from-success/25 via-success/10 to-transparent",
    dot: "bg-success",
    text: "text-success",
  },
  orange: {
    border: "border-warning/40",
    headerBg: "bg-gradient-to-b from-warning/25 via-warning/10 to-transparent",
    dot: "bg-warning",
    text: "text-warning",
  },
  red: {
    border: "border-destructive/40",
    headerBg: "bg-gradient-to-b from-destructive/25 via-destructive/10 to-transparent",
    dot: "bg-destructive",
    text: "text-destructive",
  },
};

export default function VerdictCard(props: VerdictCardProps) {
  const { inputKind, level, score, headline, actions, sources, shareId } = props;
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const styles = LEVEL_STYLES[level];

  const hasDatabaseSignal =
    sources.database !== null &&
    (sources.database.coi_matches.length > 0 || sources.database.identifier_matches.length > 0);

  const shareUrl = shareId ? `${typeof window !== "undefined" ? window.location.origin : "https://neklikni.cz"}/report/${shareId}` : null;
  const waText = shareUrl ? encodeURIComponent(`Pozor na tento podvod! Podívej se na ověření: ${shareUrl}`) : "";

  async function handleCopyLink() {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      trackEvent("cta_share_clicked", { method: "copy", level });
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }

  async function handleNativeShare() {
    if (!shareUrl || !navigator.share) return;
    trackEvent("cta_share_clicked", { method: "native", level });
    try {
      await navigator.share({ title: "NeKlikni.cz – Varování", text: "Pozor na tento podvod! Podívej se na ověření:", url: shareUrl });
    } catch {}
  }

  function handleDownloadPDF() {
    trackEvent("cta_pdf_download", { level, score });
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(buildReportHtml(props));
    win.document.close();
    win.print();
  }

  return (
    <div
      data-testid="verdict-card"
      data-level={level}
      className={`rounded-[32px] border-2 bg-card backdrop-blur-3xl shadow-2xl overflow-hidden ${styles.border} text-left`}
    >
      {/* ── Barevný stavový blok — semafor rozpoznatelný i bez čtení ── */}
      <div className={`${styles.headerBg} px-6 sm:px-8 pt-7 sm:pt-9 pb-6 sm:pb-8`}>
        <div className="flex flex-col items-center text-center gap-4">
          {/* RiskGauge uz sama zobrazuje textovy popisek rizika (Nizke/Stredni/Vysoke) pod skore. */}
          <RiskGauge value={score} level={level} size={160} />
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-foreground leading-snug">{headline}</h2>
        </div>
      </div>

      <div className="p-6 sm:p-8 pt-5 sm:pt-6">
        {actions.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-primary font-black uppercase text-[10px] tracking-widest">Co dělat teď</h3>
            <ul className="space-y-1.5">
              {actions.map((action, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                  <span className={`mt-1 h-1.5 w-1.5 rounded-full shrink-0 ${styles.dot}`} aria-hidden="true" />
                  {action}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-6 pt-5 border-t border-border space-y-2.5">
          <h3 className="text-primary font-black uppercase text-[10px] tracking-widest">Sdílet výsledek</h3>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadPDF}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-secondary/40 hover:bg-secondary px-3.5 py-2 text-xs font-semibold text-foreground transition-colors"
            >
              <Download size={14} className="text-muted-foreground" /> Stáhnout report
            </button>
            {shareUrl && (
              <>
                <a
                  href={`https://wa.me/?text=${waText}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => trackEvent("cta_share_clicked", { method: "whatsapp", level })}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-secondary/40 hover:bg-secondary px-3.5 py-2 text-xs font-semibold text-foreground transition-colors"
                >
                  <span aria-hidden="true">💬</span> WhatsApp
                </a>
                <a
                  href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => trackEvent("cta_share_clicked", { method: "facebook", level })}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-secondary/40 hover:bg-secondary px-3.5 py-2 text-xs font-semibold text-foreground transition-colors"
                >
                  <span aria-hidden="true">📘</span> Facebook
                </a>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-secondary/40 hover:bg-secondary px-3.5 py-2 text-xs font-semibold text-foreground transition-colors"
                >
                  {copied ? (
                    <>
                      <Check size={14} className="text-success" /> Zkopírováno!
                    </>
                  ) : (
                    <>
                      <Share2 size={14} className="text-muted-foreground" /> Kopírovat odkaz
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleNativeShare}
                  className="sm:hidden inline-flex items-center gap-1.5 rounded-xl border border-border bg-secondary/40 hover:bg-secondary px-3.5 py-2 text-xs font-semibold text-foreground transition-colors"
                >
                  <Share2 size={14} className="text-muted-foreground" /> Sdílet
                </button>
              </>
            )}
          </div>
        </div>

        {/* ── Dolní vrstva — rozklikávací detaily ── */}
        <div className="mt-6 border-t border-border pt-4">
          <button
            type="button"
            onClick={() => setDetailsOpen((v) => !v)}
            aria-expanded={detailsOpen}
            className="flex w-full items-center justify-between text-sm font-bold text-muted-foreground hover:text-foreground transition-colors"
          >
            Zobrazit detaily
            <ChevronDown size={16} className={`transition-transform ${detailsOpen ? "rotate-180" : ""}`} />
          </button>

          {detailsOpen && (
            <div className="mt-4 space-y-5 animate-fade-up">
              <DatabaseSection database={sources.database} hasSignal={hasDatabaseSignal} />
              <AiSection ai={sources.ai} inputKind={inputKind} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DatabaseSection({ database, hasSignal }: { database: DatabaseSignal | null; hasSignal: boolean }) {
  return (
    <div className="space-y-2.5">
      <h4 className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-foreground">
        <Database size={13} /> Databáze — ověřitelný fakt
      </h4>

      {database === null && (
        <p className="text-xs text-muted-foreground">
          Databáze se nekontrolovala — text neobsahoval odkaz ani identifikátor (telefon/účet/e-mail) k vyhledání.
        </p>
      )}

      {database !== null && !hasSignal && (
        <p className="text-xs text-muted-foreground">Nic jsme nenašli — žádná shoda v ČOI seznamu ani v nahlášeních.</p>
      )}

      {database?.coi_matches.map((m, i) => (
        <div key={`coi-${i}`} className="rounded-xl border border-destructive/30 bg-destructive/5 p-3">
          <div className="flex items-center gap-1.5 text-xs font-bold text-destructive">
            <ShieldAlert size={13} /> Seznam rizikových e-shopů ČOI
          </div>
          <p className="mt-1 text-sm font-mono text-foreground">{m.domain}</p>
          {m.reason && <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{m.reason}</p>}
          {m.source_url && (
            <a
              href={m.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-destructive hover:text-foreground"
            >
              Zdroj: {m.source} <ExternalLink size={11} />
            </a>
          )}
        </div>
      ))}

      {database?.identifier_matches.map((m, i) => (
        <div
          key={`id-${i}`}
          className={`rounded-xl border p-3 ${m.verified ? "border-destructive/30 bg-destructive/5" : "border-warning/30 bg-warning/5"}`}
        >
          <div className={`flex items-center gap-1.5 text-xs font-bold ${m.verified ? "text-destructive" : "text-warning"}`}>
            {m.verified ? <ShieldCheck size={13} /> : <Users size={13} />}
            {m.verified ? "Ověřený rizikový záznam" : "Komunitní nahlášení (neověřeno)"}
          </div>
          <p className="mt-1 text-sm text-foreground">
            <span className="font-semibold">{identifierLabel(m.type)}:</span>{" "}
            <span className="font-mono">{m.value_masked}</span>
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Nahlášeno v {m.incident_count} {m.incident_count === 1 ? "incidentu" : "incidentech"}
          </p>
        </div>
      ))}
    </div>
  );
}

function AiSection({ ai, inputKind }: { ai: AiSignal | null; inputKind: InputKind }) {
  return (
    <div className="space-y-2.5">
      <h4 className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-foreground">
        <Sparkles size={13} /> AI analýza — vyhodnocení, ne jistota
      </h4>

      {ai === null && inputKind === "identifier" && (
        <p className="text-xs text-muted-foreground">
          AI se u holého identifikátoru (telefon/účet/e-mail) nevolala — nemá z čeho usuzovat, ověřuje se jen databáze.
        </p>
      )}

      {ai === null && inputKind !== "identifier" && (
        <p className="text-xs text-muted-foreground">AI analýza je dočasně nedostupná. Databázový výsledek výše platí dál.</p>
      )}

      {ai !== null && (
        <div className="rounded-xl border border-border bg-secondary/40 p-3 space-y-2">
          <p className="text-sm text-foreground">{ai.analysis}</p>
          {ai.threats.length > 0 && (
            <ul className="space-y-1">
              {ai.threats.map((t, i) => (
                <li key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                  <span className="text-destructive mt-0.5 shrink-0">•</span> {t}
                </li>
              ))}
            </ul>
          )}
          {ai.tactics && ai.tactics.length > 0 && (
            <ul className="space-y-1">
              {ai.tactics.map((t, i) => (
                <li key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                  <span className="text-warning mt-0.5 shrink-0">▸</span> {t}
                </li>
              ))}
            </ul>
          )}
          <p className="italic text-xs text-muted-foreground border-t border-border pt-2">&quot;{ai.recommendation}&quot;</p>
        </div>
      )}
    </div>
  );
}
