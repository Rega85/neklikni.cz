"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Check, Zap, Shield, Crown, X, ChevronDown, ShieldCheck, RotateCcw, BadgeCheck, Sparkles, Users } from "lucide-react";
import { PricingSchema } from "../components/StructuredData";
import { trackEvent } from "../lib/analytics";

type Plan = "easy" | "basic" | "pro";

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
  features: string[];
};

const PLANS: PlanCard[] = [
  {
    key: "easy",
    name: "EASY",
    tagline: "Jednorázově, bez závazků",
    price: 29,
    period: "jednorázově",
    icon: Zap,
    accent: "slate",
    cta: "Koupit balíček",
    features: [
      "10 AI analýz",
      "Výsledek do 3 sekund",
      "Kredity bez expirace",
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
      "Bez vázanosti, zrušení kdykoli",
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
      "200 analýz měsíčně",
      "Nejpokročilejší AI model Claude Opus",
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
      "800 analýz měsíčně dohromady",
      "Sdílený výpis zachycených hrozeb",
      "Vše z PRO pro každého člena",
      "Centrální správa a fakturace",
    ],
  },
];

const COMPARE: { label: string; free: string; easy: string; basic: string; pro: string; highlight?: boolean }[] = [
  { label: "Cena",                            free: "0 Kč",        easy: "29 Kč",       basic: "99 Kč / měs",   pro: "199 Kč / měs", highlight: true },
  { label: "Počet analýz",                    free: "3 / den",     easy: "10",          basic: "50 / měs",      pro: "200 / měs", highlight: true },
  { label: "AI model",                        free: "Claude Haiku",easy: "Claude Haiku",basic: "Claude Sonnet", pro: "Claude Opus" },
  { label: "Maximální délka textu",           free: "5 000 znaků", easy: "5 000 znaků", basic: "8 000 znaků",   pro: "12 000 znaků" },
  { label: "Analýza obrázků / screenshotů",   free: "—",            easy: "—",           basic: "✓",             pro: "✓" },
  { label: "Hloubkový rozbor + taktiky",      free: "—",            easy: "—",           basic: "—",             pro: "✓" },
  { label: "Konkrétní kroky co dělat dál",    free: "—",            easy: "základní",    basic: "rozšířené",     pro: "rozšířené" },
  { label: "Sdílení a varování přes odkaz",   free: "✓",            easy: "✓",           basic: "✓",             pro: "✓" },
  { label: "PDF report ke stažení",           free: "✓",            easy: "✓",           basic: "✓",             pro: "✓" },
  { label: "Expirace kreditů",                free: "—",            easy: "nikdy",       basic: "měsíc",         pro: "měsíc" },
  { label: "Závazek",                         free: "žádný",        easy: "žádný",       basic: "zrušit kdykoli",pro: "zrušit kdykoli" },
];

