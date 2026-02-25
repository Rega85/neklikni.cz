import { SearchX } from "lucide-react";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center p-6 text-center">
      <SearchX className="w-16 h-16 text-purple-500 mb-6" />
      <h1 className="text-7xl font-black text-white mb-4 tracking-tighter">404</h1>
      <p className="text-slate-400 mb-8 max-w-sm leading-relaxed">
        Tato stránka neexistuje nebo byla přesunuta.
      </p>
      <Link
        href="/"
        className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl transition-colors"
      >
        Zpět na hlavní stránku
      </Link>
    </div>
  );
}
