import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ceník | NeKlikni.cz",
  description:
    "Vyberte si tarif NeKlikni.cz — EASY (29 Kč / 10 analýz), BASIC (99 Kč/měs.), nebo PRO (199 Kč/měs. s modelem Claude Opus).",
  openGraph: {
    title: "Ceník | NeKlikni.cz",
    description: "Tarify pro AI ochranu proti phishingu a podvodům. Začněte již od 29 Kč.",
  },
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
