import type { Metadata } from "next";
import Link from "next/link";
import { Shield, ArrowLeft } from "lucide-react";
import PrintButton from "./PrintButton";

export const metadata: Metadata = {
  title: "10 nejčastějších českých podvodů 2026 | NeKlikni.cz",
  description:
    "Reálné ukázky SMS, e-mailů a falešných webů, které kolovaly v Česku v roce 2025/2026. Konkrétní fráze, domény a obrana proti každému z 10 nejčastějších útoků.",
  alternates: { canonical: "https://www.neklikni.cz/podvody-2026" },
  robots: { index: true, follow: true },
};

const SCAMS: { title: string; example: string; defense: string }[] = [
  {
    title: "1. Falešná Česká pošta — nedoručený balík",
    example:
      "Ceska posta: Vas balik nelze dorucit kvuli chybejicimu poplatku 29 Kc. Zaplatte zde: ceska-posta-doruceni.com",
    defense:
      "Skutečné domény Pošty: ceskaposta.cz a balikuj.cz. Žádné -doruceni.com, -platba apod. Pošta nikdy nevybírá poplatky přes SMS odkaz.",
  },
  {
    title: "2. Bankovní phishing — zablokovaná karta / podezřelá transakce",
    example:
      "Vážený kliente, Vaše karta byla zablokována z důvodu podezřelé aktivity. Pro odblokování klikněte: csob-overeni.cz/login",
    defense:
      "Domény bank: csob.cz, kb.cz, airbank.cz, csas.cz. Vše s pomlčkou nebo cizí koncovkou (-secure, -overeni, .com) je podvod. Banka nikdy SMS-em nepožaduje přihlášení.",
  },
  {
    title: "3. Vishing — telefonát z „bezpečnostního oddělení banky“",
    example:
      "„Dobrý den, volám vám z bezpečnostního oddělení ČSOB. Detekovali jsme útok na váš účet. Pro ochranu peněz je převedeme na bezpečný účet. Potřebuji od vás kód, který vám teď přijde SMS-kou.“",
    defense:
      "Banka nikdy nezavolá s žádostí o převod na „bezpečný účet“ ani o kód z autorizační SMS. Když máš pochybnost: zavěs a sám zavolej na číslo z webu banky.",
  },
  {
    title: "4. Falešný úřad — FÚ / VZP / ČSSZ",
    example:
      "Financni urad CR: Evidujeme u Vas nedoplatek 4 250 Kc. Pokud nezaplatite do 48 hodin, bude zahajeno exekucni rizeni. Platba zde: financni-urad-platby.cz",
    defense:
      "Úřady nekomunikují přes platební SMS — pouze datovou schránkou, doporučenou poštou nebo přes oficiální portál (mojedane.cz, vzp.cz, cssz.cz).",
  },
  {
    title: "5. „Mami, rozbil se mi telefon“",
    example:
      "Ahoj mami, rozbil se mi telefon, tohle je nove cislo. Ulozim si ho prosim? Potrebuji pomoct s urgentni platbou, muzes prosim?",
    defense:
      "Vždy zavolej dítěti na původní číslo (i když ti říkají, že nejde). Domluv s rodinou „heslo“ — krátké slovo, které musí dítě říct, když se ozve z neznámého čísla.",
  },
  {
    title: "6. Falešná soutěž / výhra (iPhone, dárkové karty)",
    example:
      "GRATULUJEME! Byl/a jste vybran/a jako vyherce iPhone 16 Pro. Pro vyzvednuti vyplnte udaje zde: vyhry-cz.com/iphone",
    defense:
      "Pokud jsi do soutěže nepřihlásil(a) — žádná výhra neexistuje. Útočníci sebrali jméno a číslo z úniku dat (Heureka, různé e-shopy) a posílají hromadně.",
  },
  {
    title: "7. Falešný kurýr (Zásilkovna, DPD, GLS)",
    example:
      "Zasilkovna: Vas balik byl odeslan na vyzvednutim. Pro doruceni domu zaplatte 35 Kc: zasilkovna-doruceni.com",
    defense:
      "Skutečné domény: zasilkovna.cz, dpd.cz, gls-czech.com. Sledování i doručování se nikdy neplatí přes SMS odkaz. Stav balíku najdeš v jejich oficiální aplikaci.",
  },
  {
    title: "8. Falešný operátor (T-Mobile, O2, Vodafone)",
    example:
      "T-Mobile: Vase faktura nebyla uhrazena, sluzba bude prerusena. Zaplatte do 24h: tmobile-platby.cz",
    defense:
      "Operátoři posílají vyúčtování e-mailem nebo přes svou aplikaci, ne odkazem na okamžitou platbu v SMS. Skutečné domény: t-mobile.cz, o2.cz, vodafone.cz.",
  },
  {
    title: "9. Romantický podvod (love scam) — Tinder, Facebook, Instagram",
    example:
      "Po týdnech každodenního chatu „voják v zahraničí“ / „lékař v Africe“ tvrdí, že má naléhavý problém a potřebuje 30 000 Kč na cestu domů. Slibuje, že vrátí.",
    defense:
      "Pokud člověk, kterého jsi nikdy neviděl(a) na živém video-hovoru, žádá peníze, je to podvod. Útočníci si vybírají hodiny rozhovorů, aby zbudovali důvěru, pak udeří. Nikdy neposílej peníze někomu, koho jsi neviděl(a).",
  },
  {
    title: "10. Investiční podvod (Quantum AI, CryptoStar, falešní brokeři)",
    example:
      "Reklama na Facebooku se slavnou tváří (Lukáš Vaculík, Jaromír Soukup) tvrdí, že vydělali milion na investici do AI/krypta. Klikneš → registrace → volá ti „investiční poradce“, žádá vklad 5 000 Kč pro „demo“. Z 5 000 se rychle stane 50 000.",
    defense:
      "ČNB (cnb.cz) vede seznam nelicencovaných brokerů — vždy si firmu ověř. Žádný legit broker nepoužívá kdejakou tvář ze známé osobnosti, žádný legit broker nezavolá první. Skutečné výnosy 1000 % za týden neexistují.",
  },
];

