import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getArticleBySlug } from "../_data/articles";
import ArticleLayout from "../_components/ArticleLayout";

const SLUG = "investicni-podvody-fake-reklamy-celebrity";

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
        Na Facebooku nebo Instagramu se objeví reklama s videem, kde uznávaná česká osobnost nadšeně vypráví
        o investiční příležitosti, která jí &bdquo;změnila život&ldquo;. Hlas zní jako dotyčný člověk,
        obličej a pohyby rtů odpovídají. Přesto to nemusí být pravda — jde o deepfake nebo podvrh,
        vytvořený technologiemi umělé inteligence nebo střihem původního videa.
        Investiční podvody s falešnými celebrit patří v roce 2026 k nejpropracovanějším formám onlinového podvodu v ČR.
      </p>

      <h2>Jak takový podvod funguje krok za krokem</h2>
      <ol>
        <li>
          <strong>Reklama na sociálních sítích.</strong>
          Útočník spustí placenou reklamu na Facebooku, Instagramu nebo YouTube.
          V reklamě vystupuje — skutečně nebo v upraveném videu — známá česká tvář: podnikatel, sportovec,
          politik nebo mediální osobnost. Reklama slibuje mimořádné zhodnocení peněz skrze
          kryptoměny, obchodní platformu nebo &bdquo;AI investiční robot&ldquo;.
        </li>
        <li>
          <strong>Přesměrování na podvodnou stránku.</strong>
          Po kliknutí na reklamu se dostanete na web, který vypadá jako zpravodajský portál —
          třeba napodobuje iDnes.cz, Novinky.cz nebo Seznam Zprávy. Článek popisuje, jak celebrita
          &bdquo;odhalila tajemství rychlého zbohatnutí&ldquo;. Text je přesvědčivý, cituje cifry,
          má komentáře pod článkem. Ve skutečnosti je celá stránka vytvořená útočníky.
        </li>
        <li>
          <strong>Registrace na &bdquo;platformě&ldquo;.</strong>
          Stránka vás vyzve k registraci — jméno, e-mail, telefon.
          Krátce poté zavolá &bdquo;investiční poradce&ldquo;, který je profesionální, mluvný a ochotný.
          Prohodí s vámi pár vět, aby si získal vaši důvěru, a nabídne vám vložit počáteční vklad —
          typicky &bdquo;minimální vstup&ldquo; v řádu tisíců korun.
        </li>
        <li>
          <strong>První &bdquo;zisk&ldquo; jako návnada.</strong>
          Na platformě uvidíte svůj &bdquo;účet&ldquo;, který roste. Někdy vám dokonce umožní vybrat
          malou část — stovky nebo pár tisíc korun. To vás přesvědčí, že systém funguje.
        </li>
        <li>
          <strong>Větší vklady a pak zmizení.</strong>
          Poradce vás přesvědčí k dalším vkladům — &bdquo;teď je ideální příležitost, nabídka platí jen
          tento týden&ldquo;. Po vložení většího obnosu přestanou komunikovat, přístup k účtu se zablokuje
          nebo platforma zmizí.
        </li>
      </ol>

      <h2>Jak poznat deepfake video a podvodnou reklamu</h2>
      <ul>
        <li>
          <strong>Celebrita &bdquo;investice&ldquo; nikde jinde nepotvrdila.</strong>
          Prohledejte jméno celebrity + název platformy nebo produktu na Googlu.
          Pokud o tom píše jen ta jedna reklama a žádná seriózní média, může jít o podvod.
          Skutečné celebrity svá angažmá veřejně potvrzují.
        </li>
        <li>
          <strong>Video vypadá jinak než ostatní záznamy celebrity.</strong>
          Deepfake videa mívají drobné vizuální artefakty: nesouvislé pohyby rtů, neobvyklé mrkání,
          rozostřené okraje obličeje nebo nerealistický lesk kůže. Porovnejte video s ověřenými nahrávkami
          dané osoby na YouTube nebo v médiích.
        </li>
        <li>
          <strong>Zpravodajský web není skutečný.</strong>
          Zkontrolujte doménu — pokud je adresa např. <code>idnes-investice.com</code> místo <code>idnes.cz</code>,
          jedná se o kopii. Podvodné weby napodobují vizuální styl médií, ale doména je jiná.
        </li>
        <li>
          <strong>Garantovaný výnos je vždy varovný signál.</strong>
          Skutečné investice nesou riziko. Žádná legální platforma nebo fond nesmí garantovat konkrétní výnos.
          Fráze jako &bdquo;zaručená 30% měsíční výnosnost&ldquo; jsou ze zákona nepřípustné pro legitimní firmy.
        </li>
        <li>
          <strong>Platforma není regulovaná.</strong>
          Prověřte, zda firma má licenci ČNB (Česká národní banka).
          Na webu <a href="https://www.cnb.cz" target="_blank" rel="noopener noreferrer">cnb.cz</a> v sekci
          &bdquo;Seznam regulovaných subjektů&ldquo; lze ověřit, zda platforma smí v ČR legálně nabízet investiční služby.
          Pokud tam není — neinvestujte.
        </li>
        <li>
          <strong>Tlak na rychlé rozhodnutí.</strong>
          &bdquo;Tato příležitost je dostupná jen dnes&ldquo;, &bdquo;zbývá jen 5 míst&ldquo;. Spěch slouží k tomu,
          aby jste neměli čas situaci ověřit nebo poradit se s někým bližším.
        </li>
      </ul>

      {/* Mid-article CTA */}
      <div className="not-prose my-8 rounded-2xl border border-primary/30 bg-primary/5 p-5 space-y-3">
        <p className="font-bold text-foreground">Dostali jste podezřelou nabídku nebo reklamu?</p>
        <p className="text-sm text-muted-foreground">
          Zkopírujte text e-mailu, zprávy nebo odkaz — AI prověří varovné signály investičního podvodu do 10 sekund.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 bg-primary hover:brightness-110 text-primary-foreground px-4 py-2.5 rounded-xl font-bold text-sm transition-all"
        >
          Prověřit zprávu zdarma →
        </Link>
      </div>

      <h2>Co dělat, když jsi již peníze poslal(a)</h2>
      <ol>
        <li>
          <strong>Přestaňte posílat další peníze.</strong>
          Jakmile máte podezření, okamžitě zastavte jakékoli další vklady — i když vás &bdquo;poradce&ldquo;
          přesvědčuje, že právě dalším vkladem peníze odblokuje.
        </li>
        <li>
          <strong>Pokus o chargeback (vrácení platby kartou).</strong>
          Pokud jste platili kartou, okamžitě kontaktujte banku a zahajte chargeback.
          Úspěšnost závisí na době uplynuté od transakce a na tom, zda platba ještě nezapadla do konečného vypořádání.
        </li>
        <li>
          <strong>Podejte trestní oznámení na Policii ČR.</strong>
          Online přes <a href="https://www.policie.cz" target="_blank" rel="noopener noreferrer">policie.cz</a> nebo na lince 158.
          Přiložte název platformy, URL, jméno &bdquo;poradce&ldquo;, e-maily, čísla účtů a screenshoty.
        </li>
        <li>
          <strong>Nahlasite podvod ČNB.</strong>
          Česká národní banka přijímá podněty na neoprávněné poskytování finančních služeb na
          <a href="https://www.cnb.cz" target="_blank" rel="noopener noreferrer"> cnb.cz</a>.
          ČNB vydává varování veřejnosti a může podat trestní oznámení.
        </li>
        <li>
          <strong>Vyhněte se &bdquo;recovery firms&ldquo;.</strong>
          Po nahlášení podvodu bývají oběti cíleny znovu — tentokrát firmami, které tvrdí,
          že vám peníze zpátky &bdquo;dostanou&ldquo; za poplatek předem. Toto je druhá vrstva podvodu.
        </li>
      </ol>

      <h2>Jak ochránit rodinu a sebe do budoucna</h2>
      <ul>
        <li>
          <strong>Prověřte regulaci před každou investicí.</strong>
          Než kamkoli pošlete peníze, zkontrolujte platformu v databázi ČNB. Pokud tam není, neinvestujte.
        </li>
        <li>
          <strong>Sdílejte tento článek s rodiči a prarodiči.</strong>
          Starší generace bývá náchylnější k důvěře autoritám a celebritám — a právě na ni jsou tyto podvody zaměřeny.
        </li>
        <li>
          <strong>Žádný garantovaný výnos neexistuje.</strong>
          Tuto větu si zapamatujte. Je to zákonná i faktická pravda — a každá nabídka, která to popírá, je varovný signál.
        </li>
        <li>
          <strong>Poraďte se s někým bližším.</strong>
          Útočníci vás záměrně nabádají k utajení (&bdquo;nezmiňujte to nikomu, je to exkluzivní příležitost&ldquo;).
          Naopak — vždy se poraďte s důvěryhodnou osobou nebo finančním poradcem s licencí ČNB.
        </li>
      </ul>

      {/* End CTA */}
      <div className="not-prose mt-10 rounded-2xl border border-success/30 bg-success/5 p-5 space-y-3">
        <p className="font-bold text-foreground">Narazili jste na podvodnou platformu? Nahlasite ji.</p>
        <p className="text-sm text-muted-foreground">
          Nahlášení pomáhá varovat ostatní před stejnou platformou nebo číselm účtu —
          a dává podklady pro policejní a regulatorní šetření.
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
