"use client";

import { useState } from "react";
import { Share2, Swords, Link2, Check } from "lucide-react";

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
  const [copied, setCopied] = useState(false);

  function resultUrl(mode: "result" | "challenge") {
    return `${window.location.origin}/test/vysledek?s=${score}&mode=${mode}`;
  }

  function openShare(mode: "result" | "challenge") {
    // ŽÁDNÉ pevné width/height — malý popup (600x500) spouští Facebooku
    // interní "share_channel" flow, který parametr u= nepřenese (ověřeno
    // na produkci: skončí v prázdném composeru). Plnohodnotný nový tab
    // dá klasický sharer.php dialog se skutečně naší URL.
    window.open(fbShareUrl(resultUrl(mode)), "_blank", "noopener,noreferrer");
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(resultUrl("result"));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard API nedostupné (starý prohlížeč, http kontext) — tiše
      // neuspět, tlačítka na FB pořád fungují jako záloha.
    }
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
      <button
        type="button"
        onClick={copyLink}
        className="col-span-2 inline-flex items-center justify-center gap-1.5 border border-border bg-secondary/40 hover:bg-secondary text-foreground font-semibold px-3 py-2.5 rounded-xl text-sm transition-colors"
      >
        {copied ? (
          <>
            <Check size={15} className="text-success" /> Zkopírováno
          </>
        ) : (
          <>
            <Link2 size={15} /> Zkopírovat odkaz
          </>
        )}
      </button>
    </div>
  );
}
