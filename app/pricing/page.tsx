"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Check, Zap, Shield, Crown, X, ChevronDown, ShieldCheck, RotateCcw, BadgeCheck, Sparkles, Users } from "lucide-react";
import { PricingSchema } from "../components/StructuredData";
import { trackEvent } from "../lib/analytics";

type Plan = "oneshot" | "basic" | "pro";

type PlanCard = {
  key: Plan | "family";
  name: string;
  tagline: string;
  price: number;
  period: string;
  icon: typeof Zap;
  accent: "slate" | "blue" | "purple" | "amber";
  cta: string;
  popular?: boolean;
  comingSoon?: boolean;
  badge?: string;
  badgeClass?: string;
  features: string[];
};

const PLANS: PlanCard[] = [
  {
    key: "oneshot",
    name: "JEDNORÁZOVÁ",
    tagline: "Když to opravdu MUSÍ sedět",
    price: 49,
    period: "jednorázově",
    icon: Zap,
    accent: "slate",
    cta: "Koupit 1 analýzu",
    badge: "Bez závazku",
    badgeClass: "bg-success text-success-foreground shadow-lg shadow-success/30",
    features: [
      "1 kompletní rozbor zprávy",
      "Nejpokročilejší AI model",
      "Hloubkový rozbor – taktiky útočníka",
      "Žádné předplatné",
    ],
  },
  {
    key: "basic",
    name: "BASIC",
    tagline: "Pro pravidelné uživatele",
    price: 99,
    period: "měsíc",
    icon: Shield,
    accent: "blue",
    cta: "Získat BASIC",
    popular: true,
    features: [
      "50 analýz měsíčně",
      "Plný verdikt s vysvětlením",
      "Analýza odkazů i SMS",
      "Analýza screenshotů (obrázků)",
      "Kredity přenosné do dalšího měsíce",
    ],
  },
  {
    key: "pro",
    name: "PRO",
    tagline: "Maximální ochrana pro tebe",
    price: 199,
    period: "měsíc",
    icon: Crown,
    accent: "purple",
    cta: "Získat PRO",
    features: [
      "150 analýz měsíčně",
      "Nejpokročilejší AI model",
      "Hloubkový rozbor – taktiky útočníka",
      "Konkrétní kroky co dělat dál",
      "Až 12 000 znaků na zprávu",
      "Prioritní podpora",
    ],
  },
  {
    key: "family",
    name: "FAMILY",
    tagline: "PRO ochrana pro celou rodinu",
    price: 399,
    period: "měsíc",
    icon: Users,
    accent: "amber",
    cta: "Mám zájem",
    comingSoon: true,
    features: [
      "Až 4 účty (rodiče, prarodiče, děti)",
      "600 analýz měsíčně dohromady",
      "Sdílený výpis zachycených hrozeb",
      "Vše z PRO pro každého člena",
      "Centrální správa a fakturace",
    ],
  },
];

const COMPARE: { label: string; free: string; oneshot: string; basic: string; pro: string; highlight?: boolean }[] = [
  { label: "Cena",                            free: "0 Kč",        oneshot: "49 Kč",       basic: "99 Kč / měs",   pro: "199 Kč / měs", highlight: true },
  { label: "Počet analýz",                    free: "2 / den",     oneshot: "1",           basic: "50 / měs",      pro: "150 / měs", highlight: true },
  { label: "AI model",                        free: "Základní",    oneshot: "Nejpokročilejší", basic: "Pokročilý", pro: "Nejpokročilejší" },
  { label: "Maximální délka textu",           free: "5 000 znaků", oneshot: "12 000 znaků",basic: "8 000 znaků",   pro: "12 000 znaků" },
  { label: "Analýza obrázků / screenshotů",   free: "—",            oneshot: "—",           basic: "✓",             pro: "✓" },
  { label: "Hloubkový rozbor + taktiky",      free: "—",            oneshot: "✓",           basic: "—",             pro: "✓" },
  { label: "Konkrétní kroky co dělat dál",    free: "—",            oneshot: "rozšířené",   basic: "rozšířené",     pro: "rozšířené" },
  { label: "Sdílení a varování přes odkaz",   free: "✓",            oneshot: "✓",           basic: "✓",             pro: "✓" },
  { label: "PDF report ke stažení",           free: "✓",            oneshot: "✓",           basic: "✓",             pro: "✓" },
  { label: "Expirace kreditů",                free: "—",            oneshot: "ihned po použití", basic: "až +1 měsíc",   pro: "až +1 měsíc" },
  { label: "Závazek",                         free: "žádný",        oneshot: "žádný",       basic: "zrušit kdykoli",pro: "zrušit kdykoli" },
];

