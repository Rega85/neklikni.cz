import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Můj profil | NeKlikni.cz",
  description: "Správa vašeho účtu a kreditů na NeKlikni.cz",
};

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}