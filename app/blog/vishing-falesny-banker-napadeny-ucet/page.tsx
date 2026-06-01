import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getArticleBySlug } from "../_data/articles";
import ArticleLayout from "../_components/ArticleLayout";

const SLUG = "vishing-falesny-banker-napadeny-ucet";

export async function generateMetadata(): Promise<Metadata> {
  const a = getArticleBySlug(SLUG);
  if (!a) return {};
  return {
    title: `${a.title} | NeKlikni.cz`,
    description: a.description,
    alternates: { canonical: `https://www.neklikni.cz/blog/${SLUG}` },
    openGraph: {
      title: a.title,
      description: a.description,
      type: "article",
      publishedTime: a.publishedAt,
    },
  };
}

export default function Page() {
  const article = getArticleBySlug(SLUG);
  if (!article) return notFound();

  return (
    <ArticleLayout article={article}>
      <p>
        Zazvoní telefon. Na druhém konci je klidný, profesionálně znějící hlas, který se představí jako pracovník
        bezpečnostního oddělení vaší banky. Říká, že váš účet byl napaden, probíhá neoprávněná transakce
        a musíte jednat okamžitě. Zní to naléhavě a věrohodně. Přesto může jít o podvod.
        Říká se mu <strong>vishing</strong> — telefonický phishing — a patří mezi nejúčinnější techniky,
        protože nefunguje na technické zranitelnosti, ale na důvěru a strach.
      </p>

      <h2>Jak vishing probíhá: typický průběh hovoru</h2>
      <p>Schéma bývá téměř vždy stejné, i když konkrétní detaily se mění:</p>
      <ol>
        <li>
          <strong>Hovor přijde z čísla, které vypadá jako banka.</strong>
          Útočníci technicky zobrazí vaše banky telefonní číslo přes tzv. spoofing — falšování ID volajícího.
          Číslo ve výpisu tedy odpovídá číslu vaší banky, přestože volá někdo jiný.
        </li>
        <li>
          <strong>&bdquo;Zpozorovali jsme podezřelou aktivitu na vašem účtu.&ldquo;</strong>
          Útočník zmíní konkrétní detail — vaše jméno, banku nebo obecný název produktu (&bdquo;platební kartou&ldquo;,
          &bdquo;internetovým bankovnictvím&ldquo;). Tohle zvyšuje důvěryhodnost.
        </li>
        <li>
          <strong>Vytváří časový tlak a strach.</strong>
          &bdquo;Právě teď probíhá pokus o odeslání 48 tisíc korun do zahraničí. Pokud nejednáte,
          peníze jsou pryč do pěti minut.&ldquo;
        </li>
        <li>
          <strong>Navrhuje &bdquo;řešení&ldquo;.</strong>
          Buď vás požádá o přihlašovací údaje nebo SMS kód, aby &bdquo;transakci zastavil&ldquo;,
          nebo vás navede, abyste peníze sami převedli na &bdquo;bezpečný záchranný účet&ldquo;
          — který ve skutečnosti patří útočníkovi.
        </li>
      </ol>

      <h2>Co útočník o vás může vědět a odkud</h2>
      <p>
        Mnohé oběti se diví: &bdquo;Jak mohl vědět moje jméno a banku?&ldquo; Data útočníci získávají z různých zdrojů:
      </p>
      <ul>
        <li>Úniky dat z e-shopů, aplikací nebo starých fór (vaše e-mailová adresa a jméno jsou veřejně dostupné).</li>
        <li>Sociální sítě — z vašeho profilu nebo příspěvků lze odvodit banku, povolání nebo životní situaci.</li>
        <li>Phishingové stránky, na které mohli padnout příbuzní nebo přátelé — data se mezi skupinami obchodují.</li>
        <li>Náhodné volání s obecnými frázemi — &bdquo;Vážená paní/pane&ldquo; a název banky, která je v ČR nejrozšířenější.</li>
      </ul>
      <p>
        I s minimálními informacemi lze vytvořit přesvědčivý hovor, protože útočník vás vede k tomu,
        abyste sám(a) potvrdil(a) detaily: &bdquo;Máte u nás konto nebo spořicí účet?&ldquo; — a vy odpovíte.
      </p>

      {/* Mid-article CTA */}
      <div className="not-prose my-8 rounded-2xl border border-purple-500/30 bg-purple-500/5 p-5 space-y-3">
        <p className="font-bold text-white">Dostali jste podobný hovor nebo zprávu?</p>
        <p className="text-sm text-slate-300">
          Zkopírujte, co vám řekli nebo napsali. AI prověří, jestli odpovídá známým vzorcům podvodů — do 10 sekund.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white px-4 py-2.5 rounded-xl font-bold text-sm transition-all"
        >
          Prověřit zprávu zdarma →
        </Link>
      </div>

      <h2>Jak poznat vishing: pět jasných varovných signálů</h2>
      <ol>
        <li>
          <strong>Banka vám zavolala jako první.</strong>
          Skutečné banky zpravidla nerozesílají aktivní bezpečnostní hovory. Pokud máte pochybnost,
          zavěste a sami zavolejte na číslo z webové stránky nebo z karty.
        </li>
        <li>
          <strong>Požadují přihlašovací údaje, heslo nebo SMS kód.</strong>
          Banka nikdy při telefonátu nepotřebuje váš PIN, heslo do internetového bankovnictví
          ani autorizační kód z SMS. Tyto kódy slouží výhradně k autorizaci vašich vlastních operací.
        </li>
        <li>
          <strong>Navrhují převod na &bdquo;bezpečný účet&ldquo;.</strong>
          Žádná banka na světě nemá &bdquo;záchranný&ldquo; nebo &bdquo;bezpečný&ldquo; účet, na který by vás
          žádala o přesun peněz. Tato fráze je spolehlivým varovným signálem.
        </li>
        <li>
          <strong>Extrémní časový tlak.</strong>
          Útočník nutí jednat okamžitě, bez přestávky na ověření nebo konzultaci. Skutečná banka vždy
          umožní čas na ověření — útoky v reálném čase jsou raritní a banka vás na ně upozorní jinak.
        </li>
        <li>
          <strong>Žádají, abyste nesdíleli hovor s nikým dalším.</strong>
          &bdquo;Neříkejte to nikomu, mohlo by to průběh šetření ohrozit.&ldquo; Tato instrukce má zabránit tomu,
          aby vás někdo blízký upozornil na podvod.
        </li>
      </ol>

      <h2>Zlatá pravidla při jakémkoli telefonátu od &bdquo;banky&ldquo;</h2>
      <ul>
        <li>
          <strong>Zavěste a zavolejte zpět sami.</strong>
          Použijte číslo z webu banky nebo ze zadní strany platební karty — ne číslo, které vám řekl volající.
          Pokud šlo o skutečný problém, banka vám vše vysvětlí znovu.
        </li>
        <li>
          <strong>Nikdy nepřevádějte peníze na pokyn z telefonu.</strong>
          Pokud vás kdokoli po telefonu přesvědčuje k bankovnímu převodu, přestaňte komunikovat a ověřte situaci jinak.
        </li>
        <li>
          <strong>Nikomu nesdělujte kód z autorizační SMS.</strong>
          Tento kód slouží jako váš podpis pod konkrétní transakcí. Pokud ho sdělíte,
          schválíte tím operaci, o které možná nevíte.
        </li>
        <li>
          <strong>Zapněte si bankovní notifikace.</strong>
          Každá transakce se vám ihned zobrazí jako push notifikace nebo SMS. Pokud žádná skutečná transakce
          neprobíhá, &bdquo;akutní zásah&ldquo; z telefonu nemá opodstatnění.
        </li>
      </ul>

      <h2>Co dělat, když jsi peníze nebo přihlašovací údaje přesto poskytl(a)</h2>
      <ol>
        <li>
          <strong>Okamžitě kontaktuj banku</strong> na čísle z karty nebo webu a nahlásit, co se stalo.
          Banka může blokovat odchozí převody nebo zastavit probíhající transakci.
        </li>
        <li>
          <strong>Změň přihlašovací údaje</strong> do internetového bankovnictví — heslo i PIN.
        </li>
        <li>
          <strong>Zablokuj kartu</strong>, pokud jsi poskytl(a) její číslo nebo CVC.
        </li>
        <li>
          <strong>Podej trestní oznámení na Policii ČR</strong> (158 nebo <a href="https://www.policie.cz" target="_blank" rel="noopener noreferrer">policie.cz</a>).
          Uveď číslo, ze kterého volali, a čas hovoru — operátor může pomoct zpětně dohledat volající.
        </li>
        <li>
          <strong>Določ nárok na vrácení peněz bance.</strong>
          Zákon č. 370/2017 Sb. stanovuje podmínky pro vrácení neautorizovaných plateb. Banka musí
          toto posoudit a má na rozhodnutí stanovenou lhůtu.
        </li>
      </ol>

      {/* End CTA */}
      <div className="not-prose mt-10 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-5 space-y-3">
        <p className="font-bold text-white">Stalo se vám to? Nahlasite to a pomožte ostatním.</p>
        <p className="text-sm text-slate-300">
          Nahlášení telefonního čísla nebo čísla účtu do databáze varuje další lidi,
          kteří by mohli dostat stejný hovor.
        </p>
        <Link
          href="/databaze/nahlasit"
          className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white px-4 py-2.5 rounded-xl font-bold text-sm transition-all"
        >
          Nahlásit incident →
        </Link>
      </div>
    </ArticleLayout>
  );
}
