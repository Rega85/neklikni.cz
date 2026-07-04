import type { Metadata } from "next";
import Link from "next/link";
import { Trophy, ArrowRight } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import PageHero from "@/app/components/PageHero";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Žebříček — Poznáš podvod? | Neklikni.cz",
  description: "TOP 10 nejlepších skóre v kvízu Poznáš podvod?.",
};

const MEDALS = ["🥇", "🥈", "🥉"];
// TOP 10 — víc by na startu (skoro prázdný žebříček) vypadalo mrtvě.
// Až budou stovky hráčů, stačí zvýšit tohle číslo.
const LEADERBOARD_SIZE = 10;

export default async function LeaderboardPage() {
  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("quiz_leaderboard")
    .select("display_name, best_score, completed_at")
    .order("best_score", { ascending: false })
    .order("completed_at", { ascending: true })
    .limit(LEADERBOARD_SIZE);

  return (
    <main className="min-h-screen">
      <PageHero
        tag="Žebříček"
        title="Nejlepší"
        highlight="v kvízu"
        description="TOP 10 podle skóre v Poznáš podvod?. Chceš se tam dostat taky?"
      />
      <div className="mx-auto max-w-lg px-4 py-10 sm:py-14">
        {!rows || rows.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <Trophy size={28} className="mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">
              Zatím tu nikdo není — buď první, kdo se objeví na žebříčku!
            </p>
          </div>
        ) : (
          <ol className="space-y-2">
            {rows.map((row, i) => (
              <li
                key={`${row.display_name}-${i}`}
                className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3"
              >
                <span className="w-8 text-center text-lg font-bold text-muted-foreground shrink-0">
                  {MEDALS[i] ?? i + 1}
                </span>
                <span className="flex-1 font-semibold text-foreground truncate">{row.display_name}</span>
                <span className="text-primary font-bold shrink-0">{row.best_score}/10</span>
              </li>
            ))}
          </ol>
        )}

        <Link
          href="/test"
          className="mt-6 w-full inline-flex items-center justify-center gap-2 brand-gradient text-primary-foreground font-semibold px-6 py-3 rounded-xl shadow-lg shadow-primary/20 hover:brightness-110 transition-all active:scale-95"
        >
          Zahrát si kvíz <ArrowRight size={16} />
        </Link>
      </div>
    </main>
  );
}
