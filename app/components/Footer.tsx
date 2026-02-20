import Link from 'next/link';
import { Scale } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="w-full border-t border-slate-800 bg-slate-950 py-16 px-6">
      <div className="max-w-7xl mx-auto">
        
        {/* ✅ Omezení odpovědnosti - Vycentrovaný a důstojný štít */}
        <div className="mb-16 p-8 bg-slate-900/30 border border-white/5 rounded-3xl flex flex-col items-center gap-4 text-center transition-all hover:border-purple-500/20">
          <div className="flex items-center gap-3 text-purple-400">
            <Scale size={24} className="opacity-80" />
            <span className="text-xs font-black uppercase tracking-[0.3em]">Omezení odpovědnosti</span>
          </div>
          <p className="text-sm sm:text-base text-slate-400 leading-relaxed italic max-w-2xl">
            Poslední rozhodnutí o interakci se zprávou je <strong className="text-white">vždy na vás</strong>. AI je rádce, ne prorok. 
            NeKlikni.cz negarantuje 100% přesnost analýzy a nenese odpovědnost za následná rozhodnutí uživatele.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
          
          {/* Identita firmy */}
          <div className="space-y-4">
            <div className="font-black text-2xl italic text-white tracking-tighter">
              NeKlikni<span className="text-purple-500">.cz</span>
            </div>
            <div className="text-sm text-slate-500 space-y-2 font-medium text-left">
              <p className="font-bold text-slate-300 text-base">PK Virgine, s.r.o.</p>
              <div className="grid grid-cols-2 gap-x-4 max-w-xs">
                <p>IČO: <span className="text-slate-400">21448507</span></p>
                <p>DIČ: <span className="text-slate-400">CZ21448507</span></p>
              </div>
              <p className="text-slate-400 pt-1">
                Korunní 2569/108, Vinohrady<br />
                101 00 Praha 10
              </p>
            </div>
          </div>

          {/* Legislativa a Kontakt */}
          <div className="flex flex-col md:items-end gap-3 text-sm">
            <h4 className="text-slate-300 font-bold mb-2 uppercase tracking-widest text-xs">Právní náležitosti</h4>
            <Link href="/vop" className="text-slate-500 hover:text-purple-400 transition-colors">
              Obchodní podmínky (VOP)
            </Link>
            <Link href="/gdpr" className="text-slate-500 hover:text-purple-400 transition-colors">
              Ochrana osobních údajů (GDPR)
            </Link>
            <Link href="/cookies" className="text-slate-500 hover:text-purple-400 transition-colors">
              Nastavení cookies
            </Link>
            <Link href="/kontakt" className="text-slate-500 hover:text-purple-400 transition-colors font-bold">
              Kontakt
            </Link>
            
            <div className="mt-8 pt-8 border-t border-slate-900 w-full md:w-auto text-center md:text-right">
              <p className="text-slate-700 text-[10px]">
                © {new Date().getFullYear()} NeKlikni.cz | ID datové schránky: bty8mey
              </p>
            </div>
          </div>

        </div>
      </div>
    </footer>
  );
}