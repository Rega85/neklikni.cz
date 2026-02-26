import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Registrace | NeKlikni.cz",
  description: "Vytvořte si účet a získejte více analýz podezřelých zpráv",
};

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
