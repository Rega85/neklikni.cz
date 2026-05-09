import { ShieldCheck, Lock, RotateCcw } from "lucide-react";
import Link from "next/link";
import CookieSettingsButton from "./CookieSettingsButton";
import BrandLogo from "./BrandLogo";

export default function Footer() {
  return (
    <footer className="w-full bg-[#020617] mt-auto border-t border-white/5 pt-10 pb-4">
      <div className="max-w-7xl mx-auto px-6 mb-8 flex flex-wrap justify-center gap-x-8 gap-y-3 text-xs text-slate-400">
        <span className="inline-flex items-center gap-1.5"><ShieldCheck size={14} className="text-green-400" /> 100% anonymní</span>
        <span className="inline-flex items-center gap-1.5"><Lock size={14} className="text-green-400" /> Zprávy se neukládají</span>
        <span className="inline-flex items-center gap-1.5"><RotateCcw size={14} className="text-green-400" /> Zrušit kdykoli</span>
      </div>
      <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-start justify-between gap-8 text-xs text-slate-500">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <BrandLogo size={22} />
            <span className="font-black text-white uppercase tracking-tighter text-sm">
              NEKLIKNI<span className="brand-gradient-text">.CZ</span>
            </span>
          </div>
          <p>© 2026 Všechna práva vyhrazena.</p>
        </div>
        <div className="flex flex-col md:flex-row gap-8 md:gap-16">
          <div className="space-y-1 leading-relaxed">
            <p className="text-slate-300 font-bold mb-2 uppercase text-[10px] tracking-widest">Provozovatel</p>
            <p>PK Virgine, s.r.o.</p>
            <p>IČO: 21448507, DIČ: CZ21448507</p>
            <p>Korunní 2569/108, Vinohrady, 101 00 Praha</p>
            <p>Datová schránka: bty8mey</p>
            <p>Spisová značka: C 401405/MSPH Městský soud v Praze</p>
          </div>
          <div className="space-y-2 flex flex-col">
            <p className="text-slate-300 font-bold mb-1 uppercase text-[10px] tracking-widest">Informace</p>
            <Link href="/blog" className="hover:text-white transition-colors">Blog</Link>
            <Link href="/pricing" className="hover:text-white transition-colors">Ceník</Link>
            <Link href="/gdpr" className="hover:text-white transition-colors">Ochrana osobních údajů</Link>
            <Link href="/vop" className="hover:text-white transition-colors">Obchodní podmínky</Link>
            <Link href="/kontakt" className="hover:text-white transition-colors">Kontakt</Link>
            <Link href="/cookies" className="hover:text-white transition-colors">Cookies</Link>
            <CookieSettingsButton className="text-left hover:text-white transition-colors" />
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-6 mt-6 pt-4 border-t border-white/5 text-[10px] text-slate-600 text-center leading-relaxed">
        Výsledky analýzy vygenerované umělou inteligencí mají informativní charakter. Technologie se může mýlit — poslední rozhodnutí je vždy na Vás.
      </div>
    </footer>
  );
}
