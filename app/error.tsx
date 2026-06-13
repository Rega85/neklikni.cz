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
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
      <AlertTriangle className="w-16 h-16 text-destructive mb-6" />
      <h1 className="text-3xl font-black text-foreground mb-3 tracking-tighter">
        Něco se pokazilo
      </h1>
      <p className="text-muted-foreground mb-8 max-w-sm leading-relaxed">
        Omlouváme se za potíže. Zkuste stránku obnovit nebo se vraťte na hlavní stránku.
      </p>
      <div className="flex gap-4 flex-wrap justify-center">
        <button
          onClick={reset}
          className="px-6 py-3 bg-secondary hover:bg-secondary/70 text-foreground font-bold rounded-xl transition-colors"
        >
          Zkusit znovu
        </button>
        <Link
          href="/"
          className="px-6 py-3 bg-primary hover:brightness-110 text-primary-foreground font-bold rounded-xl transition-colors"
        >
          Zpět na hlavní stránku
        </Link>
      </div>
    </div>
  );
}
