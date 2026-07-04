import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { levelForScore } from "@/lib/quiz/levels";
import ResultShareView from "./ResultShareView";

interface PageProps {
  searchParams: Promise<{ s?: string; mode?: string }>;
}

function parseScore(raw: string | undefined): number | null {
  if (raw === undefined || !/^\d+$/.test(raw)) return null;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 0 || n > 10) return null;
  return n;
}

// Dvě formulace OG description podle módu — "vlastní výsledek" vs.
// "výzva kamarádovi". Facebooku sharer.php dnes v praxi ignoruje predvyplněný
// text composeru (quote parametr), řídí to jen OG title/description dané
// URL — proto obě varianty žijí na jiné query string kombinaci, ne v JS.
function buildOgCopy(score: number, mode: string) {
  const level = levelForScore(score);
  if (mode === "challenge") {
    return {
      title: `Zvládneš to líp než ${level.label.toLowerCase()} (${score}/10)?`,
      description: `Myslíš, že poznáš podvod líp než já? Zkus kvíz Poznáš podvod? na neklikni.cz.`,
    };
  }
  return {
    title: `${level.emoji} ${level.label} — ${score}/10 v kvízu Poznáš podvod?`,
    description: `Otestoval/a jsem se v kvízu Poznáš podvod? na neklikni.cz. Zkus to taky!`,
  };
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const { s, mode: rawMode } = await searchParams;
  const score = parseScore(s);
  const mode = rawMode === "challenge" ? "challenge" : "result";

  if (score === null) {
    return { title: "Poznáš podvod? | Neklikni.cz" };
  }

  const { title, description } = buildOgCopy(score, mode);
  const ogImage = `/api/og?score=${score}`;

  return {
    title: `${title} | Neklikni.cz`,
    description,
    openGraph: {
      title,
      description,
      images: [{ url: ogImage, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
    robots: { index: false, follow: false },
  };
}

export default async function ResultSharePage({ searchParams }: PageProps) {
  const { s } = await searchParams;
  const score = parseScore(s);
  if (score === null) redirect("/test");

  return <ResultShareView score={score} />;
}
