/**
 * Porovnání Opus 4.5 (současný, TIER_MODELS.oneshot/full) vs Sonnet 5
 * (kandidát) na reálném PRO promptu z app/api/_lib/aiAnalysis.ts.
 *
 * Jednorázový rozhodovací nástroj pro swap TIER_MODELS.oneshot/full —
 * NEMĚNÍ produkční kód. Volá runAnalysis() se stejným system promptem,
 * cachingem a max_tokens jako produkce, jen s explicitním
 * modelOverride pro oba kandidáty.
 *
 * 13 zpráv je reálných z shared_results (produkční DB, různé
 * kategorie), 1 je synteticky sestavená (cyrilický homograf domény —
 * v databázi žádný takový případ zatím není).
 *
 * Použití: npx tsx scripts/compare-models.ts
 * Vyžaduje ANTHROPIC_API_KEY v .env.local.
 * Výstup: konzole (průběžně) + scripts/model-comparison-results.json
 */

import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";

// ── .env.local loader (bez nové závislosti na dotenv) ────
// Musí doběhnout PŘED importem aiAnalysis.ts — ten při importu rovnou
// vytváří `new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })`,
// takže statický import nahoře souboru by proběhl dřív, než by
// loadEnvLocal() stihla nastavit process.env (ESM importy jsou
// hoistované). Proto dynamický import až po loadEnvLocal() v main().
function loadEnvLocal() {
  try {
    const content = readFileSync(resolve(process.cwd(), ".env.local"), "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!(key in process.env)) process.env[key] = value;
    }
  } catch {
    // .env.local nenalezen — spoléhá na už exportované env proměnné
  }
}

const OPUS = "claude-opus-4-5";
const SONNET5 = "claude-sonnet-5";

function levelForScore(score: number): "green" | "orange" | "red" {
  if (score >= 80) return "red";
  if (score >= 40) return "orange";
  return "green";
}

interface TestCase {
  label: string;
  category: string;
  source: string; // shared_results id, nebo "synthetic"
  text: string;
}

// Cyrilické vizuální lookalike znaky (stejné jako CYRILLIC_MAP v aiAnalysis.ts)
const CYR_A = "а"; // а
const CYR_O = "о"; // о

