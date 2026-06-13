import { SearchX } from "lucide-react";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
      <SearchX className="w-16 h-16 text-primary mb-6" />
      <h1 className="text-7xl font-black text-foreground mb-4 tracking-tighter">404</h1>
      <p className="text-muted-foreground mb-8 max-w-sm leading-relaxed">
        Tato stránka neexistuje nebo byla přesunuta.
      </p>
      <Link
        href="/"
        className="px-6 py-3 bg-primary hover:brightness-110 text-primary-foreground font-bold rounded-xl transition-colors"
      >
        Zpět na hlavní stránku
      </Link>
    </div>
  );
}
