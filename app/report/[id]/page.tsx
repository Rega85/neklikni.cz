import { Metadata } from "next";
import { createClient } from "@/utils/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Shield, AlertTriangle, CheckCircle, ArrowLeft, Share2 } from "lucide-react";

// ✅ 1. METADATA PRO FACEBOOK
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const resolvedParams = await params;
  const url = `https://www.neklikni.cz/report/${resolvedParams.id}`;

  return {
    title: 'Analýza hrozby | NeKlikni.cz',
    alternates: { canonical: url },
    openGraph: {
      title: 'Pozor! AI analýza odhalila riziko ⚠️',
      description: 'AI bodyguard prověřil tuto zprávu. Podívejte se na výsledek.',
      url: url,
      type: 'article',
      images: [
        {
          url: `${url}/opengraph-image`,
          width: 1200,
          height: 630,
          type: 'image/png',
          alt: 'AI analýza hrozby NeKlikni.cz',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'AI analýza odhalila riziko ⚠️',
      images: [`${url}/opengraph-image`],
    }
  };
}

// ✅ 2. SAMOTNÁ STRÁNKA REPORTU
export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const supabase = await createClient();

  const { data: report } = await supabase
    .from("analyses")
    .select("*")
    .eq("id", resolvedParams.id)
    .single();

  if (!report) return notFound();

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
              <p className="text-2xl font-medium text-slate-200 italic leading-relaxed">
                "{report.verdict}"
              </p>
            </div>

            <div className="space-y-6 pt-8 border-t border-white/5">
              <div>
                <h4 className="text-[10px] font-black uppercase tracking-widest text-purple-400 mb-3">Hloubková analýza</h4>
                <p className="text-slate-300 leading-relaxed italic opacity-90">
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