const FAQ: { q: string; a: string }[] = [
  {
    q: "Mohu předplatné kdykoli zrušit?",
    a: "Ano. Předplatné si zrušíš jedním kliknutím v sekci Fakturace. Kredity, které ti zbývají do konce zaplaceného období, můžeš normálně dočerpat — nic se ti nepropadne dříve.",
  },
  {
    q: "Co když mi dojdou kredity uprostřed měsíce?",
    a: "Pro kritické případy si můžeš dokoupit jednorázovou prémiovou analýzu (49 Kč). Pokud ale analyzuješ častěji, doporučujeme přechod na vyšší tarif, kde se kredity rovnou navýší.",
  },
  {
    q: "Liší se výsledky mezi tarify?",
    a: "Ano, ale jen v hloubce. FREE používá rychlý základní model — kratší verdikt. BASIC nasazuje pokročilý model — plný popis s vysvětlením. Jednorázový nákup a tarif PRO běží na nejpokročilejším modelu — nejvyšší přesnost, taktiky útočníka, doporučení co dělat dál.",
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
    a: "2 analýzy denně bez registrace, plus PDF report a sdílení. Pro screenshoty, vyšší přesnost a více analýz si můžeš vybrat tarif.",
  },
];

const ACCENT_STYLES: Record<"slate" | "blue" | "purple" | "amber", {
  border: string;
  glow: string;
  iconBg: string;
  iconColor: string;
  badgeBg: string;
  badgeText: string;
  ctaBg: string;
  check: string;
  popularRing: string;
}> = {
  slate: {
    border: "border-border",
    glow: "",
    iconBg: "bg-secondary",
    iconColor: "text-muted-foreground",
    badgeBg: "bg-secondary",
    badgeText: "text-muted-foreground",
    ctaBg: "bg-secondary hover:bg-secondary/70 text-foreground",
    check: "text-muted-foreground",
    popularRing: "",
  },
  blue: {
    border: "border-primary/40",
    glow: "shadow-[0_30px_80px_-30px_oklch(0.62_0.19_256_/_0.55)]",
    iconBg: "bg-primary/20",
    iconColor: "text-primary",
    badgeBg: "bg-primary/15",
    badgeText: "text-primary",
    ctaBg: "bg-primary hover:brightness-110 text-primary-foreground shadow-lg shadow-primary/25",
    check: "text-primary",
    popularRing: "ring-2 ring-primary/40",
  },
  purple: {
    border: "border-primary/40",
    glow: "shadow-[0_30px_80px_-30px_oklch(0.62_0.19_256_/_0.55)]",
    iconBg: "bg-primary/20",
    iconColor: "text-primary",
    badgeBg: "bg-primary/15",
    badgeText: "text-primary",
    ctaBg: "bg-primary hover:brightness-110 text-primary-foreground shadow-lg shadow-primary/30",
    check: "text-primary",
    popularRing: "",
  },
  amber: {
    border: "border-warning/40",
    glow: "shadow-[0_30px_80px_-30px_oklch(0.78_0.15_75_/_0.45)]",
    iconBg: "bg-warning/20",
    iconColor: "text-warning",
    badgeBg: "bg-warning/15",
    badgeText: "text-warning",
    ctaBg: "bg-warning/15 hover:bg-warning/25 text-warning border border-warning/40",
    check: "text-warning",
    popularRing: "",
  },
};

const VALID_PLANS: Plan[] = ["oneshot", "basic", "pro"];