const FAQ: { q: string; a: string }[] = [
  {
    q: "Mohu předplatné kdykoli zrušit?",
    a: "Ano. Předplatné si zrušíš jedním kliknutím v sekci Fakturace. Kredity, které ti zbývají do konce zaplaceného období, můžeš normálně dočerpat — nic se ti nepropadne dříve.",
  },
  {
    q: "Co když mi dojdou kredity uprostřed měsíce?",
    a: "Můžeš si dokoupit jednorázový balíček EASY (10 analýz za 29 Kč) — kredity se přičtou k tvému aktuálnímu zůstatku a nepropadnou. Nebo si upgraduj na vyšší tarif a kredity se ti rovnou navýší.",
  },
  {
    q: "Liší se výsledky mezi tarify?",
    a: "Ano, ale jen v hloubce. FREE a EASY používají rychlý model Haiku — kratší verdikt. BASIC nasazuje Sonnet — plný popis s vysvětlením. PRO běží na Opus — nejvyšší přesnost, taktiky útočníka, doporučení co dělat dál.",
  },
  {
    q: "Ukládáte moje zprávy?",
    a: "Ne. Obsah, který nám pošleš k analýze, není perzistentně ukládán k tvému profilu. Pokud klikneš na „Sdílet varování“, uloží se výsledek (verdikt, riziko, hrozby) na sdílecí URL — ten můžeš kdykoli smazat.",
  },
  {
    q: "Mohu Neklikni používat na firemní data?",
    a: "Pro technické zprávy a SMS klidně. Pro citlivá firemní data doporučujeme nejprve anonymizovat (jména, čísla účtů). Anthropic API neuchovává tvé prompty pro trénink modelů.",
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
    a: "3 analýzy denně bez registrace, plus PDF report a sdílení. Pro screenshoty, vyšší přesnost a více analýz si můžeš vybrat tarif.",
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
    border: "border-white/10",
    glow: "",
    iconBg: "bg-slate-700/40",
    iconColor: "text-slate-300",
    badgeBg: "bg-slate-700/30",
    badgeText: "text-slate-400",
    ctaBg: "bg-white/10 hover:bg-white/15 text-white",
    check: "text-slate-400",
    popularRing: "",
  },
  blue: {
    border: "border-blue-400/40",
    glow: "shadow-[0_30px_80px_-30px_rgba(59,130,246,0.55)]",
    iconBg: "bg-blue-500/20",
    iconColor: "text-blue-300",
    badgeBg: "bg-blue-500/15",
    badgeText: "text-blue-300",
    ctaBg: "bg-blue-500 hover:bg-blue-400 text-white shadow-lg shadow-blue-500/25",
    check: "text-blue-300",
    popularRing: "ring-2 ring-blue-400/40",
  },
  purple: {
    border: "border-purple-400/40",
    glow: "shadow-[0_30px_80px_-30px_rgba(168,85,247,0.55)]",
    iconBg: "bg-purple-500/20",
    iconColor: "text-purple-300",
    badgeBg: "bg-purple-500/15",
    badgeText: "text-purple-300",
    ctaBg: "bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white shadow-lg shadow-purple-500/30",
    check: "text-purple-300",
    popularRing: "",
  },
  amber: {
    border: "border-amber-400/40",
    glow: "shadow-[0_30px_80px_-30px_rgba(251,191,36,0.45)]",
    iconBg: "bg-amber-500/20",
    iconColor: "text-amber-300",
    badgeBg: "bg-amber-500/15",
    badgeText: "text-amber-300",
    ctaBg: "bg-amber-500/15 hover:bg-amber-500/25 text-amber-200 border border-amber-400/40",
    check: "text-amber-300",
    popularRing: "",
  },
};

