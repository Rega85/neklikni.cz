import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  Check,
  GraduationCap,
  MessageSquareWarning,
  ShieldCheck,
  Users,
} from "lucide-react";
import FirmyLeadForm from "./FirmyLeadForm";

export const metadata: Metadata = {
  title: "NeKlikni pro firmy | Praktická ochrana zaměstnanců před podvody",
  description:
    "Praktická školení a průběžné mikrolekce proti phishingu, smishingu a dalším online podvodům. Srozumitelně pro běžné zaměstnance, ne jen pro IT.",
  alternates: { canonical: "https://neklikni.cz/firmy" },
};

const PACKAGES = [
  {
    name: "PILOT",
    price: "9 900 Kč",
    note: "jednorázově",
    description: "Nejrychlejší způsob, jak zjistit, kde má firma slabá místa a jestli zaměstnance téma opravdu zaujme.",
    features: [
      "60–90min praktický workshop",
      "reálné české scénáře podvodů",
      "krátký vstupní a výstupní test",
      "materiály pro zaměstnance",
      "stručné doporučení pro HR / management",
    ],
    cta: "Chci pilot",
  },
  {
    name: "PROTECT",
    price: "od 4 900 Kč",
    note: "měsíčně",
    description: "Průběžná prevence místo jednoho školení, na které se za dva týdny zapomene.",
    features: [
      "nové krátké mikrolekce každý měsíc",
      "aktuální scénáře SMS, e-mailů a podvodných nabídek",
      "krátké testy zaměstnanců",
      "firemní souhrn výsledků",
      "možnost konzultovat podezřelé zprávy",
    ],
    cta: "Chci Protect",
    featured: true,
  },
  {
    name: "NA MÍRU",
    price: "individuálně",
    note: "pro větší firmy",
    description: "Pro firmy, které chtějí onboarding, vlastní scénáře, pravidelný reporting nebo více provozů.",
    features: [
      "obsah podle konkrétního provozu",
      "onboarding nových zaměstnanců",
      "více lokalit / směn",
      "reporting pro HR a management",
      "možnost partnerských bezpečnostních testů",
    ],
    cta: "Probrat řešení",
  },
];

const AUDIENCES = [
  "výrobní firmy a logistika",
  "retail a zákaznické provozy",
  "administrativa a back office",
  "firmy s 50–500+ zaměstnanci",
];

