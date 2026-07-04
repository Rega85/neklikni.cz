/**
 * GET /api/og?score=8
 *
 * Dynamický OG obrázek pro sdílení výsledku kvízu "Poznáš podvod?".
 * next/og ImageResponse (Satori) — HTML/JSX vykreslené do PNG na
 * edge, NE AI generovaný obrázek.
 *
 * Bere JEN validované skóre 0-10. Úroveň se dopočítá server-side ze
 * stejné lib/quiz/levels.ts, kterou používá i /api/test/submit — žádný
 * libovolný text (label, emoji, ...) nejde protlačit přes URL parametry.
 */

import { ImageResponse } from "next/og";
import { levelForScore } from "@/lib/quiz/levels";

export const runtime = "edge";

function parseScore(raw: string | null): number | null {
  if (raw === null) return null;
  if (!/^\d+$/.test(raw)) return null;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 0 || n > 10) return null;
  return n;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const score = parseScore(searchParams.get("score"));
  if (score === null) {
    return new Response("Neplatné skóre", { status: 400 });
  }
  const level = levelForScore(score);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#0b0f19",
          color: "#f5f7fb",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            fontSize: 34,
            fontWeight: 700,
            marginBottom: 36,
          }}
        >
          <span style={{ color: "#f5f7fb" }}>NEKLIKNI</span>
          <span style={{ color: "#5b8def" }}>.CZ</span>
        </div>

        <div style={{ display: "flex", fontSize: 170, lineHeight: 1 }}>{level.emoji}</div>

        <div style={{ display: "flex", fontSize: 96, fontWeight: 800, marginTop: 24 }}>
          {score} / 10
        </div>

        <div style={{ display: "flex", fontSize: 52, fontWeight: 700, color: "#5b8def", marginTop: 8 }}>
          {level.label}
        </div>

        <div style={{ display: "flex", fontSize: 28, color: "#9aa4b8", marginTop: 40 }}>
          Poznáš podvod? — otestuj se na neklikni.cz/test
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
