"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Send, Brain, ShieldCheck, Sparkles,
  Zap, Eye, Lock, Heart, Quote, ArrowRight,
} from "lucide-react";
import LeadMagnet from "./LeadMagnet";

const STEPS = [
  {
    icon: Send,
    title: "Vlož zprávu",
    text: "Zkopíruj podezřelou SMS, e-mail nebo přetáhni screenshot. Můžeš i jen odkaz.",
  },
  {
    icon: Brain,
    title: "AI analyzuje",
    text: "Naše pokročilá AI rozebere odesílatele, jazyk a taktiky útočníka a vyhodnotí riziko.",
  },
  {
    icon: ShieldCheck,
    title: "Dostaneš verdikt",
    text: "Procentuální riziko, vysvětlení česky a konkrétní doporučení — co dělat dál.",
  },
];

const BENEFITS = [
  {
    icon: Zap,
    title: "Výsledek do 10 sekund",
    text: "Žádné dlouhé čekání. Stihneš to dřív, než stihneš poslat peníze.",
  },
  {
    icon: Eye,
    title: "Vidí, co lidé přehlédnou",
    text: "Falešné domény, cyrilice v písmenech, urgentní fráze — AI najde, co by ti uniklo.",
  },
  {
    icon: Lock,
    title: "Ochrana soukromí",
    text: "Anonymní použití, zprávy se neukládají. Data nikdy neopustí naše zabezpečené API.",
  },
  {
    icon: Heart,
    title: "I pro rodinu",
    text: "Pošli odkaz babičce nebo dětem. Sdílej výsledek přes WhatsApp jedním klikem.",
  },
];

const USE_CASES = [
  {
    label: "Pro rodiče",
    title: "Babička, Česká pošta a 25 000 Kč",
    text: "Babičce přijde SMS o nedoručeném balíku za 29 Kč. Před zaplacením ti to pošle. Vložíš to na Neklikni — během 2 sekund vidíš 92% riziko a varování. Babička nezaplatí. Útočníci nezískali přístup ke kartě, kde má našetřené úspory.",
  },
  {
    label: "Pro netechnické",
    title: "Verdikt v češtině, ne v IT jazyce",
    text: "Většina antispam nástrojů ti řekne „SPAM detected, score 8.4“ — pro člověka bez IT znalostí to nic neznamená. Neklikni dá konkrétní odpověď: „Toto je phishing. Odesílatel není ČSOB. Doména csob-overeni.cz neexistuje. Neklikejte.“",
  },
  {
    label: "Pro firmy / účetní",
    title: "Když ti denně chodí 5+ podezřelých e-mailů",
    text: "Pro účetní a HR pracovníky chodí denně desítky e-mailů od „úřadů“, „bank“, „dodavatelů“. PRO tarif s detailním rozborem rychle odliší legitimní žádost od pokusu o podvodný převod. Šetří desítky minut denně.",
  },
  {
    label: "Pro nákupy z bazaru",
    title: "Marketplace, Vinted a číslo účtu cizího člověka",
    text: "Než pošleš peníze za zboží z inzerátu, prověříš si číslo účtu, telefon nebo profil prodejce v databázi nahlášených podvodů. Když už někoho oškubal, dozvíš se to dřív, než přijdeš o peníze.",
  },
];

const FAQ_HOME: { q: string; a: string }[] = [
  {
    q: "Je to opravdu zdarma?",
    a: "Ano. 2 analýzy denně máš zdarma — bez registrace, bez kreditky. Pro častější použití nebo screenshoty si můžeš vybrat tarif.",
  },
  {
    q: "Ukládáte moje zprávy?",
    a: "Ne. Obsah analýzy se neukládá k tvému profilu. Jen pokud klikneš „Sdílet varování“, uloží se výsledek na sdílecí URL — ten můžeš kdykoli smazat.",
  },
  {
    q: "Co když AI udělá chybu?",
    a: "AI je pomocník, ne soudce. Hraniční případy (riziko 40-60 %) doporučujeme ověřit i jinou cestou — zavolat banku, ověřit odesílatele.",
  },
  {
    q: "Jak funguje prověření prodejce?",
    a: "Zadáš číslo účtu, telefonní číslo nebo odkaz na profil prodejce. Neklikni porovná údaj s databází nahlášených podvodů. Pokud už na daný účet nebo profil někdo podal nahlášení, hned to uvidíš.",
  },
  {
    q: "Odkud máte data o podvodných prodejcích?",
    a: "Z nahlášení od registrovaných uživatelů, která ručně kontrolujeme před zveřejněním. Každé nahlášení musí mít důkaz – screenshot a popis. Díky tomu je databáze relevantní a ne zaplevelená spamem.",
  },
];

