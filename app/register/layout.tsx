import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Registrace | NeKlikni.cz",
  description: "Vytvořte si účet NeKlikni.cz a začněte chránit sebe i ostatní před phishingovými útoky.",
};

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
