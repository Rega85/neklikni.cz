import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Platba úspěšná | NeKlikni.cz",
  description: "Vaše platba byla úspěšně zpracována",
};

export default function BillingSuccessLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
