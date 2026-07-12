import { Metadata } from "next";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, AlertTriangle, CheckCircle } from "lucide-react";
import VerdictCard, { type VerdictCardProps } from "@/app/overit/_components/VerdictCard";

/**
 * /report/[id] — veřejná stránka sdíleného výsledku (shared_results).
 *
 * Dva tvary v jedné tabulce (viz supabase/migrations/20260713_shared_results_verdict_shape.sql):
 *  - starší řádky z /api/analyze: risk/verdict/analysis/threats (level IS NULL)
 *  - nové řádky z /api/check (Fáze 4): + level/input_kind/actions/sources —
 *    renderují se přes STEJNOU komponentu VerdictCard jako na /overit, žádná
 *    duplicitní šablona.
 * Staré odkazy (247 řádků k datu přechodu) musí dál fungovat beze změny.
 */

function getDb() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// ✅ 1. METADATA PRO FACEBOOK
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const resolvedParams = await params;
  const url = `https://www.neklikni.cz/report/${resolvedParams.id}`;
  const supabase = getDb();

  const { data: report } = await supabase
    .from("shared_results")
    .select("risk, verdict, analysis, level, sources")
    .eq("id", resolvedParams.id)
    .single();

  if (!report) {
    return { title: "Výsledek ověření | NeKlikni.cz", alternates: { canonical: url } };
  }

  const analysisText = report.level ? (report.sources?.ai?.analysis ?? "") : report.analysis;
  const firstSentence = analysisText?.split(/[.!?]/)[0] ?? analysisText ?? "";
  const title = `Výsledek ověření: ${report.verdict} | NeKlikni.cz`;
  const description = firstSentence
    ? `Riziko ${report.risk}/100 – ${firstSentence}`
    : `Riziko ${report.risk}/100 na NeKlikni.cz`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      type: 'article',
      images: [{ url: '/og-image.png', width: 1200, height: 630, type: 'image/png', alt: 'Výsledek ověření NeKlikni.cz' }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ['/og-image.png'],
    },
  };
}

// ✅ 2. SAMOTNÁ STRÁNKA REPORTU
export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const supabase = getDb();

  const { data: report } = await supabase
    .from("shared_results")
    .select("*")
    .eq("id", resolvedParams.id)
    .single();

  if (!report) return notFound();

  if (report.level) {
    const verdictProps: VerdictCardProps = {
      inputKind: report.input_kind ?? "message",
      level: report.level,
      score: report.risk,
      headline: report.verdict ?? "",
      actions: report.actions ?? [],
      sources: report.sources ?? { database: null, ai: null },
      shareId: resolvedParams.id,
    };

    return (
      <main className="min-h-screen text-foreground pt-32 pb-20 px-4 sm:px-6">
        <div className="max-w-2xl mx-auto space-y-6">
          <Link href="/overit" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors group">
            <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm font-bold uppercase tracking-widest">Ověřit další</span>
          </Link>
          <VerdictCard {...verdictProps} />
        </div>
      </main>
    );
  }

  const isHigh = report.risk > 50;

  return (
    <main className="min-h-screen bg-slate-950 text-white pt-32 pb-20 px-6">
      <div className="max-w-3xl mx-auto space-y-8">

        <Link href="/" className="inline-flex items-center gap-2 text-slate-500 hover:text-white transition-colors group">
          <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
          <span className="text-sm font-bold uppercase tracking-widest">Zpět na prověření</span>
        </Link>

        <div className={`rounded-3xl border overflow-hidden shadow-2xl ${isHigh ? 'border-red-500/30 bg-red-950/20' : 'border-green-500/30 bg-green-950/20'}`}>
          <div className="p-12 text-center border-b border-white/5">
            <div className={`text-8xl font-black mb-4 ${isHigh ? 'text-red-400' : 'text-green-400'}`}>
              {report.risk}%
            </div>
            <div className="flex items-center justify-center gap-2">
              {isHigh ? <AlertTriangle className="text-red-500" /> : <CheckCircle className="text-green-500" />}
              <span className={`text-xs font-black uppercase tracking-[0.3em] ${isHigh ? 'text-red-500' : 'text-green-500'}`}>
                {isHigh ? 'Vysoké riziko hrozby' : 'Nízké riziko hrozby'}
              </span>
            </div>
          </div>

          <div className="p-10 space-y-8">
            <div className="text-center">
              <p className="text-2xl font-semibold text-slate-200 leading-relaxed">
                "{report.verdict}"
              </p>
            </div>

            <div className="space-y-6 pt-8 border-t border-white/5">
              <div>
                <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-400 mb-3">Hloubková analýza</h4>
                <p className="text-slate-300 leading-relaxed">
                  {report.analysis || "Analýza není pro tento typ reportu k dispozici."}
                </p>
              </div>

              {report.threats && report.threats.length > 0 && (
                <div>
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-red-400 mb-3">Detekované hrozby</h4>
                  <div className="flex flex-wrap gap-2">
                    {report.threats.map((threat: string, i: number) => (
                      <span key={i} className="px-3 py-1 bg-red-500/10 border border-red-500/20 rounded-lg text-[11px] font-bold text-red-400">
                        ⚠️ {threat}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {report.original_text && (
                <div>
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3">Analyzovaný text</h4>
                  <p className="text-slate-400 text-sm leading-relaxed whitespace-pre-wrap break-words font-mono bg-slate-900/50 rounded-xl p-4 border border-white/5">
                    {report.original_text}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}