export default function FirmyPage() {
  return (
    <main className="min-h-screen pt-16 text-white">
      <section className="relative overflow-hidden px-6 pb-20 pt-20 sm:pt-28">
        <div className="absolute inset-x-0 top-0 -z-10 mx-auto h-[520px] max-w-6xl bg-[radial-gradient(circle_at_center,rgba(124,58,237,0.20),transparent_65%)]" />
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto max-w-4xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-purple-400/25 bg-purple-500/10 px-4 py-2 text-xs font-black uppercase tracking-widest text-purple-200">
              <Building2 size={15} /> NeKlikni pro firmy
            </div>
            <h1 className="text-4xl font-black tracking-tight sm:text-6xl lg:text-7xl">
              Zaměstnanec nemusí rozumět kyberbezpečnosti.
              <span className="block bg-gradient-to-r from-purple-300 via-white to-blue-300 bg-clip-text text-transparent">
                Musí poznat podvod včas.
              </span>
            </h1>
            <p className="mx-auto mt-7 max-w-3xl text-base leading-relaxed text-slate-300 sm:text-xl">
              Praktická prevence phishingu, podvodných SMS, falešných plateb a sociálního inženýrství. Bez technického žargonu. Na příkladech, které zaměstnanci skutečně potkávají.
            </p>
            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <a
                href="#pilot"
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 px-6 py-4 text-sm font-black uppercase tracking-wider shadow-xl shadow-purple-500/20 transition hover:from-purple-500 hover:to-blue-500"
              >
                Chci firemní pilot <ArrowRight size={17} />
              </a>
              <Link
                href="/"
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-6 py-4 text-sm font-bold text-slate-200 transition hover:bg-white/10"
              >
                Vyzkoušet veřejný ověřovač
              </Link>
            </div>
          </div>

          <div className="mt-14 grid gap-4 md:grid-cols-3">
            {[
              [MessageSquareWarning, "Reálné podvody", "Scénáře z běžného života: banka, kurýr, marketplace, faktura, nadřízený i falešná podpora."],
              [GraduationCap, "Lidské školení", "Žádná hodina slidů o protokolech. Zaměstnanec odchází s jednoduchými pravidly, která si zapamatuje."],
              [ShieldCheck, "Průběžná prevence", "Útoky se mění. Proto dává větší smysl krátké pravidelné připomenutí než školení jednou ročně."],
            ].map(([Icon, title, text]) => {
              const I = Icon as typeof ShieldCheck;
              return (
                <div key={String(title)} className="rounded-3xl border border-white/10 bg-white/[0.035] p-6 backdrop-blur">
                  <I className="mb-4 h-8 w-8 text-purple-300" />
                  <h2 className="text-lg font-black">{String(title)}</h2>
                  <p className="mt-2 text-sm leading-relaxed text-slate-400">{String(text)}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="border-y border-white/5 bg-slate-900/30 px-6 py-16">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1.05fr_.95fr] lg:items-center">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 text-sm font-black uppercase tracking-widest text-blue-300">
              <Users size={17} /> Pro koho to dává smysl
            </div>
            <h2 className="text-3xl font-black tracking-tight sm:text-4xl">Neprodáváme další IT nástroj, kterému rozumí jen IT.</h2>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-slate-300">
              Cíl je jednoduchý: snížit pravděpodobnost, že běžný zaměstnanec pošle peníze, heslo nebo firemní údaje útočníkovi jen proto, že zpráva vypadala důvěryhodně.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {AUDIENCES.map((item) => (
              <div key={item} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/70 p-4 text-sm font-semibold text-slate-200">
                <Check className="h-5 w-5 shrink-0 text-emerald-300" /> {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-black uppercase tracking-widest text-purple-300">Jednoduchá nabídka</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">Začněte pilotem. Teprve potom řešte dlouhodobý program.</h2>
            <p className="mt-5 text-slate-400">Ceny jsou startovní nabídka pro první firemní zákazníky a mohou se upravit podle rozsahu a počtu zaměstnanců.</p>
          </div>

          <div className="mt-12 grid gap-5 lg:grid-cols-3">
            {PACKAGES.map((plan) => (
              <article
                key={plan.name}
                className={`relative flex flex-col rounded-3xl border p-7 ${
                  plan.featured
                    ? "border-purple-400/45 bg-gradient-to-b from-purple-500/10 to-slate-950 shadow-2xl shadow-purple-500/10"
                    : "border-white/10 bg-white/[0.025]"
                }`}
              >
                {plan.featured && (
                  <span className="absolute right-5 top-5 rounded-full bg-purple-500/20 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-purple-200">
                    průběžná ochrana
                  </span>
                )}
                <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">{plan.name}</p>
                <div className="mt-5">
                  <span className="text-3xl font-black">{plan.price}</span>
                  <span className="ml-2 text-xs text-slate-500">{plan.note}</span>
                </div>
                <p className="mt-4 min-h-20 text-sm leading-relaxed text-slate-400">{plan.description}</p>
                <ul className="mt-6 flex-1 space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex gap-3 text-sm text-slate-200">
                      <BadgeCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" /> {feature}
                    </li>
                  ))}
                </ul>
                <a href="#pilot" className="mt-8 inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-black transition hover:bg-white/10">
                  {plan.cta}
                </a>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="pilot" className="scroll-mt-24 border-t border-white/5 bg-slate-900/25 px-6 py-20">
        <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[.9fr_1.1fr] lg:items-start">
          <div className="lg:sticky lg:top-28">
            <p className="text-sm font-black uppercase tracking-widest text-emerald-300">Pilotní spolupráce</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">Nejdřív ověřme, jestli to vaší firmě přinese hodnotu.</h2>
            <p className="mt-5 text-base leading-relaxed text-slate-300">
              Vyplňte pár údajů. Ozveme se, projdeme typ provozu, nejčastější rizika a navrhneme pilot. Bez závazku k předplatnému.
            </p>
            <div className="mt-7 space-y-3 text-sm text-slate-400">
              <p className="flex gap-3"><Check className="h-5 w-5 text-emerald-300" /> vhodné i pro směnný provoz</p>
              <p className="flex gap-3"><Check className="h-5 w-5 text-emerald-300" /> obsah lze přizpůsobit typu firmy</p>
              <p className="flex gap-3"><Check className="h-5 w-5 text-emerald-300" /> cílem není strašit, ale naučit rychlou kontrolu</p>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-6 shadow-2xl sm:p-8">
            <FirmyLeadForm />
          </div>
        </div>
      </section>
    </main>
  );
}
