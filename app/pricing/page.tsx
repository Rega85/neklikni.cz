"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Check, Zap, Crown, X, ChevronDown, ShieldCheck, RotateCcw, BadgeCheck, Sparkles, Users } from "lucide-react";
import { PricingSchema } from "../components/StructuredData";
import { trackEvent } from "../lib/analytics";
import { trialDisclosure, TRIAL_DAYS } from "../api/_lib/billingPlans";

type Plan = "oneshot" | "full_monthly" | "full_yearly";
type FullBilling = "monthly" | "yearly";

const VALID_PLANS: Plan[] = ["oneshot", "full_monthly", "full_yearly"];

const FULL_PRICE = { monthly: 79, yearly: 790 };
const FULL_PERIOD_LABEL = { monthly: "měsíc", yearly: "rok" };
const FULL_PRICE_LABEL = { monthly: "79 Kč/měsíc", yearly: "790 Kč/rok" };

const FULL_FEATURES = [
  "Neomezené ověřování (fair use)",
  "Nejpokročilejší AI model",
  "Hloubkový rozbor – taktiky útočníka",
  "Analýza screenshotů (obrázků)",
  "Prioritní podpora",
];

const ONESHOT_FEATURES = [
  "1 kompletní rozbor zprávy",
  "Nejpokročilejší AI model",
  "Hloubkový rozbor – taktiky útočníka",
  "Žádné předplatné",
];

const COMPARE: { label: string; free: string; oneshot: string; full: string; highlight?: boolean }[] = [
  { label: "Cena", free: "0 Kč", oneshot: "49 Kč", full: "79 Kč / měs (nebo 790 Kč / rok)", highlight: true },
  { label: "Počet ověření", free: "2 AI / den", oneshot: "1", full: "neomezeně (fair use)", highlight: true },
  { label: "Zkušební období", free: "—", oneshot: "—", full: `${TRIAL_DAYS} dní zdarma` },
  { label: "AI model", free: "Základní", oneshot: "Nejpokročilejší", full: "Nejpokročilejší" },
  { label: "Vyhledávání v databázi", free: "10 / den", oneshot: "10 / den", full: "10 / den" },
  { label: "Analýza obrázků / screenshotů", free: "—", oneshot: "—", full: "✓" },
  { label: "Hloubkový rozbor + taktiky", free: "—", oneshot: "✓", full: "✓" },
  { label: "Sdílení a varování přes odkaz", free: "✓", oneshot: "✓", full: "✓" },
  { label: "PDF report ke stažení", free: "✓", oneshot: "✓", full: "✓" },
  { label: "Závazek", free: "žádný", oneshot: "žádný", full: "zrušit kdykoli jedním klikem" },
];

const FAQ: { q: string; a: string }[] = [
  {
    q: "Mohu předplatné kdykoli zrušit?",
    a: "Ano, kdykoli jedním kliknutím v sekci Fakturace — klidně i během zkušebního období. Předplatné zůstane aktivní do konce zaplaceného (nebo zkušebního) období, pak se samo nebude obnovovat.",
  },
  {
    q: "Jak funguje zkušební období u Full?",
    a: `Prvních ${TRIAL_DAYS} dní je zdarma. Kartu zadáváš předem, ale nic se nestrhne, dokud trial neskončí — 3 dny předem ti pošleme e-mail s připomínkou. Pokud nezrušíš, automaticky se strhne 79 Kč (měsíčně) nebo 790 Kč (ročně).`,
  },
  {
    q: "Co když potřebuju jen jednu analýzu teď hned?",
    a: "Jednorázová analýza za 49 Kč — žádné předplatné, žádný trial, jen jeden kompletní rozbor nejpokročilejším modelem.",
  },
  {
    q: "Liší se výsledky mezi tarify?",
    a: "Ano, ale jen v hloubce. FREE používá rychlý základní model — kratší verdikt. Jednorázová analýza i Full běží na nejpokročilejším modelu — nejvyšší přesnost, taktiky útočníka, konkrétní doporučení co dělat dál.",
  },
  {
    q: "Ukládáte moje zprávy?",
    a: "Ne. Obsah, který nám pošleš k analýze, není perzistentně ukládán k tvému profilu. Pokud klikneš na „Sdílet varování“, uloží se výsledek (verdikt, riziko, hrozby) na sdílecí URL — ten můžeš kdykoli smazat.",
  },
  {
    q: "Mohu Neklikni používat na firemní data?",
    a: "Pro technické zprávy a SMS klidně. Pro citlivá firemní data doporučujeme nejprve anonymizovat (jména, čísla účtů). Náš AI provider neuchovává tvé prompty pro trénink modelů.",
  },
  {
    q: "Co když AI udělá chybu?",
    a: "AI je pomocník, ne soudce. Vždy jde o doporučení s pravděpodobností — ne o 100% diagnózu. Pro hraniční případy (riziko 40-60 %) doporučujeme druhou kontrolu (volat banku, ověřit odesílatele jiným kanálem).",
  },
  {
    q: "Funguje to i v zahraničí / v jiných jazycích?",
    a: "Ano. AI rozumí česky, slovensky, anglicky, německy, polsky a dalším — výsledek vždy dostaneš česky.",
  },
  {
    q: "Co dostanu zdarma?",
    a: "2 AI ověření denně a 10 vyhledávání v databázi bez registrace, plus PDF report a sdílení. Pro screenshoty a neomezené ověřování si vyber Full.",
  },
];