export default function PricingPage() {
  const [loading, setLoading] = useState<Plan | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
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
      if (res.status === 401) { router.push("/login"); return; }
      if (!res.ok) { setToast("Chyba: " + (data?.error ?? `HTTP ${res.status}`)); return; }
      if (data?.url) { window.location.href = data.url; return; }
      setToast("Chyba: server nevrátil checkout URL.");
    } catch {
      setToast("Něco se pokazilo. Zkus to prosím znovu.");
    } finally {
      setLoading(null);
    }
  };

  const disabled = loading !== null;

  return (
    <div className="min-h-screen text-white">
      {PricingSchema(FAQ)}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-24 pb-20">

        {/* ─── Hero ─────────────────────────────────────── */}
        <section className="text-center space-y-5 mb-10 animate-fade-up">
          <span className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-purple-300 bg-purple-500/10 border border-purple-400/20 px-3 py-1.5 rounded-full">
            <Sparkles size={12} /> Vyber si svůj klid
          </span>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tighter">
            Ochrana, která se ti{" "}
            <span className="bg-gradient-to-r from-purple-400 via-fuchsia-300 to-blue-400 bg-clip-text text-transparent">
              vyplatí
            </span>
          </h1>
          <p className="text-slate-400 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
            Méně než cena jedné kávy měsíčně za to, že nikdo ve tvojí rodině nepřijde o úspory.
            Začni zdarma — kdykoli upgraduj nebo zruš.
          </p>

          {/* Trust badges */}
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs text-slate-400 pt-2">
            <span className="inline-flex items-center gap-1.5"><ShieldCheck size={14} className="text-green-400" /> 100% anonymní</span>
            <span className="inline-flex items-center gap-1.5"><RotateCcw size={14} className="text-green-400" /> Zrušit kdykoli</span>
            <span className="inline-flex items-center gap-1.5"><BadgeCheck size={14} className="text-green-400" /> Garantujeme nebo vrátíme peníze</span>
          </div>
        </section>

        {/* ─── Plan Cards ───────────────────────────────── */}
        <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-16">
          {PLANS.map((p, idx) => {
            const styles = ACCENT_STYLES[p.accent];
            const Icon = p.icon;
            const isLoading = !p.comingSoon && loading === (p.key as Plan);
            return (
              <div
                key={p.key}
                className={`relative surface-card p-7 sm:p-8 flex flex-col animate-fade-up ${p.popular ? "md:-translate-y-3 surface-card-elevated " + styles.popularRing : ""} ${styles.border} ${styles.glow}`}
                style={{ animationDelay: `${idx * 80}ms` }}
              >
                {p.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-blue-500 to-purple-500 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full whitespace-nowrap shadow-lg shadow-blue-500/30">
                    Nejoblíbenější
                  </div>
                )}
                {p.comingSoon && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-400 text-slate-900 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full whitespace-nowrap shadow-lg shadow-amber-500/40">
                    Připravujeme
                  </div>
                )}

                <div className="flex items-center gap-3 mb-5">
                  <div className={`${styles.iconBg} ${styles.iconColor} p-2.5 rounded-xl`}>
                    <Icon size={20} />
                  </div>
                  <h2 className="text-xl font-black tracking-tight">{p.name}</h2>
                </div>

                <div className="mb-1">
                  <span className="text-5xl font-black tracking-tight">{p.price} Kč</span>
                  <span className="text-slate-400 text-base font-medium ml-1">/ {p.period}</span>
                </div>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium mb-2">včetně 21 % DPH</p>
                <p className="text-slate-400 text-sm font-medium mb-6">{p.tagline}</p>

                <ul className="space-y-3 mb-7 flex-1">
                  {p.features.map((f) => (
                    <li key={f} className="flex gap-2.5 items-start text-sm text-slate-200">
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
              <span className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-amber-300 bg-amber-500/10 border border-amber-400/20 px-3 py-1.5 rounded-full">
                Spočítej si, co se ti vyplatí
              </span>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tighter">
                Jeden phishing v ČR =&nbsp;průměrně <span className="text-amber-300">35&nbsp;000&nbsp;Kč</span>
              </h2>
              <p className="text-slate-400 text-sm leading-relaxed">
                Podle ČNB a Policie ČR ztratil průměrný oběť phishingu v roce 2025 mezi 8 000 a 80 000 Kč. Babičce, která chytila falešnou Českou poštu, je dnes v průměru obrali o 25 000 Kč.
              </p>
            </div>

            <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5 sm:p-6">
              <div className="space-y-3">
                <div className="flex justify-between items-baseline">
                  <span className="text-slate-400 text-sm">Cena BASIC za rok:</span>
                  <span className="text-white font-black tabular-nums">1 188 Kč</span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-slate-400 text-sm">Cena PRO za rok:</span>
                  <span className="text-white font-black tabular-nums">2 388 Kč</span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-slate-400 text-sm">Průměrná škoda z phishingu:</span>
                  <span className="text-amber-300 font-black tabular-nums">35 000 Kč</span>
                </div>
                <div className="border-t border-white/10 pt-3 flex justify-between items-baseline">
                  <span className="text-white font-bold text-sm">ROI při 1 odhaleném podvodu (BASIC):</span>
                  <span className="text-emerald-400 font-black text-xl tabular-nums">29×</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── Money-Back Banner ────────────────────────── */}
        <section className="surface-card p-6 sm:p-8 mb-16 flex flex-col sm:flex-row items-center gap-5 animate-fade-up">
          <div className="bg-green-500/15 text-green-400 p-4 rounded-2xl shrink-0">
            <BadgeCheck size={28} />
          </div>
          <div className="text-center sm:text-left">
            <h3 className="text-lg font-black mb-1">14denní garance vrácení peněz</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Pokud ti Neklikni během 14 dnů od první platby nepomůže odhalit ani jeden podvod nebo nesplní očekávání, napiš nám —
              vrátíme ti celou částku, bez otázek.
            </p>
          </div>
        </section>

        {/* ─── Comparison Table ─────────────────────────── */}
        <section className="mb-20 animate-fade-up">
          <div className="text-center mb-8">
            <h2 className="text-3xl sm:text-4xl font-black tracking-tighter mb-2">Srovnání tarifů</h2>
            <p className="text-slate-400 text-sm">Co všechno se v každém tarifu skrývá</p>
          </div>

          {/* Mobile hint: scroll horizontally */}
          <p className="text-center text-[11px] text-slate-500 mb-3 sm:hidden">← Posuň prstem →</p>

          <div className="surface-card overflow-x-auto">
           <div className="min-w-[560px]">
            {/* Header row */}
            <div className="grid grid-cols-5 text-[10px] sm:text-xs font-black uppercase tracking-widest border-b border-white/5">
              <div className="p-3 sm:p-4 text-slate-500"></div>
              <div className="p-3 sm:p-4 text-center text-slate-400">FREE</div>
              <div className="p-3 sm:p-4 text-center text-slate-300">EASY</div>
              <div className="p-3 sm:p-4 text-center text-blue-300 bg-blue-500/5">BASIC</div>
              <div className="p-3 sm:p-4 text-center text-purple-300">PRO</div>
            </div>

            {COMPARE.map((row, i) => (
              <div
                key={row.label}
                className={`grid grid-cols-5 text-xs sm:text-sm border-b border-white/5 last:border-0 ${row.highlight ? "bg-white/[0.02] font-semibold" : ""}`}
              >
                <div className="p-3 sm:p-4 text-slate-300">{row.label}</div>
                <div className="p-3 sm:p-4 text-center text-slate-500">{row.free}</div>
                <div className="p-3 sm:p-4 text-center text-slate-300">{row.easy}</div>
                <div className="p-3 sm:p-4 text-center text-blue-300 bg-blue-500/5">{row.basic}</div>
                <div className="p-3 sm:p-4 text-center text-purple-300">{row.pro}</div>
              </div>
            ))}
           </div>
          </div>
        </section>

        {/* ─── FAQ ──────────────────────────────────────── */}
        <section className="mb-20 animate-fade-up">
          <div className="text-center mb-8">
            <h2 className="text-3xl sm:text-4xl font-black tracking-tighter mb-2">Časté otázky</h2>
            <p className="text-slate-400 text-sm">Než kupuješ, mrkni se na to, co se nejčastěji ptá</p>
          </div>

          <div className="space-y-2 max-w-3xl mx-auto">
            {FAQ.map((item, i) => {
              const open = openFaq === i;
              return (
                <div
                  key={item.q}
                  className={`surface-card overflow-hidden transition-colors ${open ? "border-purple-400/30" : ""}`}
                >
                  <button
                    onClick={() => setOpenFaq(open ? null : i)}
                    aria-expanded={open}
                    className="w-full px-5 py-4 flex items-center justify-between gap-3 text-left hover:bg-white/[0.02] transition-colors"
                  >
                    <span className="font-bold text-sm sm:text-base text-white">{item.q}</span>
                    <ChevronDown
                      size={18}
                      className={`text-slate-400 shrink-0 transition-transform ${open ? "rotate-180 text-purple-400" : ""}`}
                    />
                  </button>
                  {open && (
                    <div className="px-5 pb-5 text-slate-300 text-sm leading-relaxed animate-fade-up">
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
          <p className="text-slate-400 max-w-xl mx-auto leading-relaxed">
            Začni s 3 analýzami denně zdarma — bez registrace, bez kreditky.
            Kdykoli později se rozhodneš pro tarif, kredity se ti spočítají hned od první minuty.
          </p>
          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <button
              onClick={() => router.push("/")}
              className="px-6 py-3 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-bold text-sm transition-colors"
            >
              Vyzkoušet zdarma
            </button>
            <button
              onClick={() => handleCheckout("basic")}
              disabled={disabled}
              className="px-6 py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold text-sm shadow-lg shadow-purple-500/25 transition-all active:scale-[0.98] disabled:opacity-60"
            >
              {loading === "basic" ? "Načítám…" : "Začít s BASIC za 99 Kč"}
            </button>
          </div>
        </section>
      </main>

      {toast && (
        <div role="alert" className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-red-950/95 border border-red-500/40 text-red-200 px-5 py-3 rounded-2xl text-sm font-medium shadow-2xl backdrop-blur max-w-sm w-full mx-4">
          <span className="flex-1">{toast}</span>
          <button type="button" onClick={() => setToast(null)} aria-label="Zavřít" className="shrink-0 text-red-400 hover:text-red-200 transition-colors">
            <X size={15} />
          </button>
        </div>
      )}
    </div>
  );
}
