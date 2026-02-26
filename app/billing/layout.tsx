import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Předplatné | NeKlikni.cz",
  description: "Správa předplatného a platebních údajů",
};

export default function BillingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}