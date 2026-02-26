import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Změna hesla | NeKlikni.cz",
  description: "Nastavte si nové heslo k účtu",
};

export default function UpdatePasswordLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
