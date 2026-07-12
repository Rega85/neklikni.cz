/**
 * Sdílená AI analýza zprávy/odkazu na phishing a podvody (Claude API).
 *
 * Extrahováno z /api/analyze — použito i z /api/check (Fáze 2
 * sjednoceného vstupu). Stejná promptová šablona a výběr modelu podle
 * tarifu, žádné zdvojení.
 */

import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export const TIER_MODELS: Record<string, string> = {
  free:    "claude-haiku-4-5-20251001",
  oneshot: "claude-opus-4-5",     // 49 Kč jednorázová analýza
  full:    "claude-opus-4-5",     // 79 Kč/měs nebo 790 Kč/rok, neomezené (fair use) — novy cenik
  // DEPRECATED — starý ceník (0 aktivních předplatitelů k 2026-07),
  // checkout/pricing je už neprodávají. Ponecháno jako neškodný mrtvý
  // kód, ať nerozbije čtení historických shared_results.tier záznamů.
  // Smazat spolu s /api/analyze ve Fázi 4.
  easy:    "claude-opus-4-5",
  basic:   "claude-sonnet-4-5",
  pro:     "claude-opus-4-5",
};

const SYSTEM_PROMPT_FREE = `Jsi expert na kybernetickou bezpečnost a phishing.
Analyzuj zprávu a vrať POUZE validní JSON bez markdown bloků:
{
  "risk": číslo 0-100,
  "verdict": "krátký verdikt česky",
  "analysis": "stručná analýza česky (2-3 věty)",
  "threats": ["hrozba1", "hrozba2"],
  "recommendation": "doporučení česky"
}
DŮLEŽITÉ: Vždy odpovídej pouze v češtině s latinkou. Nikdy nepoužívej cyrilici, azbuku ani jiné nelatinkové znaky.`;

const SYSTEM_PROMPT_PRO = `Jsi expert na kybernetickou bezpečnost a phishing s hlubokými znalostmi sociálního inženýrství.
Analyzuj zprávu detailně a vrať POUZE validní JSON bez markdown bloků:
{
  "risk": číslo 0-100,
  "verdict": "verdikt česky",
  "analysis": "detailní analýza česky (4-6 vět)",
  "threats": ["hrozba1", "hrozba2", "hrozba3"],
  "tactics": ["taktika útočníka 1", "taktika útočníka 2"],
  "recommendation": "konkrétní doporučení česky",
  "details": {
    "sender_analysis": "analýza odesílatele",
    "urgency_indicators": ["indikátor naléhavosti"],
    "technical_indicators": ["technický indikátor"]
  }
}

IDENTIFIKACE PRODEJCE (vyhodnoť JEN pokud je relevantní):
Pokud z textu jasně vyplývá, že jde o NABÍDKU ZBOŽÍ/SLUŽBY, E-SHOP nebo
PRODEJCE (indikátory: ceny, "koupit"/"objednat", konkrétní produkt,
výprodej, sleva, platba předem apod.), aktivně vyhodnoť, jestli text/odkaz
obsahuje ověřitelnou identifikaci prodejce (IČO, název firmy, adresa,
kontakt):
- Pokud identifikace CHYBÍ → je to varovný signál. Zmiň v "threats" nebo
  "analysis", že nelze ověřit, kdo za nabídkou stojí — anonymní
  provozovatel je nejčastější znak rizikových e-shopů.
- Pokud identifikaci text UVÁDÍ → zmiň to jako mírně pozitivní signál,
  ale nikdy ne jako záruku (údaje mohou být falešné).
Tohle hodnocení NIKDY nepoužívej u obsahu, který zjevně není nabídka/
prodej (článek, video, sociální síť, encyklopedie, informační web) —
tam je absence IČO irelevantní a zmínit ji by byl falešný poplach.
Pokud si nejsi jistý, jestli jde o prodejce, tohle hodnocení radši
vynech, než abys vytvořil falešný poplach.

DŮLEŽITÉ: Vždy odpovídej pouze v češtině s latinkou. Nikdy nepoužívej cyrilici, azbuku ani jiné nelatinkové znaky.`;

// Cyrillic-to-Latin lookalike map (covers the most common confusables)
const CYRILLIC_MAP: Record<string, string> = {
  "А": "A", "В": "B", "С": "C", "Е": "E", "Н": "H", "І": "I",
  "К": "K", "М": "M", "О": "O", "Р": "P", "Т": "T", "Х": "X",
  "а": "a", "с": "c", "е": "e", "і": "i", "о": "o", "р": "p", "х": "x",
  "И": "N", "Ѕ": "S", "ѕ": "s",
};
const CYRILLIC_RE = new RegExp(Object.keys(CYRILLIC_MAP).join("|"), "g");