export default function PricingPage() {
  const [loading, setLoading] = useState<Plan | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [autoRedirecting, setAutoRedirecting] = useState(false);
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
      setAutoRedirecting(true);
      handleCheckout(plan);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const disabled = loading !== null;

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
            Začni zdarma — 2 ověření denně bez registrace. Plať jen když potřebuješ víc.
          </p>

          {/* Trust badges */}
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground pt-2">
            <span className="inline-flex items-center gap-1.5"><ShieldCheck size={14} className="text-success" /> 100% anonymní</span>
            <span className="inline-flex items-center gap-1.5"><RotateCcw size={14} className="text-success" /> Zrušit kdykoli</span>
            <span className="inline-flex items-center gap-1.5"><BadgeCheck size={14} className="text-success" /> Garantujeme nebo vrátíme peníze</span>
          </div>
        </section>

        {/* ─── Plan Cards ───────────────────────────────── */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5 mb-16">

          {/* FREE — vždy první, CTA vede na homepage */}
          <div className="relative surface-card p-5 sm:p-6 xl:p-5 flex flex-col animate-fade-up border-success/30">
            <div className="flex items-center gap-3 mb-5">
              <div className="bg-success/15 text-success p-2.5 rounded-xl shrink-0">
                <ShieldCheck size={20} />
              </div>
              <h2 className="text-xl xl:text-base font-black tracking-tight min-w-0">FREE</h2>
            </div>

            <div className="mb-1">
              <span className="text-5xl font-black tracking-tight">0 Kč</span>
            </div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium mb-2">navždy zdarma</p>
            <p className="text-muted-foreground text-sm font-medium mb-6">Ověř si zprávu hned, bez registrace</p>

            <ul className="space-y-3 mb-7 flex-1">
              {[
                "2 analýzy denně zdarma",
                "Vyhledávání v databázi",
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

          {PLANS.map((p, idx) => {
            const styles = ACCENT_STYLES[p.accent];
            const Icon = p.icon;
            const isLoading = !p.comingSoon && loading === (p.key as Plan);
            return (
              <div
                key={p.key}
                className={`relative surface-card p-6 sm:p-7 xl:p-5 flex flex-col animate-fade-up ${p.popular ? "md:-translate-y-3 surface-card-elevated " + styles.popularRing : ""} ${styles.border} ${styles.glow}`}
                style={{ animationDelay: `${(idx + 1) * 80}ms` }}
              >
                {p.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full whitespace-nowrap shadow-lg shadow-primary/30">
                    Nejoblíbenější
                  </div>
                )}
                {p.comingSoon && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-warning text-warning-foreground text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full whitespace-nowrap shadow-lg shadow-warning/40">
                    Připravujeme
                  </div>
                )}
                {p.badge && (
                  <div className={`absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full whitespace-nowrap ${p.badgeClass}`}>
                    {p.badge}
                  </div>
                )}

                <div className="flex items-center gap-3 mb-5 min-w-0">
                  <div className={`${styles.iconBg} ${styles.iconColor} p-2.5 rounded-xl shrink-0`}>
                    <Icon size={20} />
                  </div>
                  <h2 className="text-xl xl:text-base font-black tracking-tight min-w-0">{p.name}</h2>
                </div>

                <div className="mb-1">
                  <span className="text-5xl font-black tracking-tight">{p.price} Kč</span>
                  <span className="text-muted-foreground text-base font-medium ml-1">/ {p.period}</span>
                </div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium mb-2">včetně 21 % DPH</p>
                <p className="text-muted-foreground text-sm font-medium mb-6">{p.tagline}</p>

                <ul className="space-y-3 mb-7 flex-1">
                  {p.features.map((f) => (
                    <li key={f} className="flex gap-2.5 items-start text-sm text-foreground">
                      <Check className={`${styles.check} shrink-0 mt-0.5`} size={16} />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                {p.comingSoon ? (
                  <a
                    href={`mailto:info@neklikni.cz?subject=${encodeURIComponent("Mám zájem o FAMILY tarif")}`}
                    onClick={() => trackEvent("cta_upgrade_clicked", { from: "pricing", action: "family_inquiry" })}
                    className={`w-full inline-flex items-center justify-center py-3.5 rounded-2xl font-black text-sm uppercase tracking-wider transition-all active:scale-[0.98] ${styles.ctaBg}`}
                  >
                    {p.cta}
                  </a>
                ) : (
                  <button
                    onClick={() => handleCheckout(p.key as Plan)}
                    disabled={disabled}
                    className={`w-full py-3.5 rounded-2xl font-black text-sm uppercase tracking-wider transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed ${styles.ctaBg}`}
                  >
                    {isLoading ? "Načítám pokladnu..." : p.cta}
                  </button>
                )}
              </div>
            );
          })}
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
                  <span className="text-muted-foreground text-sm">Cena BASIC za rok:</span>
                  <span className="text-foreground font-black tabular-nums">1 188 Kč</span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-muted-foreground text-sm">Cena PRO za rok:</span>
                  <span className="text-foreground font-black tabular-nums">2 388 Kč</span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-muted-foreground text-sm">Průměrná škoda z phishingu:</span>
                  <span className="text-warning font-black tabular-nums">35 000 Kč</span>
                </div>
                <div className="border-t border-border pt-3 flex justify-between items-baseline">
                  <span className="text-foreground font-bold text-sm">ROI při 1 odhaleném podvodu (BASIC):</span>
                  <span className="text-success font-black text-xl tabular-nums">29×</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── Money-Back Banner ────────────────────────── */}
        <section className="surface-card p-6 sm:p-8 mb-16 flex flex-col sm:flex-row items-center gap-5 animate-fade-up">
          <div className="bg-success/15 text-success p-4 rounded-2xl shrink-0">
            <BadgeCheck size={28} />
          </div>
          <div className="text-center sm:text-left">
            <h3 className="text-lg font-black mb-1">14denní garance vrácení peněz</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Pokud ti Neklikni během 14 dnů od první platby nepomůže odhalit ani jeden podvod nebo nesplní očekávání, napiš nám —
              vrátíme ti celou částku, bez otázek.
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
            <div className="grid grid-cols-5 text-[10px] sm:text-xs font-black uppercase tracking-widest border-b border-border">
              <div className="p-3 sm:p-4 text-muted-foreground"></div>
              <div className="p-3 sm:p-4 text-center text-muted-foreground">FREE</div>
              <div className="p-3 sm:p-4 text-center text-muted-foreground">EASY</div>
              <div className="p-3 sm:p-4 text-center text-primary bg-primary/5">BASIC</div>
              <div className="p-3 sm:p-4 text-center text-primary">PRO</div>
            </div>

            {COMPARE.map((row) => (
              <div
                key={row.label}
                className={`grid grid-cols-5 text-xs sm:text-sm border-b border-border last:border-0 ${row.highlight ? "bg-secondary/20 font-semibold" : ""}`}
              >
                <div className="p-3 sm:p-4 text-muted-foreground">{row.label}</div>
                <div className="p-3 sm:p-4 text-center text-muted-foreground">{row.free}</div>
                <div className="p-3 sm:p-4 text-center text-muted-foreground">{row.oneshot}</div>
                <div className="p-3 sm:p-4 text-center text-primary bg-primary/5">{row.basic}</div>
                <div className="p-3 sm:p-4 text-center text-primary">{row.pro}</div>
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
            Začni se 2 analýzami denně zdarma — bez registrace, bez kreditky.
            Kdykoli později se rozhodneš pro tarif, kredity se ti spočítají hned od první minuty.
          </p>
          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <button
              onClick={() => router.push("/")}
              className="px-6 py-3 rounded-2xl bg-secondary hover:bg-secondary/70 text-foreground font-bold text-sm transition-colors"
            >
              Vyzkoušet zdarma
            </button>
            <button
              onClick={() => handleCheckout("basic")}
              disabled={disabled}
              className="px-6 py-3 rounded-2xl bg-primary hover:brightness-110 text-primary-foreground font-bold text-sm shadow-lg shadow-primary/25 transition-all active:scale-[0.98] disabled:opacity-60"
            >
              {loading === "basic" ? "Načítám…" : "Začít s BASIC za 99 Kč"}
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
