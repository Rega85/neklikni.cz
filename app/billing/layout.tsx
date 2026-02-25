import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Fakturace & předplatné | NeKlikni.cz",
  description: "Správa vašeho předplatného, historii plateb a kreditů na NeKlikni.cz.",
};

export default function BillingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}