const TEST_CASES: TestCase[] = [
  {
    label: "Bankovní phishing — ČSOB",
    category: "jasný phishing",
    source: "b1aa8b43-a290-4c85-aab7-05ded6b8f531",
    text: "Vážený kliente, Vaše karta byla zablokována z důvodu podezřelé aktivity. Pro okamžité odblokování klikněte na odkaz: www.csob-overeni.cz/login. Máte 24 hodin.",
  },
  {
    label: "Česká pošta — poplatek za balík",
    category: "jasný phishing",
    source: "41abbd37-0ea0-49e6-aebb-a0434a3d46d0",
    text: "Ceska posta: Vas balik nelze dorucit kvuli chybejicimu poplatku 29 Kc. Zaplaťte zde pro doručení: https://ceska-posta-doruceni.com/platba",
  },
  {
    label: "Finanční úřad — nedoplatek",
    category: "jasný phishing",
    source: "590a2a3e-17b0-4299-a3d0-331251f2dde0",
    text: "Finanční úřad ČR: Evidujeme u Vás nedoplatek na dani z příjmu ve výši 4.250 Kč. Pokud nezaplatíte do 48 hodin, bude zahájeno exekuční řízení. Platba zde: www.financni-urad-platby.cz",
  },
  {
    label: "Výhra iPhone v soutěži",
    category: "jasný phishing",
    source: "bbc53789-c22b-401e-8dc0-78dd5d9c1ef5",
    text: "GRATULUJEME! Byl/a jste vybrán/a jako výherce iPhone 16 Pro v naší soutěži. Pro vyzvednutí výhry vyplňte údaje zde: www.vyhry-cz.com/iphone",
  },
  {
    label: "DEBTCOLLECT.NET — plná výzva k zaplacení",
    category: "sofistikovaný podvod",
    source: "ebbcfeed-4b46-4b3a-8b95-bd6f21a8d688",
    text: `PŘEDMĚT: VÝZVA K ZAPLACENÍ ODŠKODNÉHO ZA NEPŘEVZETÍ A NEZAPLACENÍ
OBJEDNANÉ OBJEDNÁVKY ČÍSLO T1936558
Vážený/a Petra Jelenová,
naše advokátní kancelář zastupuje společnost DEBTCOLLECT.NET, claims management,
Ltd., Sokolska ulica 46, 2000 Maribor, registrační číslo: 9192557000, daňové identifikační
číslo: 95397647 (dále jen klient nebo náš klient), jak je patrné z přiložené plné moci.
Klient nás informoval, že od společnosti PJU d.o.o. - v stečaju, Italijanska ulica 8,
Ljubljana, 1000 Ljubljana, identifikační číslo: 8071080000, daňové číslo: SI87709066
(dále jen Prodávající) odkoupil pohledávku, kterou měl tento Prodávající vůči Vám, a to z
titulu náhrady škody z důvodu nepřevzetí a nezaplacení zásilky, související s Vaší
objednávkou č. T1936558, kterou jste učinil dne 29.12.2022, přičemž Prodávající pověřil
našeho klienta, aby Vás o tomto postoupení pohledávky informoval.
Z dokumentace našeho klienta vyplývá, že jste dne 29.12.2022 prostřednictvím
internetu objednal(a) výrobek. Potvrzením nákupu jste s naším klientem
uzavřel(a) kupní smlouvu. Přestože byl výrobek připraven a odeslán na Vaši
adresu prostřednictvím doručovací služby Česká pošta se sledovacím číslem
DR4377389564U, zásilku jste nepřevzal(a).
V důsledku Vašeho porušení smluvních povinností vznikla Prodávajícímu skutečná škoda
ve výši 304,39 Kč a mimosoudní náklady právního zastoupení ve výši 1.810,80 Kč, v
celkové výši 2.115,19 Kč (dále jen: Dluh).
Za účelem předcházení soudnímu vymáhání Vám nabízíme možnost smírného
mimosoudního urovnání: uhraďte nejpozději ve lhůtě 8 dnů částku 2.115,19 Kč.
Platbu můžete provést převodem na účet:
NÁZEV: DEBTCOLLECT.NET, claims management, Ltd.
ADRESA: Sokolska ulica 46, 2000 Maribor
IBAN: SI56 6000 0000 1221 786`,
  },
  {
    label: "DEBTCOLLECT.NET — krátký fragment (jen úvod)",
    category: "hraniční případ",
    source: "73370d9e-7adf-46c1-9a8c-6280d8a11d36",
    text: "Naše advokátní kancelář zastupuje společnost DEBTCOLLECT .NET, claims management, Ltd., se sídlem Sokolska ulica 46, 2000 Maribor, identifikační číslo: 9192557000, daňové číslo: 95397647 (dále jen: klient nebo náš klient), jak vyplývá z přiložené plné moci.",
  },
  {
    label: "PayPal Payment Remittance Advice (EN)",
    category: "sofistikovaný podvod",
    source: "597c24b1-3224-48a7-9396-bebae891ac0f",
    text: `PayPal
Payment Remittance Advice
Hi Menffisto
We are writing to confirm that your payment of $2040.61 USD has been successfully sent to Zane Wilkinson through your PayPal account.
Order Details:
Amount Sent: $2040.61 USD
Recipient: Zane Wilkinson
Status: Completed
Order No: #46581602
Payment Id: 331W79N62CCDXXC55
Date: Tuesday, June 02, 2026
The transaction has been processed successfully, and the funds have been deducted from your selected payment method.
If you authorized this payment, no further action is required.
If you do not recognize this transaction or believe it may have been made without your authorization, please contact PayPal Customer Support immediately for assistance.
Kind regards
PayPal Customer Service Team
+1 (808) 381-7791
+1 (805) 637-6214
(c) 2026 PayPal, LLC. All rights reserved.`,
  },
  {
    label: "Soutěž o tetování (SK, Instagram)",
    category: "hraniční případ",
    source: "797fcd2c-463d-444e-b07d-e0d9426d2a92",
    text: "SÚŤAŽ O TETOVANIE V HODNOTE 333 € ✨🎉\n\nMoje 33. narodeniny sa blížia a rozhodla som sa ich osláviť spolu s vami! 🖤\n\nAko poďakovanie za vašu podporu, dôveru a to, že ste súčasťou mojej cesty, môžete vyhrať tetovanie v hodnote 333 € v Atelier Ella Lord.",
  },
  {
    label: "Legitimní e-shop (angrybeards.cz)",
    category: "legitimní",
    source: "ca0b5bfa-2615-4b47-8219-314163d3599c",
    text: "https://www.angrybeards.cz/",
  },
  {
    label: "Self-XSS vzdělávací text (bezpečnost)",
    category: "legitimní",
    source: "bc7b0ab3-afe5-42ef-a3c4-1c2ba7d0c929",
    text: "Self-XSS je útok pomocou sociálneho inžinierstva, ktorý vás oklame a prinúti spustiť škodlivý JavaScript vo vašom vlastnom webovom prehliadači. Na rozdiel od tradičného Cross-Site Scriptingu (XSS), ktorý hackeri zneužívajú prostredníctvom zraniteľností webových stránok, Self-XSS vyžaduje manuálne kopírovanie a vkladanie škodlivého kódu – zvyčajne do konzoly pre vývojárov vášho prehliadača.",
  },
  {
    label: "Kontaktní údaje (jméno, IČ, adresa, účet)",
    category: "legitimní",
    source: "6cacf1f2-6060-4827-a9b3-d3062db3d477",
    text: "Martin Šebek\n\nIČ: 438 66 808\n\nJablonecká 419/64\n\n190 00 Praha 9\n\nČíslo účtu: 1028673877/5500",
  },
  {
    label: "Krátká nejasná nabídka",
    category: "hraniční případ",
    source: "4c26724c-7a41-4485-b3c1-9238187e936c",
    text: "ahoj, nechceš koupit auto? ",
  },
  {
    label: "Legitimní právní odpověď (stejné téma jako DEBTCOLLECT)",
    category: "legitimní",
    source: "e13696d2-8290-48ce-88bb-ea8ec89aa171",
    text: "Bereme na vědomí, že pohledávku rozporujete a uplatňujete námitku promlčení. Rádi bychom Vás však informovali, že předmětná pohledávka, která vznikla v důsledku nepřevzetí a nezaplacení objednaného zboží, je považována za náhradu škody za porušení kupní smlouvy. V takovém případě se obecně uplatňují jiná pravidla promlčení, než jaká jste uvedla. Věříme, že nárok je stále platný a vymahatelný.",
  },
  {
    label: "Cyrilický homograf domény (PayPal lookalike)",
    category: "sofistikovaný podvod (syntetický)",
    source: "synthetic",
    text: `Vážený zákazníku PayPal, zaznamenali jsme neobvyklé přihlášení k vašemu účtu z nového zařízení v zahraničí. Pro ochranu vašich prostředků si prosím okamžitě ověřte identitu a znovu potvrďte platební údaje zde: https://www.p${CYR_A}yp${CYR_A}l.c${CYR_O}m/account/verify-identity. Pokud tak neučiníte do 24 hodin, účet bude dočasně pozastaven a platby zablokovány.`,
  },
];

