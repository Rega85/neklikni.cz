import type { Metadata } from "next";
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
        <QuizGame />
      </div>
    </main>
  );
}
