import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Přihlášení | NeKlikni.cz",
  description: "Přihlaste se ke svému účtu NeKlikni.cz a chraňte se před phishingem.",
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
