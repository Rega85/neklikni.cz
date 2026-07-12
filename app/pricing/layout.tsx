import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ceník | NeKlikni.cz",
  description:
    "Vyberte si tarif NeKlikni.cz — JEDNORÁZOVÁ (49 Kč / 1 analýza), nebo FULL (79 Kč/měs. nebo 790 Kč/rok, neomezené ověřování, 7 dní zdarma).",
  openGraph: {
    title: "Ceník | NeKlikni.cz",
    description: "Tarify pro AI ochranu proti phishingu a podvodům. Vyzkoušejte zdarma, prémiová analýza od 49 Kč.",
  },
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
