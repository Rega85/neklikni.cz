/**
 * /overit — sjednocený vstup (Fáze 3), napojený na POST /api/check.
 *
 * VEDLE existující homepage a /databaze/hledat, ne náhrada — přepnutí
 * a úklid starých cest je Fáze 4. Zatím bez odkazu z hlavní navigace,
 * dostupné jen přímou URL.
 */

import type { Metadata } from "next";
import { getRecentPublishedIncidents } from "@/app/databaze/_lib/recentIncidents";
import OveritClient from "./OveritClient";

export const metadata: Metadata = {
  title: "Ověřit zprávu, odkaz nebo kontakt | NeKlikni.cz",
  description:
    "Vlož podezřelou zprávu, odkaz, telefon, číslo účtu nebo e-mail — okamžitě zkontrolujeme databázi nahlášených podvodů a AI analýzu.",
  openGraph: {
    title: "Ověřit zprávu, odkaz nebo kontakt | NeKlikni.cz",
    description: "Jedno pole, okamžitá kontrola databáze i AI analýza podezřelé komunikace.",
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
