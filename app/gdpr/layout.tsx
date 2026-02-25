import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ochrana osobních údajů (GDPR) | NeKlikni.cz",
  description: "Informace o zpracování osobních údajů na NeKlikni.cz v souladu s nařízením GDPR.",
};

export default function GdprLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
