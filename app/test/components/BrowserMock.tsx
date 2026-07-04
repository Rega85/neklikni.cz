/**
 * Faux prohlížeč — zjednodušený "chrome" s adresním řádkem a obsahem
 * stránky, v barvách webu (--card/--secondary/--primary), ne bílý
 * ostrov. Doménové chytáky stojí na tom, že hráč adresní řádek DOČTE —
 * proto je domain vizuálně nejvýraznější prvek, barevně zvýrazněný
 * primary tónem shodným s brandem.
 */

import { Lock } from 'lucide-react';

interface BrowserMockProps {
  domain: string;
  body: string;
}

export default function BrowserMock({ domain, body }: BrowserMockProps) {
  return (
    <div className="rounded-2xl border border-border/60 overflow-hidden bg-secondary/15">
      <div className="bg-secondary/40 border-b border-border/60 px-3 py-2.5 sm:px-3.5">
        <div className="hidden sm:flex items-center gap-1.5 mb-2" aria-hidden="true">
          <span className="w-2.5 h-2.5 rounded-full bg-destructive/60" />
          <span className="w-2.5 h-2.5 rounded-full bg-warning/60" />
          <span className="w-2.5 h-2.5 rounded-full bg-success/60" />
        </div>
        <div className="flex items-center gap-2 rounded-full bg-background/70 border border-border/60 px-3 py-2">
          <Lock size={13} className="text-primary shrink-0" />
          <span className="font-mono text-sm sm:text-[15px] font-semibold text-foreground break-all">
            {domain}
          </span>
        </div>
      </div>
      <div className="p-4 text-[15px] leading-relaxed text-foreground/90 whitespace-pre-line break-words">
        {body}
      </div>
    </div>
  );
}