export default function Podvody2026() {
  return (
    <div className="min-h-screen text-white">
      <main className="max-w-3xl mx-auto px-4 sm:px-6 pt-24 pb-20 print:pt-8">
        <div className="flex items-center justify-between mb-8 print:hidden">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-slate-400 hover:text-white text-sm transition-colors"
          >
            <ArrowLeft size={14} /> Zpět
          </Link>
          <PrintButton />
        </div>

        <header className="space-y-4 mb-10">
          <div className="flex items-center gap-2 text-purple-400">
            <Shield size={20} />
            <span className="text-xs font-black uppercase tracking-widest">NeKlikni.cz</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tighter leading-[1.05]">
            10 nejčastějších českých podvodů 2026
          </h1>
          <p className="text-lg text-slate-300 leading-relaxed">
            Reálné ukázky SMS, e-mailů a falešných webů, které kolovaly v Česku v roce 2025/2026.
            Konkrétní fráze, domény a obrana ke každému typu.
          </p>
          <div className="text-xs text-slate-500 pt-2 border-b border-white/10 pb-5">
            Aktualizováno: 5. května 2026 · Zdroje: Policie ČR, NÚKIB, Česká pošta, ČNB
          </div>
        </header>

        <div className="article-content space-y-10">
          {SCAMS.map((s) => (
            <section key={s.title}>
              <h2>{s.title}</h2>
              <p><strong>Ukázka:</strong></p>
              <blockquote>{s.example}</blockquote>
              <p><strong>Obrana:</strong> {s.defense}</p>
            </section>
          ))}

          <section className="border-t border-white/10 pt-8">
            <h2>Univerzální pravidla obrany</h2>
            <ol>
              <li><strong>Klikni jen na to, co jsi sám(a) inicioval(a).</strong></li>
              <li><strong>Doménu si vždy přečti důkladně</strong> — pomlčky a podtržítka v doménách bank/úřadů jsou podvod.</li>
              <li><strong>Časový tlak = útok.</strong> Skutečné instituce na tebe netlačí v sekundách.</li>
              <li><strong>Žádný úřad ani banka po SMS / telefonu nežádá kód</strong> z autorizace, heslo ani peníze na „bezpečný účet“.</li>
              <li><strong>Rodinné heslo</strong> — krátké slovo proti útokům typu „mami, rozbil se mi telefon“.</li>
              <li><strong>Při pochybnosti zavěs a zavolej zpět</strong> — z čísla, které najdeš na oficiálním webu.</li>
              <li><strong>Sdílej tato pravidla</strong> rodičům a prarodičům. Útočníci cílí na nejzranitelnější.</li>
            </ol>
          </section>

          <section className="border-t border-white/10 pt-8">
            <h2>Kde nahlásit podvod</h2>
            <ul>
              <li><strong>Policie ČR</strong> — <a href="https://www.policie.cz" target="_blank" rel="noopener noreferrer">policie.cz</a> nebo 158</li>
              <li><strong>NÚKIB</strong> (Národní úřad pro kybernetickou bezpečnost) — <a href="https://nukib.cz" target="_blank" rel="noopener noreferrer">nukib.cz</a></li>
              <li><strong>Tvůj operátor</strong> — přepošli SMS na <strong>7726</strong> (T-Mobile, O2, Vodafone) jako spam</li>
              <li><strong>Banka</strong> — okamžitě zablokuj kartu, máš nárok na vrácení peněz dle zákona č. 370/2017 Sb.</li>
            </ul>
          </section>
        </div>

        <footer className="mt-16 pt-8 border-t border-white/10 text-center text-xs text-slate-500 print:mt-8">
          <p>
            Vygenerováno na <strong className="text-slate-300">NeKlikni.cz</strong> — AI bodyguard pro tvůj klidný internet.
          </p>
          <p className="mt-2">
            Pokud máš podezřelou zprávu, vlož ji na{" "}
            <Link href="/" className="text-purple-300 underline">neklikni.cz</Link> — AI ti odpoví do 3 sekund.
          </p>
        </footer>
      </main>
    </div>
  );
}