function decyrillize(s: string): string {
  return s.replace(CYRILLIC_RE, (ch) => CYRILLIC_MAP[ch] ?? ch);
}

function sanitizeCyrillic(data: any): any {
  if (typeof data === "string") return decyrillize(data);
  if (Array.isArray(data)) return data.map(sanitizeCyrillic);
  if (data && typeof data === "object") {
    const out: any = {};
    for (const k of Object.keys(data)) out[k] = sanitizeCyrillic(data[k]);
    return out;
  }
  return data;
}

function extractJson(raw: string): any {
  // Strip markdown code fences (```json ... ``` or ``` ... ```)
  const stripped = raw.replace(/```(?:json)?\s*/gi, "").replace(/```/g, "").trim();

  // Try direct parse first
  try { return JSON.parse(stripped); } catch {}

  // Walk the string finding balanced {} blocks and try each one
  let depth = 0;
  let start = -1;
  for (let i = 0; i < stripped.length; i++) {
    if (stripped[i] === "{") {
      if (depth === 0) start = i;
      depth++;
    } else if (stripped[i] === "}") {
      depth--;
      if (depth === 0 && start !== -1) {
        try { return JSON.parse(stripped.slice(start, i + 1)); } catch {}
        start = -1;
      }
    }
  }

  throw new Error("AI nevrátila validní JSON");
}

const RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 529]);

async function withRetry<T>(fn: () => Promise<T>, maxAttempts = 3): Promise<T> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      const isLast = attempt === maxAttempts;
      const retryable =
        RETRYABLE_STATUSES.has(err?.status) ||
        String(err?.message).toLowerCase().includes('timeout') ||
        String(err?.message).toLowerCase().includes('overloaded');
      if (isLast || !retryable) throw err;
      await new Promise((r) => setTimeout(r, attempt * 1000));
    }
  }
  throw new Error('unreachable');
}

export async function runAnalysis(text: string | null, tier: string, images: string[] = []) {
  const model = TIER_MODELS[tier] || TIER_MODELS.free;
  const basePrompt = ["pro", "easy", "full"].includes(tier) ? SYSTEM_PROMPT_PRO : SYSTEM_PROMPT_FREE;
  // Dynamický prefix — model nezná aktuální datum, bez toho označuje
  // včerejší/dnešní data jako "z budoucnosti". Europe/Prague = CET/CEST.
  const todayPrague = new Date().toLocaleDateString("cs-CZ", {
    timeZone: "Europe/Prague",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const systemPrompt =
    `Dnešní datum je ${todayPrague}. Datum v minulosti ani dnešní datum NENÍ samo o sobě` +
    ` indikátor podvodu — podezřelé je pouze datum jasně v budoucnosti vůči dnešku.\n\n` +
    basePrompt;
  const maxTokens = ["pro", "easy", "full"].includes(tier) ? 2000 : tier === "basic" ? 1500 : 800;

  let userContent: any;
  if (images.length > 0) {
    const imageBlocks = images.map((b64) => {
      const match = b64.match(/^data:(image\/[a-zA-Z]+);base64,(.+)$/);
      const mediaType = (match?.[1] ?? "image/jpeg") as "image/jpeg" | "image/png" | "image/webp";
      const data = match?.[2] ?? b64;
      return { type: "image", source: { type: "base64", media_type: mediaType, data } };
    });
    const instructionText =
      images.length === 1
        ? "Nejdříve extrahuj veškerý text z tohoto obrázku, poté ho analyzuj na phishing/podvodné indikátory. Odpověz ve stejném JSON formátu."
        : `Toto je ${images.length} screenshotů jedné zprávy nebo konverzace (rozdělené napříč více obrázky). Posuď je jako JEDEN celek: extrahuj veškerý text ze všech screenshotů, slož ho dohromady v pořadí ${images.length} obrázků a analyzuj výsledný celek na phishing/podvodné indikátory. Odpověz ve stejném JSON formátu.`;
    userContent = [
      ...imageBlocks,
      { type: "text", text: instructionText },
    ];
  } else {
    userContent = `Analyzuj tuto zprávu/odkaz na phishing a podvody:\n\n${text}`;
  }

  const msg = await withRetry(() => anthropic.messages.create({
    model,
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: [{ role: "user", content: userContent }],
  }));

  const raw = msg.content[0].type === "text" ? msg.content[0].text : "";
  const aiData = sanitizeCyrillic(extractJson(raw));
  if (typeof aiData.risk !== "number" || !aiData.verdict) throw new Error("Neúplná AI odpověď");

  return aiData;
}
