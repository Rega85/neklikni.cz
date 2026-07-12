/**
 * /overit — sjednocený vstup, napojený na POST /api/check.
 *
 * Od Fáze 4 hlavní vstupní bod produktu — primární položka v Header
 * navigaci a embedovaný přímo na homepage (viz app/page.tsx). Tahle
 * stránka zůstává jako samostatná URL pro přímé odkazy a SEO.
 * /databaze/hledat zůstává na /api/databaze/search (jiná funkce —
 * procházení databáze, ne rychlé ověření).
 */

import type { Metadata } from "next";
import { getRecentPublishedIncidents } from "@/app/databaze/_lib/recentIncidents";
import OveritClient from "./OveritClient";

const URL = "https://www.neklikni.cz/overit";

export const metadata: Metadata = {
  title: "Ověřit zprávu, odkaz nebo kontakt | NeKlikni.cz",
  description:
    "Vlož podezřelou zprávu, odkaz, telefon, číslo účtu nebo e-mail — okamžitě zkontrolujeme databázi nahlášených podvodů a AI analýzu.",
  alternates: { canonical: URL },
  openGraph: {
    title: "Ověřit zprávu, odkaz nebo kontakt | NeKlikni.cz",
    description: "Jedno pole, okamžitá kontrola databáze i AI analýza podezřelé komunikace.",
    url: URL,
  },
};

export default async function OveritPage() {
  // Server-side fetch — jen pro klidový stav pravého panelu na desktopu
  // (RecentIncidentsPanel). Na mobilu se nevykresluje vůbec.
  const recentIncidents = await getRecentPublishedIncidents(4);

  return (
    <main className="flex-grow min-h-screen text-foreground pt-24 sm:pt-20 px-4 sm:px-6 pb-12">
      <div className="w-full max-w-md md:max-w-6xl mx-auto text-center mb-6 space-y-2">
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">Ověř dřív, než klikneš</h1>
        <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
          Zpráva, odkaz, telefon, účet nebo e-mail — vlož cokoliv, o čem si nejsi jistý/á.
        </p>
      </div>
      <OveritClient recentIncidents={recentIncidents} />
    </main>
  );
}
