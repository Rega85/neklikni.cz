"use client";

import { AlertTriangle } from "lucide-react";
import Link from "next/link";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center p-6 text-center">
      <AlertTriangle className="w-16 h-16 text-red-500 mb-6" />
      <h1 className="text-3xl font-black text-white mb-3 tracking-tighter">
        Něco se pokazilo
      </h1>
      <p className="text-slate-400 mb-8 max-w-sm leading-relaxed">
        Omlouváme se za potíže. Zkuste stránku obnovit nebo se vraťte na hlavní stránku.
      </p>
      <div className="flex gap-4 flex-wrap justify-center">
        <button
          onClick={reset}
          className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl transition-colors"
        >
          Zkusit znovu
        </button>
        <Link
          href="/"
          className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl transition-colors"
        >
          Zpět na hlavní stránku
        </Link>
      </div>
    </div>
  );
}
