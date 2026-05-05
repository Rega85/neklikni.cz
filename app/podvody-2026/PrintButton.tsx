"use client";

import { Printer } from "lucide-react";

export default function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/15 text-white px-4 py-2 rounded-xl text-xs font-bold transition-colors"
    >
      <Printer size={14} /> Stáhnout / vytisknout
    </button>
  );
}
