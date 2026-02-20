import { createClient } from "@/utils/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";

// Oprava: V nejnovějším Next.js musí být params Promise
export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const supabase = await createClient();
  
  const { data: report } = await supabase
    .from("shared_results")
    .select("*")
    .eq("id", resolvedParams.id)
    .single();

  if (!report) return notFound();

  const isHigh = report.risk > 50;

  return (
    <main className="min-h-screen bg-slate-950 text-white flex flex-col items-center px-6 pt-32 pb-20">
      <div className="max-w-2xl w-full space-y-8">
        
        {/* Hlavička */}
        <div className="text-center space-y-2">
          <p className="text-slate-500 text-sm uppercase tracking-widest">Sdílený report · NeKlikni.cz</p>
          <h1 className="text-3xl font-black">Výsledek AI analýzy</h1>
        </div>

        {/* Výsledek */}
        <div className={`rounded-3xl border overflow-hidden shadow-2xl
          ${isHigh ? 'border-red-500/30 bg-red-950/20' : 'border-green-500/30 bg-green-950/20'}`}>
          
          <div className="p-8 text-center border-b border-white/5">
            <div className={`text-7xl font-black mb-2 ${isHigh ? 'text-red-400' : 'text-green-400'}`}>
              {report.risk}%
            </div>
            <div className={`text-xs font-black uppercase tracking-widest ${isHigh ? 'text-red-500' : 'text-green-500'}`}>
              {isHigh ? '⚠️ Vysoké riziko' : '✅ Nízké riziko'}
            </div>
          </div>

          <div className="p-8 space-y-6">
            <p className="text-slate-200 text-lg leading-relaxed font-medium text-center italic">
              "{report.verdict}"
            </p>

            {report.analysis && (
              <div className="space-y-6 pt-6 border-t border-white/5">
                <div>
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-purple-400 mb-3">
                    Hloubková analýza
                  </h4>
                  <p className="text-slate-300 text-sm leading-relaxed">{report.analysis}</p>
                </div>

                {report.threats?.length > 0 && (
                  <div>
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-red-400 mb-3">
                      Detekované hrozby
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {report.threats.map((threat: string, i: number) => (
                        <div key={i} className="flex items-center gap-2 p-3 bg-white/5 rounded-xl text-xs text-slate-300 border border-white/5">
                          <span>⚠️</span> {threat}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {report.recommendation && (
                  <div className="p-5 bg-purple-500/10 border border-purple-500/20 rounded-2xl">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-purple-400 mb-2">
                      Doporučený postup
                    </h4>
                    <p className="text-sm text-purple-100/90 leading-relaxed font-medium">{report.recommendation}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* CTA do akce */}
        <div className="text-center space-y-4 pt-8">
          <p className="text-slate-400 text-sm">Chceš prověřit vlastní zprávu nebo odkaz?</p>
          <Link 
            href="/"
            className="inline-block bg-gradient-to-r from-blue-600 to-purple-600 px-8 py-4 rounded-2xl font-black text-white shadow-lg shadow-purple-500/20 hover:scale-105 transition-all"
          >
            Prověřit zdarma na NeKlikni.cz →
          </Link>
        </div>

      </div>
    </main>
  );
}