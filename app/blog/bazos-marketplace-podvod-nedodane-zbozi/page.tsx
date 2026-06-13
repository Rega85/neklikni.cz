import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getArticleBySlug } from "../_data/articles";
import ArticleLayout from "../_components/ArticleLayout";

const SLUG = "bazos-marketplace-podvod-nedodane-zbozi";

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
        Prodej a nákup přes <strong>Bazoš</strong> a <strong>Facebook Marketplace</strong> jsou v Česku velmi oblíbené.
        Jenže právě jejich popularita přitahuje podvodníky, kteří zneužívají touhu lidí po levné koupi nebo rychlém prodeji.
        Nejčastějším schématem je situace, kdy za zboží zaplatíte předem bankovním převodem — a prodejce zmizí i se zbožím.
        Nebo naopak: falešný kupující pošle padělaný platební screenshot a žádá, abyste zboží odeslali.
      </p>

      <h2>Jak podvod na Bazoši funguje: prodejce bere peníze, zboží nedorazí</h2>
      <p>
        Nejrozšířenější varianta vypadá takto: inzerát nabízí atraktivní produkt za výrazně nižší cenu, než je obvyklé.
        Prodejce odpovídá rychle a ochotně. Jakmile projevíte zájem, vysvětlí, že zboží nemůže předat osobně —
        &bdquo;jsem z jiného města&ldquo;, &bdquo;mám pracovní vytížení&ldquo; nebo &bdquo;mám ho u rodiče&ldquo;.
        Navrhne zaslání přes kurýra a žádá platbu předem na účet.
      </p>
      <p>
        Po odeslání peněz komunikace ustane. Prodejce přestane odpovídat, profil zmizí nebo se ukáže, že byl nově zaregistrovaný
        a neměl žádnou historii hodnocení.
      </p>

      <h3>Varianta z pohledu prodejce: falešný kupující a podvržená platba</h3>
      <p>
        Pokud prodáváte vy, může být kupující ten, kdo schéma spouští. Kontaktuje vás s nabídkou okamžitého nákupu,
        chce zboží odeslat přes kurýra a nabídne, že zaplatí přes &bdquo;zabezpečenou platbu Bazoše&ldquo; nebo
        &bdquo;ověřenou platbu Marketplace&ldquo;.
        Pak vám pošle e-mail nebo screenshot, který vypadá jako potvrzení platby — ale peníze na účet nedorazily.
        Zboží si vyžádá k odeslání dřív, než transakci ověříte v bance.
      </p>
      <p>
        Ani Bazoš ani Facebook nemají žádnou &bdquo;zabezpečenou platbu&ldquo; — pokud vám někdo něco takového nabídne,
        může jít o podvod.
      </p>

      <h2>Varovné signály, na které si dát pozor</h2>
      <ul>
        <li>
          <strong>Cena je výrazně pod tržní hodnotou.</strong> Útočníci lákají na slevu 30–50 %, která nevypadá reálně.
          Pokud nabídka vypadá příliš dobře, bývá to tak.
        </li>
        <li>
          <strong>Prodejce odmítá osobní předání.</strong> Vždy má důvod, proč se nemůže setkat.
          Poctivý prodejce osobní předání nezamítá.
        </li>
        <li>
          <strong>Tlak na předem platbu převodem.</strong> Podvodníci odmítají dobírku nebo zálohu přes Českou poštu
          s výdejním lístkem — obě metody chrání kupujícího.
        </li>
        <li>
          <strong>Nový nebo prázdný profil.</strong> Vytvořený v posledních dnech, žádné hodnocení, žádná fotka.
        </li>
        <li>
          <strong>Komunikace mimo platformu.</strong> Žádost přejít na WhatsApp nebo e-mail, kde není záznam v systému platformy.
        </li>
        <li>
          <strong>Špatná čeština, obecné fráze.</strong> &bdquo;Jsem z jiného regionu, pošlu kurýrem, zaplaťte prosím předem.&ldquo;
        </li>
        <li>
          <strong>Falešné potvrzení platby.</strong> Screenshot z bankovní aplikace, který vypadá autenticky, ale peníze na účtu nejsou.
        </li>
      </ul>

      {/* Mid-article CTA — check message */}
      <div className="not-prose my-8 rounded-2xl border border-primary/30 bg-primary/5 p-5 space-y-3">
        <p className="font-bold text-foreground">Píše ti prodejce nebo kupující něco podezřelého?</p>
        <p className="text-sm text-muted-foreground">
          Zkopíruj zprávu nebo screenshot — AI odpoví do 10 sekund, jestli jde o podezřelý vzorec.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 bg-primary hover:brightness-110 text-primary-foreground px-4 py-2.5 rounded-xl font-bold text-sm transition-all"
        >
          Prověřit zprávu zdarma →
        </Link>
      </div>

      {/* Mid-article CTA — verify seller */}
      <div className="not-prose my-8 rounded-2xl border border-primary/30 bg-primary/5 p-5 space-y-3">
        <p className="font-bold text-foreground">Neznáš prodejce? Ověř jeho telefon nebo číslo účtu.</p>
        <p className="text-sm text-muted-foreground">
          V databázi nahlášených incidentů zjistíš, jestli dané číslo nebo účet figuroval v předchozích hlášeních.
        </p>
        <Link
          href="/databaze/hledat"
          className="inline-flex items-center gap-2 bg-primary hover:brightness-110 text-primary-foreground px-4 py-2.5 rounded-xl font-bold text-sm transition-all"
        >
          Ověřit v databázi →
        </Link>
      </div>

      <h2>Co dělat, když jsi na podvod naletěl(a)</h2>
      <ol>
        <li>
          <strong>Okamžitě kontaktuj svoji banku</strong> a žádej o zastavení nebo vrácení transakce (recall platby).
          Čím dřív to uděláš, tím vyšší šance na úspěch — převody na česká čísla účtů lze někdy zastavit do několika hodin.
        </li>
        <li>
          <strong>Nahlaš inzerát</strong> na Bazoši nebo Facebooku pomocí tlačítka &bdquo;Nahlásit&ldquo;.
          Platforma profil prošetří a případně zablokuje.
        </li>
        <li>
          <strong>Podej trestní oznámení na Policii ČR</strong> (158 nebo <a href="https://www.policie.cz" target="_blank" rel="noopener noreferrer">policie.cz</a>).
          Uveď číslo účtu příjemce, čas platby a veškerou komunikaci — tato data jsou klíčová pro vyšetřování.
        </li>
        <li>
          <strong>Schovej si veškerou komunikaci.</strong> Screenshoty chatů, číslo inzerátu, e-mailovou adresu, telefonní číslo,
          číslo bankovního účtu příjemce. Vše může pomoci policii nebo bance.
        </li>
        <li>
          <strong>Nahlaš číslo účtu.</strong> Česká národní banka provozuje evidenci podezřelých účtů
          a informace od poškozených pomáhají chránit ostatní.
        </li>
      </ol>

      <h2>Jak se chránit při nákupu a prodeji online</h2>

      <h3>Při nákupu</h3>
      <ul>
        <li>
          <strong>Platby přes dobírku nebo zálohu s výdejním lístkem.</strong>
          Dobírka je nejjistější — platíte až při přebírání. Zásilkovna nabízí službu, kdy kurýr vybere platbu a potvrdí předání.
        </li>
        <li>
          <strong>Osobní předání na veřejném místě.</strong> Přineste sebou kamarádku nebo kamaráda, navrhněte libovolné veřejné místo.
          Poctivý prodejce neodmítá.
        </li>
        <li>
          <strong>Než zaplatíte, ověřte profil.</strong> Jak dlouho je účet registrovaný? Má hodnocení? Je číslo účtu v databázi?
        </li>
        <li>
          <strong>Cena přiměřená trhu.</strong> Zkontrolujte, za kolik se daný výrobek prodává jinde.
          Dramatická sleva bez důvodu je varovný signál.
        </li>
      </ul>

      <h3>Při prodeji</h3>
      <ul>
        <li>
          <strong>Peníze dřív, pak zboží.</strong> Nikdy neodesílejte zboží dřív, než vidíte peníze na výpisu z bankovního účtu —
          ne na screenshot, který vám kupující pošle.
        </li>
        <li>
          <strong>Ignorujte &bdquo;zabezpečené platby&ldquo; třetích stran.</strong> Bazoš ani Facebook podobnou službu nemají.
          Jde o phishingové podvody.
        </li>
        <li>
          <strong>Pozor na zahraniční čísla nebo e-maily.</strong>
          Kupující komunikující ze zahraniční SIM nebo přes VPN bývají v anonymitě záměrně.
        </li>
      </ul>

      {/* End CTA — report */}
      <div className="not-prose mt-10 rounded-2xl border border-success/30 bg-success/5 p-5 space-y-3">
        <p className="font-bold text-foreground">Podvedl tě někdo? Nahlas ho a ochraň ostatní.</p>
        <p className="text-sm text-muted-foreground">
          Každé nahlášení čísla účtu, telefonu nebo profilu pomáhá dalším lidem rozpoznat podezřelou protistranu dřív,
          než pošlou peníze.
        </p>
        <Link
          href="/databaze/nahlasit"
          className="inline-flex items-center gap-2 bg-success hover:brightness-110 text-success-foreground px-4 py-2.5 rounded-xl font-bold text-sm transition-all"
        >
          Nahlásit incident →
        </Link>
      </div>
    </ArticleLayout>
  );
}
