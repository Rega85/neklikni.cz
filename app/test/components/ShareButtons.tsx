"use client";

import { Share2, Swords } from "lucide-react";

interface ShareButtonsProps {
  score: number;
}

function fbShareUrl(pageUrl: string): string {
  return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(pageUrl)}`;
}

// Facebook sharer.php dnes v praxi ignoruje predvyplněný text composeru
// (quote parametr) — co se ukáže, řídí OG title/description dané URL.
// Proto obě tlačítka míří na STEJNOU výsledkovou stránku, jen s jiným
// `mode` query parametrem — /test/vysledek si podle něj vybere jinou
// formulaci OG textu (viz generateMetadata tam).
export default function ShareButtons({ score }: ShareButtonsProps) {
  function openShare(mode: "result" | "challenge") {
    const pageUrl = `${window.location.origin}/test/vysledek?s=${score}&mode=${mode}`;
    window.open(fbShareUrl(pageUrl), "_blank", "noopener,noreferrer,width=600,height=500");
  }

  return (
    <div className="w-full grid grid-cols-2 gap-2">
      <button
        type="button"
        onClick={() => openShare("result")}
        className="inline-flex items-center justify-center gap-1.5 border border-border bg-secondary/40 hover:bg-secondary text-foreground font-semibold px-3 py-2.5 rounded-xl text-sm transition-colors"
      >
        <Share2 size={15} /> Sdílet výsledek
      </button>
      <button
        type="button"
        onClick={() => openShare("challenge")}
        className="inline-flex items-center justify-center gap-1.5 border border-primary/40 bg-primary/10 hover:bg-primary/20 text-primary font-semibold px-3 py-2.5 rounded-xl text-sm transition-colors"
      >
        <Swords size={15} /> Vyzvi kamaráda
      </button>
    </div>
  );
}