export default function PricingPage() {
  const [loading, setLoading] = useState<Plan | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [autoRedirecting, setAutoRedirecting] = useState(false);
  const [fullBilling, setFullBilling] = useState<FullBilling>("monthly");
  const router = useRouter();

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(t);
  }, [toast]);

  const handleCheckout = async (plan: Plan) => {
    setLoading(plan);
    trackEvent("checkout_started", { plan });
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json().catch(() => ({}));
      // Not logged in → bounce through auth and come straight back to this plan
      // so we don't lose the checkout intent. The login flow auto-resumes via ?plan=.
      if (res.status === 401) {
        const next = `/pricing?plan=${plan}`;
        router.push(`/login?next=${encodeURIComponent(next)}`);
        return;
      }
      if (!res.ok) { setToast("Chyba: " + (data?.error ?? `HTTP ${res.status}`)); return; }
      if (data?.url) { window.location.href = data.url; return; }
      setToast("Chyba: server nevrátil checkout URL.");
    } catch {
      setToast("Něco se pokazilo. Zkus to prosím znovu.");
    } finally {
      setLoading(null);
      setAutoRedirecting(false);
    }
  };

  // When the user returns from auth (or follows a direct /pricing?plan=X link),
  // resume the checkout they originally intended — straight to Stripe if logged in.
  useEffect(() => {
    const plan = new URLSearchParams(window.location.search).get("plan") as Plan | null;
    if (plan && VALID_PLANS.includes(plan)) {
      if (plan === "full_yearly") setFullBilling("yearly");
      setAutoRedirecting(true);
      handleCheckout(plan);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const disabled = loading !== null;
  const fullPlanKey: Plan = fullBilling === "yearly" ? "full_yearly" : "full_monthly";
  const isFullLoading = loading === fullPlanKey;

  if (autoRedirecting) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-foreground gap-4">
        <div className="w-10 h-10 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        <p className="text-muted-foreground text-sm font-medium">Přesměrováváme tě na platbu…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-foreground">
      {PricingSchema(FAQ)}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-24 pb-20">

        {/* ─── Hero ─────────────────────────────────────── */}
        <section className="text-center space-y-5 mb-10 animate-fade-up">
          <span className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary bg-primary/10 border border-primary/20 px-3 py-1.5 rounded-full">
            <Sparkles size={12} /> Vyber si svůj klid
          </span>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tighter">
            Ochrana, která se ti{" "}
            <span className="text-primary">
              vyplatí
            </span>
          </h1>
          <p className="text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
            Začni zdarma — 2 AI ověření denně bez registrace. Plať jen když potřebuješ víc.
          </p>

          {/* Trust badges */}
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground pt-2">
            <span className="inline-flex items-center gap-1.5"><ShieldCheck size={14} className="text-success" /> 100% anonymní</span>
            <span className="inline-flex items-center gap-1.5"><RotateCcw size={14} className="text-success" /> Zrušit kdykoli</span>
            <span className="inline-flex items-center gap-1.5"><BadgeCheck size={14} className="text-success" /> {TRIAL_DAYS} dní zdarma na Full</span>
          </div>
        </section>

        {/* ─── Plan Cards ───────────────────────────────── */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-16">

          {/* FREE */}
          <div className="relative surface-card p-6 sm:p-7 flex flex-col animate-fade-up border-success/30">
            <div className="flex items-center gap-3 mb-5">
              <div className="bg-success/15 text-success p-2.5 rounded-xl shrink-0">
                <ShieldCheck size={20} />
              </div>
              <h2 className="text-xl font-black tracking-tight min-w-0">FREE</h2>
            </div>

            <div className="mb-1">
              <span className="text-5xl font-black tracking-tight">0 Kč</span>
            </div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium mb-2">navždy zdarma</p>
            <p className="text-muted-foreground text-sm font-medium mb-6">Ověř si zprávu hned, bez registrace</p>

            <ul className="space-y-3 mb-7 flex-1">
              {[
                "2 AI ověření denně",
                "10 vyhledávání v databázi denně",
                "Bez registrace",
                "Sdílení a varování",
              ].map((f) => (
                <li key={f} className="flex gap-2.5 items-start text-sm text-foreground">
                  <Check className="text-success shrink-0 mt-0.5" size={16} />
                  <span>{f}</span>
                </li>
              ))}
            </ul>

            <button
              onClick={() => { trackEvent("cta_pricing_clicked", { from: "pricing", action: "free" }); router.push("/"); }}
              className="w-full py-3.5 rounded-2xl font-black text-sm uppercase tracking-wider transition-all active:scale-[0.98] bg-success hover:brightness-110 text-success-foreground"
            >
              Vyzkoušet zdarma
            </button>
          </div>

          {/* ONESHOT */}
          <div className="relative surface-card p-6 sm:p-7 flex flex-col animate-fade-up border-border" style={{ animationDelay: "80ms" }}>
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-success text-success-foreground text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full whitespace-nowrap shadow-lg shadow-success/30">
              Bez závazku
            </div>
            <div className="flex items-center gap-3 mb-5 min-w-0">
              <div className="bg-secondary text-muted-foreground p-2.5 rounded-xl shrink-0">
                <Zap size={20} />
              </div>
              <h2 className="text-xl font-black tracking-tight min-w-0">JEDNORÁZOVÁ</h2>
            </div>

            <div className="mb-1">
              <span className="text-5xl font-black tracking-tight">49 Kč</span>
              <span className="text-muted-foreground text-base font-medium ml-1">/ jednorázově</span>
            </div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium mb-2">včetně 21 % DPH</p>
            <p className="text-muted-foreground text-sm font-medium mb-6">Když to opravdu MUSÍ sedět</p>

            <ul className="space-y-3 mb-7 flex-1">
              {ONESHOT_FEATURES.map((f) => (
                <li key={f} className="flex gap-2.5 items-start text-sm text-foreground">
                  <Check className="text-muted-foreground shrink-0 mt-0.5" size={16} />
                  <span>{f}</span>
                </li>
              ))}
            </ul>

            <button
              onClick={() => handleCheckout("oneshot")}
              disabled={disabled}
              className="w-full py-3.5 rounded-2xl font-black text-sm uppercase tracking-wider transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed bg-secondary hover:bg-secondary/70 text-foreground"
            >
              {loading === "oneshot" ? "Načítám pokladnu..." : "Koupit 1 analýzu"}
            </button>
          </div>

          {/* FULL — měsíčně/ročně přepínač + trial */}
          <div
            className="relative surface-card-elevated p-6 sm:p-7 flex flex-col animate-fade-up md:-translate-y-3 ring-2 ring-primary/40 border-primary/40 shadow-[0_30px_80px_-30px_oklch(0.62_0.19_256_/_0.55)]"
            style={{ animationDelay: "160ms" }}
          >
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full whitespace-nowrap shadow-lg shadow-primary/30">
              Nejoblíbenější
            </div>

            <div className="flex items-center gap-3 mb-4 min-w-0">
              <div className="bg-primary/20 text-primary p-2.5 rounded-xl shrink-0">
                <Crown size={20} />
              </div>
              <h2 className="text-xl font-black tracking-tight min-w-0">FULL</h2>
            </div>

            {/* Měsíčně / Ročně přepínač */}
            <div className="flex bg-secondary rounded-xl p-1 mb-4 text-xs font-bold">
              <button
                type="button"
                onClick={() => setFullBilling("monthly")}
                className={`flex-1 py-2 rounded-lg transition-all ${fullBilling === "monthly" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                Měsíčně
              </button>
              <button
                type="button"
                onClick={() => setFullBilling("yearly")}
                className={`flex-1 py-2 rounded-lg transition-all ${fullBilling === "yearly" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                Ročně
                <span className="ml-1 text-success">−17 %</span>
              </button>
            </div>

            <div className="mb-1">
              <span className="text-5xl font-black tracking-tight">{FULL_PRICE[fullBilling]} Kč</span>
              <span className="text-muted-foreground text-base font-medium ml-1">/ {FULL_PERIOD_LABEL[fullBilling]}</span>
            </div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium mb-2">
              včetně 21 % DPH{fullBilling === "yearly" ? " · 2 měsíce zdarma oproti měsíčnímu" : ""}
            </p>
            <div className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-success bg-success/10 border border-success/20 px-2.5 py-1 rounded-full mb-4 w-fit">
              <BadgeCheck size={12} /> {TRIAL_DAYS} dní zdarma
            </div>

            <ul className="space-y-3 mb-5 flex-1">
              {FULL_FEATURES.map((f) => (
                <li key={f} className="flex gap-2.5 items-start text-sm text-foreground">
                  <Check className="text-primary shrink-0 mt-0.5" size={16} />
                  <span>{f}</span>
                </li>
              ))}
            </ul>

            <button
              onClick={() => handleCheckout(fullPlanKey)}
              disabled={disabled}
              className="w-full py-3.5 rounded-2xl font-black text-sm uppercase tracking-wider transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed bg-primary hover:brightness-110 text-primary-foreground shadow-lg shadow-primary/25 mb-3"
            >
              {isFullLoading ? "Načítám pokladnu..." : `Začít ${TRIAL_DAYS}denní trial zdarma`}
            </button>

            {/* Právní minimum — NEPODKROČITELNÉ, viditelně u tlačítka, ne jen ve VOP */}
            <p className="text-[11px] text-muted-foreground leading-relaxed text-center">
              <strong className="text-foreground">
                Prvních {TRIAL_DAYS} dní zdarma. Poté {FULL_PRICE_LABEL[fullBilling]}
              </strong>
              , strhává se automaticky. Zrušíte kdykoli jedním klikem.
            </p>
          </div>

          {/* FAMILY — coming soon, nezměněno */}
          <div
            className="relative surface-card p-6 sm:p-7 flex flex-col animate-fade-up border-warning/40 shadow-[0_30px_80px_-30px_oklch(0.78_0.15_75_/_0.45)]"
            style={{ animationDelay: "240ms" }}
          >
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-warning text-warning-foreground text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full whitespace-nowrap shadow-lg shadow-warning/40">
              Připravujeme
            </div>
            <div className="flex items-center gap-3 mb-5 min-w-0">
              <div className="bg-warning/20 text-warning p-2.5 rounded-xl shrink-0">
                <Users size={20} />
              </div>
              <h2 className="text-xl font-black tracking-tight min-w-0">FAMILY</h2>
            </div>

            <div className="mb-1">
              <span className="text-5xl font-black tracking-tight">399 Kč</span>
              <span className="text-muted-foreground text-base font-medium ml-1">/ měsíc</span>
            </div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium mb-2">včetně 21 % DPH</p>
            <p className="text-muted-foreground text-sm font-medium mb-6">PRO ochrana pro celou rodinu</p>

            <ul className="space-y-3 mb-7 flex-1">
              {[
                "Až 4 účty (rodiče, prarodiče, děti)",
                "Neomezené ověřování pro každého",
                "Sdílený výpis zachycených hrozeb",
                "Vše z Full pro každého člena",
                "Centrální správa a fakturace",
              ].map((f) => (
                <li key={f} className="flex gap-2.5 items-start text-sm text-foreground">
                  <Check className="text-warning shrink-0 mt-0.5" size={16} />
                  <span>{f}</span>
                </li>
              ))}
            </ul>

            <a
              href={`mailto:info@neklikni.cz?subject=${encodeURIComponent("Mám zájem o FAMILY tarif")}`}
              onClick={() => trackEvent("cta_upgrade_clicked", { from: "pricing", action: "family_inquiry" })}
              className="w-full inline-flex items-center justify-center py-3.5 rounded-2xl font-black text-sm uppercase tracking-wider transition-all active:scale-[0.98] bg-warning/15 hover:bg-warning/25 text-warning border border-warning/40"
            >
              Mám zájem
            </a>
          </div>
        </section>

        {/* ─── Loss Aversion Calculator ─────────────────── */}
        <section className="surface-card-elevated p-6 sm:p-10 mb-12 animate-fade-up">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div className="space-y-4">
              <span className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-warning bg-warning/10 border border-warning/20 px-3 py-1.5 rounded-full">
                Spočítej si, co se ti vyplatí
              </span>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tighter">
                Jeden phishing v ČR =&nbsp;průměrně <span className="text-warning">35&nbsp;000&nbsp;Kč</span>
              </h2>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Podle ČNB a Policie ČR ztratil průměrný oběť phishingu v roce 2025 mezi 8 000 a 80 000 Kč. Babičce, která chytila falešnou Českou poštu, je dnes v průměru obrali o 25 000 Kč.
              </p>
            </div>

            <div className="bg-secondary/30 border border-border rounded-2xl p-5 sm:p-6">
              <div className="space-y-3">
                <div className="flex justify-between items-baseline">
                  <span className="text-muted-foreground text-sm">Cena Full za rok (měsíčně):</span>
                  <span className="text-foreground font-black tabular-nums">948 Kč</span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-muted-foreground text-sm">Cena Full za rok (ročně):</span>
                  <span className="text-foreground font-black tabular-nums">790 Kč</span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-muted-foreground text-sm">Průměrná škoda z phishingu:</span>
                  <span className="text-warning font-black tabular-nums">35 000 Kč</span>
                </div>
                <div className="border-t border-border pt-3 flex justify-between items-baseline">
                  <span className="text-foreground font-bold text-sm">ROI při 1 odhaleném podvodu (roční Full):</span>
                  <span className="text-success font-black text-xl tabular-nums">44×</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── Trial banner ─────────────────────────────── */}
        <section className="surface-card p-6 sm:p-8 mb-16 flex flex-col sm:flex-row items-center gap-5 animate-fade-up">
          <div className="bg-success/15 text-success p-4 rounded-2xl shrink-0">
            <BadgeCheck size={28} />
          </div>
          <div className="text-center sm:text-left">
            <h3 className="text-lg font-black mb-1">{TRIAL_DAYS} dní Full zdarma, zrušíš jedním klikem</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {trialDisclosure(FULL_PRICE_LABEL.monthly)} Žádné otázky, žádné čekání na odpověď — zrušení je okamžité.
            </p>
          </div>
        </section>

        {/* ─── Comparison Table ─────────────────────────── */}
        <section className="mb-20 animate-fade-up">
          <div className="text-center mb-8">
            <h2 className="text-3xl sm:text-4xl font-black tracking-tighter mb-2">Srovnání tarifů</h2>
            <p className="text-muted-foreground text-sm">Co všechno se v každém tarifu skrývá</p>
          </div>

          {/* Mobile hint: scroll horizontally */}
          <p className="text-center text-[11px] text-muted-foreground mb-3 sm:hidden">← Posuň prstem →</p>

          <div className="surface-card overflow-x-auto">
           <div className="min-w-[560px]">
            {/* Header row */}
            <div className="grid grid-cols-4 text-[10px] sm:text-xs font-black uppercase tracking-widest border-b border-border">
              <div className="p-3 sm:p-4 text-muted-foreground"></div>
              <div className="p-3 sm:p-4 text-center text-muted-foreground">FREE</div>
              <div className="p-3 sm:p-4 text-center text-muted-foreground">JEDNORÁZOVÁ</div>
              <div className="p-3 sm:p-4 text-center text-primary bg-primary/5">FULL</div>
            </div>

            {COMPARE.map((row) => (
              <div
                key={row.label}
                className={`grid grid-cols-4 text-xs sm:text-sm border-b border-border last:border-0 ${row.highlight ? "bg-secondary/20 font-semibold" : ""}`}
              >
                <div className="p-3 sm:p-4 text-muted-foreground">{row.label}</div>
                <div className="p-3 sm:p-4 text-center text-muted-foreground">{row.free}</div>
                <div className="p-3 sm:p-4 text-center text-muted-foreground">{row.oneshot}</div>
                <div className="p-3 sm:p-4 text-center text-primary bg-primary/5">{row.full}</div>
              </div>
            ))}
           </div>
          </div>
        </section>

        {/* ─── FAQ ──────────────────────────────────────── */}
        <section className="mb-20 animate-fade-up">
          <div className="text-center mb-8">
            <h2 className="text-3xl sm:text-4xl font-black tracking-tighter mb-2">Časté otázky</h2>
            <p className="text-muted-foreground text-sm">Než kupuješ, mrkni se na to, co se nejčastěji ptá</p>
          </div>

          <div className="space-y-2 max-w-3xl mx-auto">
            {FAQ.map((item, i) => {
              const open = openFaq === i;
              return (
                <div
                  key={item.q}
                  className={`surface-card overflow-hidden transition-colors ${open ? "border-primary/30" : ""}`}
                >
                  <button
                    onClick={() => setOpenFaq(open ? null : i)}
                    aria-expanded={open}
                    className="w-full px-5 py-4 flex items-center justify-between gap-3 text-left hover:bg-secondary/30 transition-colors"
                  >
                    <span className="font-bold text-sm sm:text-base text-foreground">{item.q}</span>
                    <ChevronDown
                      size={18}
                      className={`text-muted-foreground shrink-0 transition-transform ${open ? "rotate-180 text-primary" : ""}`}
                    />
                  </button>
                  {open && (
                    <div className="px-5 pb-5 text-muted-foreground text-sm leading-relaxed animate-fade-up">
                      {item.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* ─── Final CTA ────────────────────────────────── */}
        <section className="surface-card-elevated p-8 sm:p-12 text-center space-y-4 animate-fade-up">
          <h2 className="text-2xl sm:text-3xl font-black tracking-tighter">Stále váháš?</h2>
          <p className="text-muted-foreground max-w-xl mx-auto leading-relaxed">
            Začni se 2 AI ověřeními denně zdarma — bez registrace, bez kreditky.
            Kdykoli později si vybereš Full, prvních {TRIAL_DAYS} dní je taky zdarma.
          </p>
          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <button
              onClick={() => router.push("/")}
              className="px-6 py-3 rounded-2xl bg-secondary hover:bg-secondary/70 text-foreground font-bold text-sm transition-colors"
            >
              Vyzkoušet zdarma
            </button>
            <button
              onClick={() => handleCheckout("full_monthly")}
              disabled={disabled}
              className="px-6 py-3 rounded-2xl bg-primary hover:brightness-110 text-primary-foreground font-bold text-sm shadow-lg shadow-primary/25 transition-all active:scale-[0.98] disabled:opacity-60"
            >
              {loading === "full_monthly" ? "Načítám…" : `Začít ${TRIAL_DAYS}denní trial zdarma`}
            </button>
          </div>
        </section>
      </main>

      {toast && (
        <div role="alert" className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-destructive/15 border border-destructive/40 text-destructive px-5 py-3 rounded-2xl text-sm font-medium shadow-2xl backdrop-blur max-w-sm w-full mx-4">
          <span className="flex-1">{toast}</span>
          <button type="button" onClick={() => setToast(null)} aria-label="Zavřít" className="shrink-0 text-destructive hover:text-destructive/80 transition-colors">
            <X size={15} />
          </button>
        </div>
      )}
    </div>
  );
}
