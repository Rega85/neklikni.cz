import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import crypto from "crypto";

export const runtime = "nodejs";

const FREE_MODEL = "claude-haiku-4-5-20251001";
const PRO_MODEL = "claude-sonnet-4-5-20250929";

// Admin klient (service role) - jen pro anonymní IP tracking
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const text = (body?.text ?? "").toString().trim();

    if (!text) {
      return NextResponse.json({ error: "Chybí text k analýze" }, { status: 400 });
    }

    // Vytvoř session klient (s cookies přihlášeného uživatele)
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll() {},
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();

    // Výchozí nastavení
    let tier = "free";
    let modelToUse = FREE_MODEL;
    let maxChars = 4000;
    let systemPrompt =
      'Jsi expert na kyberbezpečnost. Analyzuj text a vrať POUZE validní JSON: {"risk": 0-100, "verdict": "Stručně (max 2 věty) proč je to bezpečné/podvod."}';

    // --- PŘIHLÁŠENÝ UŽIVATEL ---
    if (user) {
      // Zjisti tier (bez odečtu kreditů)
      const { data: profile } = await supabaseAdmin
        .from("user_profiles")
        .select("tier")
        .eq("id", user.id)
        .single();

      tier = profile?.tier ?? "free";

      if (tier === "pro" || tier === "elite") {
        modelToUse = PRO_MODEL;
        maxChars = 12000;
        systemPrompt =
          'Jsi elitní expert na kyberbezpečnost. Vrať POUZE validní JSON: {"risk": 0-100, "verdict": "Popiš taktiky manipulace + 2 konkrétní kroky co dělat. Max 5 vět."}';
      }

      // Hard limit na délku PŘED odečtem kreditů
      if (text.length > maxChars) {
        return NextResponse.json(
          { risk: 0, verdict: `Text je příliš dlouhý. Maximum je ${maxChars} znaků.` },
          { status: 400 }
        );
      }

      // Odečti kredit (přes session klienta s auth.uid())
      const { data: accessData, error: rpcError } = await supabase.rpc("consume_access", {
        p_input_chars: text.length,
        p_model_used: modelToUse,
        p_risk_score: null,
      });

      if (rpcError) {
        console.error("RPC Error:", rpcError);
        return NextResponse.json({ error: "Chyba při ověřování limitů." }, { status: 500 });
      }

      if (!accessData?.ok) {
        const msg =
          accessData?.reason === "daily_free_limit"
            ? "Vyčerpal jsi 3 free analýzy na dnešek. Přejdi na Basic nebo Pro."
            : "Kredity vyčerpány. Přejdi na vyšší tarif.";
        return NextResponse.json({ risk: "LIMIT", verdict: msg }, { status: 429 });
      }

    } else {
      // --- ANONYMNÍ UŽIVATEL (IP rate limit) ---
      if (text.length > maxChars) {
        return NextResponse.json(
          { risk: 0, verdict: `Text je příliš dlouhý. Maximum je ${maxChars} znaků.` },
          { status: 400 }
        );
      }

      const pepper = process.env.IP_PEPPER;
      if (!pepper) {
        console.error("Missing IP_PEPPER");
        return NextResponse.json({ error: "Chybí konfigurace serveru." }, { status: 500 });
      }

      const xff = req.headers.get("x-forwarded-for") || "unknown";
      const ip = xff.split(",")[0].trim();
      const ipHash = crypto.createHash("sha256").update(ip + pepper).digest("hex");
      const today = new Date().toISOString().split("T")[0];

      const { data: checks, error: checkErr } = await supabaseAdmin.rpc("increment_usage_daily", {
        p_ip_hash: ipHash,
        p_day: today,
      });

      if (checkErr) {
        console.error("IP check error:", checkErr);
        return NextResponse.json({ error: "Chyba limitu." }, { status: 500 });
      }

      if ((checks as number) > 3) {
        return NextResponse.json(
          { risk: "LIMIT", verdict: "Využil jsi 3 analýzy zdarma. Přihlas se pro více." },
          { status: 429 }
        );
      }
    }

    // --- VOLÁNÍ AI ---
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Chybí ANTHROPIC_API_KEY." }, { status: 500 });
    }

    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: modelToUse,
        max_tokens: 400,
        temperature: 0.1,
        system: systemPrompt,
        messages: [{ role: "user", content: text }],
      }),
    });

    if (!anthropicRes.ok) {
      const errTxt = await anthropicRes.text().catch(() => "");
      console.error("Anthropic error:", anthropicRes.status, errTxt);
      return NextResponse.json({ risk: 0, verdict: "AI selhalo. Zkus to za chvíli." }, { status: 502 });
    }

    const aiData = await anthropicRes.json();
    const raw = aiData?.content?.[0]?.text ?? "{}";

    let resultJson: any;
    try {
      const cleaned = raw.replace(/^```json\s*/i, "").replace(/\s*```$/, "").trim();
      resultJson = JSON.parse(cleaned);
    } catch {
      resultJson = { risk: 50, verdict: "Nepodařilo se přečíst odpověď AI." };
    }

    return NextResponse.json(resultJson);
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json({ risk: 0, verdict: "Něco se pokazilo. Zkus to za chvíli." }, { status: 500 });
  }
}