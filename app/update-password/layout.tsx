import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Změna hesla | NeKlikni.cz",
  description: "Nastavte si nové heslo ke svému účtu NeKlikni.cz.",
};

export default function UpdatePasswordLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
