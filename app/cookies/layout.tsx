import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Zásady cookies | NeKlikni.cz",
  description: "Jak NeKlikni.cz používá soubory cookies a jak je můžete spravovat.",
};

export default function CookiesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
