/**
 * Faux prohlížeč — zjednodušený "chrome" s adresním řádkem a obsahem
 * stránky. Doménové chytáky (typosquatting, podezřelá TLD, cizí
 * doména v adrese) stojí na tom, že hráč adresní řádek DOČTE — proto
 * je domain vizuálně nejvýraznější prvek celé komponenty, ne drobný
 * detail schovaný v rohu.
 */

import { Lock } from 'lucide-react';

interface BrowserMockProps {
  domain: string;
  body: string;
}

export default function BrowserMock({ domain, body }: BrowserMockProps) {
  return (
    <div className="rounded-2xl border border-border overflow-hidden">
      <div className="bg-secondary/80 border-b border-border px-3 py-2.5 sm:px-3.5">
        <div className="hidden sm:flex items-center gap-1.5 mb-2" aria-hidden="true">
          <span className="w-2.5 h-2.5 rounded-full bg-red-400/70" />
          <span className="w-2.5 h-2.5 rounded-full bg-yellow-400/70" />
          <span className="w-2.5 h-2.5 rounded-full bg-green-400/70" />
        </div>
        <div className="flex items-center gap-2 rounded-full bg-background border border-border px-3 py-2">
          <Lock size={13} className="text-muted-foreground shrink-0" />
          <span className="font-mono text-sm sm:text-[15px] font-semibold text-foreground break-all">
            {domain}
          </span>
        </div>
      </div>
      <div className="bg-white p-4 text-[15px] leading-relaxed text-gray-800 whitespace-pre-line break-words">
        {body}
      </div>
    </div>
  );
}
