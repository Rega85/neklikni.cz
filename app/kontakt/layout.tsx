import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Kontakt | NeKlikni.cz",
  description: "Máte otázku nebo problém? Napište nám — ozveme se co nejdříve.",
};

export default function KontaktLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
