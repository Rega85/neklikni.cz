import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Platba proběhla úspěšně | NeKlikni.cz",
  description: "Děkujeme za nákup. Vaše kredity byly připsány a můžete začít analyzovat.",
};

export default function BillingSuccessLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