interface ModelResult {
  risk: number | null;
  verdict: string;
  analysis: string;
  threats: string[];
  level: "green" | "orange" | "red" | "error";
  error?: string;
}

async function runOne(
  runAnalysis: typeof import("../app/api/_lib/aiAnalysis").runAnalysis,
  model: string,
  text: string,
): Promise<ModelResult> {
  try {
    const data = await runAnalysis(text, "full", [], model);
    return {
      risk: data.risk,
      verdict: data.verdict,
      analysis: data.analysis,
      threats: data.threats ?? [],
      level: levelForScore(data.risk),
    };
  } catch (err) {
    return {
      risk: null,
      verdict: "",
      analysis: "",
      threats: [],
      level: "error",
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

async function main() {
  loadEnvLocal();
  const { runAnalysis } = await import("../app/api/_lib/aiAnalysis");

  const results: Array<TestCase & { opus: ModelResult; sonnet5: ModelResult; levelMatch: boolean }> = [];

  for (const tc of TEST_CASES) {
    process.stdout.write(`\n=== ${tc.label} [${tc.category}] ===\n`);
    const [opus, sonnet5] = await Promise.all([
      runOne(runAnalysis, OPUS, tc.text),
      runOne(runAnalysis, SONNET5, tc.text),
    ]);
    const levelMatch = opus.level === sonnet5.level;
    process.stdout.write(
      `  Opus 4.5:  risk=${opus.risk ?? "ERR"} level=${opus.level}  "${opus.verdict}"\n`,
    );
    process.stdout.write(
      `  Sonnet 5:  risk=${sonnet5.risk ?? "ERR"} level=${sonnet5.level}  "${sonnet5.verdict}"\n`,
    );
    process.stdout.write(`  ${levelMatch ? "✅ SHODA levelu" : "⚠️  ROZDÍL levelu"}\n`);
    results.push({ ...tc, opus, sonnet5, levelMatch });
  }

  const mismatches = results.filter((r) => !r.levelMatch);
  process.stdout.write(
    `\n\nSouhrn: ${results.length - mismatches.length}/${results.length} shoda levelu.\n`,
  );
  if (mismatches.length > 0) {
    process.stdout.write("Rozdíly:\n");
    for (const m of mismatches) {
      process.stdout.write(`  - ${m.label}: Opus=${m.opus.level} vs Sonnet5=${m.sonnet5.level}\n`);
    }
  }

  const outPath = resolve(process.cwd(), "scripts/model-comparison-results.json");
  writeFileSync(outPath, JSON.stringify(results, null, 2), "utf-8");
  process.stdout.write(`\nVýsledky uloženy do ${outPath}\n`);
}

main().catch((err) => {
  console.error("Chyba při běhu srovnání:", err);
  process.exit(1);
});
