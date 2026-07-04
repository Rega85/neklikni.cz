import type { Metadata } from "next";
import Link from "next/link";
import { Trophy } from "lucide-react";
import PageHero from "@/app/components/PageHero";
import QuizGame from "./QuizGame";

export const metadata: Metadata = {
  title: "Poznáš podvod? — Otestuj se | Neklikni.cz",
  description:
    "10 reálných scénářů SMS, e-shopů a e-mailů. Poznáš, co je podvod? Zjisti svou úroveň a sdílej výsledek.",
};

export default function TestPage() {
  return (
    <main className="min-h-screen">
      <PageHero
        tag="Otestuj se"
        title="Poznáš"
        highlight="podvod?"
        description="10 reálných scénářů — SMS, e-shopy, e-maily. U každého řekni, jestli je to podvod. Na konci zjistíš svou úroveň."
      />
      <div className="mx-auto max-w-lg px-4 py-10 sm:py-14">
        <div className="flex justify-center mb-5">
          <Link
            href="/test/zebricek"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <Trophy size={14} /> Žebříček nejlepších
          </Link>
        </div>
        <QuizGame />
      </div>
    </main>
  );
}
