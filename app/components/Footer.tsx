import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="w-full border-t border-slate-800 bg-slate-950 py-16 px-6">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
        
        {/* Identita a Firma */}
        <div className="space-y-4">
          <div className="font-black text-2xl italic text-white tracking-tighter">
            NeKlikni<span className="text-purple-500">.cz</span>
          </div>
          <div className="text-sm text-slate-500 space-y-2 font-medium">
            <p className="font-bold text-slate-300 text-base">PK Virgine, s.r.o.</p>
            <div className="grid grid-cols-2 gap-x-4 max-w-xs">
              <p>IČO: <span className="text-slate-400">21448507</span></p>
              <p>DIČ: <span className="text-slate-400">CZ21448507</span></p>
            </div>
            <p className="text-slate-400 pt-1">
              Korunní 2569/108, Vinohrady<br />
              101 00 Praha 10
            </p>
            <p className="pt-4 text-[10px] leading-tight opacity-40 uppercase tracking-widest">
              Zapsáno v obchodním rejstříku vedeném Městským soudem v Praze.
            </p>
          </div>
        </div>

        {/* Legislativa a Odkazy */}
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
          
          <div className="mt-8 pt-8 border-t border-slate-900 w-full md:w-auto text-center md:text-right">
            <p className="text-slate-700 text-[10px]">
              © {new Date().getFullYear()} NeKlikni.cz | ID datové schránky: bty8mey
            </p>
          </div>
        </div>

      </div>
    </footer>
  );
}