function useTotalAnalyses() {
  const [total, setTotal] = useState<number | null>(null);
  useEffect(() => {
    fetch("/api/stats", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setTotal(typeof d?.total === "number" ? d.total : null))
      .catch(() => setTotal(null));
  }, []);
  return total;
}

/** Smooth count-up animation from 0 to target. Returns the displayed value. */
function useCountUp(target: number | null, durationMs = 1400) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (target === null) return;
    const start = performance.now();
    let raf: number;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(target * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs]);
  return value;
}

export default function HomeSections() {
  const total = useTotalAnalyses();
  const counted = useCountUp(total);

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 mt-16 sm:mt-24 space-y-20 sm:space-y-28 pb-16">

      {/* ─── Live Stats ─────────────────────────────────── */}
      {total !== null && (
        <section className="animate-fade-up">
          <div className="flex justify-center mb-5">
            <span className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-emerald-300 bg-emerald-500/10 border border-emerald-400/20 px-3 py-1.5 rounded-full">
              <span className="relative flex w-2 h-2">
                <span className="absolute inset-0 rounded-full bg-emerald-400 opacity-70 animate-ping" />
                <span className="relative rounded-full w-2 h-2 bg-emerald-400" />
              </span>
              Živé čísla z provozu
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3 sm:gap-6">
            {[
              {
                value: counted.toLocaleString("cs-CZ"),
                label: "provedených analýz",
                color: "text-purple-300",
              },
              { value: "<10s", label: "průměrný čas analýzy", color: "text-blue-300" },
              { value: "100%", label: "anonymních dotazů",     color: "text-emerald-300" },
            ].map((s) => (
              <div key={s.label} className="surface-card p-4 sm:p-6 text-center">
                <div className={`text-3xl sm:text-5xl font-black tracking-tighter ${s.color} tabular-nums`}>{s.value}</div>
                <div className="text-[10px] sm:text-xs uppercase tracking-widest text-slate-400 font-bold mt-1 sm:mt-2">{s.label}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ─── How It Works ───────────────────────────────── */}
      <section>
        <header className="text-center mb-10 sm:mb-12 space-y-3 animate-fade-up">
          <span className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-blue-300 bg-blue-500/10 border border-blue-400/20 px-3 py-1.5 rounded-full">
            <Sparkles size={12} /> Jak to funguje
          </span>
          <h2 className="text-3xl sm:text-4xl font-black tracking-tighter">
            Tři kroky k <span className="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">jistotě</span>
          </h2>
          <p className="text-slate-400 max-w-xl mx-auto">Žádné instalace, žádný účet. Vlož → klikni → vyhodnoť.</p>
        </header>

        <div className="grid md:grid-cols-3 gap-5">
          {STEPS.map((step, i) => {
            const Icon = step.icon;
            return (
              <div key={step.title} className="surface-card p-6 sm:p-7 relative animate-fade-up" style={{ animationDelay: `${i * 100}ms` }}>
                <div className="absolute -top-3 -left-3 w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center font-black text-white text-sm shadow-lg shadow-purple-500/30">
                  {i + 1}
                </div>
                <div className="bg-purple-500/15 text-purple-300 w-12 h-12 rounded-2xl flex items-center justify-center mb-4 mt-2">
                  <Icon size={22} />
                </div>
                <h3 className="text-lg font-black mb-2">{step.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{step.text}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ─── Benefits Grid ──────────────────────────────── */}
      <section>
        <header className="text-center mb-10 sm:mb-12 space-y-3 animate-fade-up">
          <span className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-purple-300 bg-purple-500/10 border border-purple-400/20 px-3 py-1.5 rounded-full">
            <Sparkles size={12} /> Proč Neklikni
          </span>
          <h2 className="text-3xl sm:text-4xl font-black tracking-tighter">
            AI bodyguard, který <span className="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">nikdy nespí</span>
          </h2>
        </header>

        <div className="grid sm:grid-cols-2 gap-5">
          {BENEFITS.map((b, i) => {
            const Icon = b.icon;
            return (
              <div key={b.title} className="surface-card p-6 flex gap-4 items-start animate-fade-up" style={{ animationDelay: `${i * 80}ms` }}>
                <div className="bg-gradient-to-br from-purple-500/20 to-blue-500/20 text-purple-300 w-11 h-11 rounded-2xl flex items-center justify-center shrink-0">
                  <Icon size={20} />
                </div>
                <div>
                  <h3 className="font-black text-base mb-1">{b.title}</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">{b.text}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ─── Use Cases ──────────────────────────────────── */}
      <section>
        <header className="text-center mb-10 sm:mb-12 space-y-3 animate-fade-up">
          <span className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-yellow-300 bg-yellow-500/10 border border-yellow-400/20 px-3 py-1.5 rounded-full">
            <Sparkles size={12} /> Reálné scénáře použití
          </span>
          <h2 className="text-3xl sm:text-4xl font-black tracking-tighter">
            Pro koho <span className="bg-gradient-to-r from-yellow-300 to-orange-300 bg-clip-text text-transparent">to dává smysl</span>
          </h2>
          <p className="text-slate-400 max-w-xl mx-auto text-sm">Reálné situace, ve kterých Neklikni pomáhá. Bez vymyšlených hvězdiček.</p>
        </header>

        {/* 4 karty: 2×2 na tabletu, 4 v řadě na desktopu */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {USE_CASES.map((t, i) => (
            <figure key={t.title} className="surface-card p-6 flex flex-col animate-fade-up" style={{ animationDelay: `${i * 100}ms` }}>
              <Quote size={20} className="text-purple-400/60 mb-3" />
              <span className="inline-block text-[10px] font-black uppercase tracking-widest text-purple-300 bg-purple-500/10 border border-purple-400/20 px-2.5 py-1 rounded-full mb-3 w-fit">
                {t.label}
              </span>
              <h3 className="font-black text-lg leading-tight mb-3">{t.title}</h3>
              <p className="text-slate-300 text-sm leading-relaxed flex-1">
                {t.text}
              </p>
            </figure>
          ))}
        </div>
      </section>

      {/* ─── Lead Magnet ────────────────────────────────── */}
      <LeadMagnet />

      {/* ─── Pricing CTA Banner ─────────────────────────── */}
      <section className="surface-card-elevated p-8 sm:p-12 text-center space-y-5 animate-fade-up">
        <h2 className="text-3xl sm:text-4xl font-black tracking-tighter">
          Připraven na <span className="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">víc analýz</span>?
        </h2>
        <p className="text-slate-300 max-w-xl mx-auto leading-relaxed">
          Od 99 Kč měsíčně získáš 50 analýz, screenshoty a plný verdikt. Zruš kdykoli, 14denní garance vrácení peněz.
        </p>
        <div className="flex flex-wrap justify-center gap-3 pt-2">
          <Link
            href="/pricing"
            className="group inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-black text-sm uppercase tracking-wider shadow-lg shadow-purple-500/30 transition-all active:scale-[0.98]"
          >
            Zobrazit ceník
            <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
        <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs text-slate-400 pt-2">
          <span>✓ Zrušit kdykoli</span>
          <span>✓ Žádný závazek</span>
          <span>✓ Garance vrácení peněz</span>
        </div>
      </section>

      {/* ─── Mini FAQ ───────────────────────────────────── */}
      <section className="max-w-3xl mx-auto w-full">
        <header className="text-center mb-8 space-y-2 animate-fade-up">
          <h2 className="text-2xl sm:text-3xl font-black tracking-tighter">Časté otázky</h2>
          <p className="text-slate-400 text-sm">
            Víc odpovědí na <Link href="/pricing" className="text-purple-300 hover:text-purple-200 underline underline-offset-2">stránce s ceníkem</Link>.
          </p>
        </header>

        <div className="space-y-2">
          {FAQ_HOME.map((item, i) => (
            <details key={item.q} className="group surface-card overflow-hidden animate-fade-up" style={{ animationDelay: `${i * 60}ms` }}>
              <summary className="cursor-pointer list-none px-5 py-4 flex items-center justify-between gap-3 hover:bg-white/[0.02] transition-colors font-bold text-sm sm:text-base">
                <span>{item.q}</span>
                <span className="text-slate-400 group-open:rotate-180 group-open:text-purple-400 transition-transform shrink-0">
                  <ArrowRight size={16} className="rotate-90" />
                </span>
              </summary>
              <div className="px-5 pb-5 text-slate-300 text-sm leading-relaxed">{item.a}</div>
            </details>
          ))}
        </div>
      </section>

    </div>
  );
}
