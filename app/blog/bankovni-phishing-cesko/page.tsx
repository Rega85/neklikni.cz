import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getArticleBySlug } from "../_data/articles";
import ArticleLayout from "../_components/ArticleLayout";

const SLUG = "bankovni-phishing-cesko";

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
        Bankovní phishing je v Česku nejdražší typ podvodu — průměrná škoda přesahuje
        <strong> 80&nbsp;000 Kč</strong> (Policie ČR, 2025). Útočníci se vydávají za
        <strong> ČSOB, Komerční banku, Air Bank, Českou spořitelnu, Raiffeisen i mBank </strong>
        a snaží se získat tvé přihlašovací údaje, číslo karty nebo SMS kódy z 3D Secure.
      </p>

      <h2>Tři hlavní kanály útoku</h2>
      <ol>
        <li>
          <strong>E-mail s falešnou žádostí o ověření účtu</strong> — typicky
          &bdquo;Z bezpečnostních důvodů jsme zablokovali váš účet, prosím přihlaste se zde&ldquo;.
        </li>
        <li>
          <strong>SMS o podezřelé transakci</strong> — &bdquo;Detekovali jsme platbu 12 800 Kč v zahraničí.
          Pokud jste to nebyli vy, zrušte zde: ...&ldquo;.
        </li>
        <li>
          <strong>Telefonát od &bdquo;bezpečnostního oddělení banky&ldquo;</strong> (vishing) — útočník zná tvé jméno,
          vystrašuje s &bdquo;právě probíhajícím útokem&ldquo; a navádí k převodu peněz na &bdquo;bezpečný účet&ldquo;.
        </li>
      </ol>

      <h2>Konkrétní ukázky a charakteristické fráze</h2>

      <h3>ČSOB</h3>
      <blockquote>
        Vážený kliente, z důvodu podezřelé aktivity jsme dočasně zablokovali Vaši kartu.
        Pro odblokování klikněte: <code>csob-overeni.cz/login</code>.
        Neodpovídejte na tuto SMS.
      </blockquote>
      <p>
        Skutečné domény ČSOB: <code>csob.cz</code>, <code>csobonline.cz</code>. Vše ostatní
        (<code>csob-overeni.cz</code>, <code>csob-bezpecnost.com</code>, <code>cs-csob.cz</code>) je podvod.
      </p>

      <h3>Komerční banka</h3>
      <blockquote>
        Vaše karta byla použita pro platbu 8 945 Kč v zahraničí. Pokud transakce není vaše, zamítněte ji zde:
        <code>kb-secure.com/storno</code>
      </blockquote>
      <p>
        Skutečné domény KB: <code>kb.cz</code>, <code>mojebanka.cz</code>. Žádné z nich nemá podtržítko.
      </p>

      <h3>Air Bank</h3>
      <blockquote>
        Air Bank: Aktualizujte si bezpečnostní certifikát, jinak Vám bude zablokováno bankovnictví.
        <code>airbank-update.cz</code>
      </blockquote>
      <p>
        Skutečné domény: <code>airbank.cz</code>, <code>ib.airbank.cz</code>. &bdquo;Update&ldquo; certifikátu se nikdy nedělá přes SMS odkaz.
      </p>

      <h2>Jaký je vzorec phishingu</h2>
      <p>Bez ohledu na konkrétní banku jde vždy o stejný psychologický trik:</p>
      <ol>
        <li><strong>Vyvolat strach</strong> — &bdquo;Váš účet je zablokovaný / proběhla podezřelá transakce&ldquo;.</li>
        <li><strong>Vytvořit časový tlak</strong> — &bdquo;Pokud nejednáte do 24 hodin, peníze budou převedeny&ldquo;.</li>
        <li><strong>Ukázat &bdquo;jednoduché řešení&ldquo;</strong> — odkaz, který jen vypadá důvěryhodně.</li>
        <li><strong>Sebrat přihlašovací údaje + 3D Secure SMS</strong> — útočník v pozadí spustí převod a tobě pošle SMS, abys ji &bdquo;potvrdil pro ochranu&ldquo;.</li>
      </ol>

      <h2>Sedm bodů kontroly za 5 sekund</h2>
      <ol>
        <li><strong>Doména se shoduje s oficiální?</strong> (ČSOB = <code>csob.cz</code>, KB = <code>kb.cz</code>, Air Bank = <code>airbank.cz</code>, Česká spořitelna = <code>csas.cz</code>)</li>
        <li><strong>Je v doméně pomlčka, podtržítko nebo nezvyklá koncovka?</strong> Pokud ano, je to podvod (<code>csob-secure.com</code>).</li>
        <li><strong>Oslovuje tě obecně</strong> (&bdquo;Vážený kliente&ldquo;) místo jménem? Skutečná banka tě obvykle osloví jménem.</li>
        <li><strong>Tlačí na čas?</strong> Útočníci ano, banky ne.</li>
        <li><strong>Žádá tě o přihlašovací údaje, kód z karty nebo SMS kód?</strong> Banka tě o to nikdy neptá — tyto informace ti slouží jen k autorizaci, neposíláš je nikomu.</li>
        <li><strong>SMS přišla z běžného čísla?</strong> Skutečné banky posílají SMS ze zkrácených jmen (&bdquo;CSOB&ldquo;, &bdquo;KB&ldquo;, &bdquo;AIRBANK&ldquo;).</li>
        <li><strong>Je tam diakritika a správná čeština?</strong> Útočníci často chybují — &bdquo;ucet&ldquo;, &bdquo;zaplatte&ldquo;, &bdquo;Vas&ldquo;.</li>
      </ol>

      <h2>Co dělat, když jsi přihlašovací údaje zadal(a)</h2>
      <ol>
        <li><strong>Okamžitě se přihlas do bankovnictví ze zařízení, které jsi nepoužil pro klik na odkaz</strong> (jiný telefon / počítač) a změň heslo.</li>
        <li><strong>Zablokuj kartu</strong> v aplikaci nebo na infolince banky.</li>
        <li><strong>Sleduj transakce</strong> — pokud něco proběhlo, ihned to nahlas bance jako neautorizovanou transakci.</li>
        <li><strong>Banka má 30 dní</strong> na rozhodnutí o vrácení podle zákona č. 370/2017 Sb. Doloží ti, že jsi nejednal(a) hrubě nedbale.</li>
        <li><strong>Nahlaš na Policii ČR</strong> přes <a href="https://www.policie.cz" target="_blank" rel="noopener noreferrer">policie.cz</a> nebo 158.</li>
      </ol>

      <h2>Pozor na vishing — telefonický podvod</h2>
      <p>
        Telefonát od &bdquo;bezpečnostního oddělení banky&ldquo; je nejnebezpečnější forma, protože je interaktivní —
        útočník reaguje na tvé pochybnosti. Zlatá pravidla:
      </p>
      <ul>
        <li><strong>Banka tě nikdy nezavolá s žádostí o převod peněz na &bdquo;bezpečný účet&ldquo;.</strong></li>
        <li><strong>Banka po telefonu nikdy nežádá kód z autorizační SMS</strong> ani heslo do bankovnictví.</li>
        <li>Když máš pochybnost, <strong>zavěs a sám zavolej na číslo z webu banky</strong> (ne na číslo, které ti dal volající).</li>
      </ul>

      <h2>Praktická obrana</h2>
      <ul>
        <li>Zapni si <strong>notifikace o transakcích</strong> v aplikaci banky — uvidíš každou platbu okamžitě.</li>
        <li>Nastav si <strong>nízký limit pro internetové platby</strong>, který jednoduše navýšíš v aplikaci, když to potřebuješ.</li>
        <li>Pro online nákupy <strong>používej virtuální kartu</strong> (Revolut, Air Bank, ČSOB) — když ji ukradnou, nepřijdeš o hlavní účet.</li>
        <li>Pokud máš pochybnost, <strong>pošli zprávu k ověření</strong> — vlož text na NeKlikni.cz a do 3 sekund víš.</li>
      </ul>
    </ArticleLayout>
  );
}
