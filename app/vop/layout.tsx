import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Všeobecné obchodní podmínky | NeKlikni.cz",
  description: "Obchodní podmínky služby NeKlikni.cz — analýza podezřelých odkazů a ochrana před phishingem.",
};

export default function VopLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
