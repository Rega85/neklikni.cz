import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getArticleBySlug } from "../_data/articles";
import ArticleLayout from "../_components/ArticleLayout";

const SLUG = "falesna-ceska-posta";

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
        Falešné SMS, které se vydávají za <strong>Českou poštu</strong>, jsou v roce 2026 stále nejčastějším českým podvodem.
        Zpráva tvrdí, že vám nelze doručit balík kvůli &bdquo;chybějícímu poplatku&ldquo; ve výši pár desítek korun, a směřuje
        vás na podvodný platební formulář, který sebere přístupy ke kartě.
      </p>

      <h2>Jak vypadá typická zpráva</h2>
      <p>Tady je několik reálných ukázek, které kolovaly v Česku v posledních měsících:</p>
      <blockquote>
        Ceska posta: Vas balik nelze dorucit kvuli chybejicimu poplatku 29 Kc. Zaplatte zde pro doruceni:
        https://ceska-posta-doruceni.com/platba
      </blockquote>
      <blockquote>
        Vážený zákazníku, váš balík CZ73826 byl pozastaven. Pro doručení uhraďte 49 Kč:
        ceska-posta-online.cz/platba
      </blockquote>
      <blockquote>
        Česká pošta: Váš balík čeká na celní poplatek 35 Kč. Platba zde do 24 hodin:
        ceskaposta-cz.com
      </blockquote>

      <h2>Šest znaků, podle kterých to poznáš</h2>
      <ol>
        <li>
          <strong>Doména není česká pošta.</strong> Skutečné weby Pošty: <code>ceskaposta.cz</code> a <code>balikuj.cz</code>.
          Vše jiné — <code>ceska-posta-doruceni.com</code>, <code>ceskaposta-cz.com</code>, <code>cz-posta-online.cz</code> — je podvod.
        </li>
        <li>
          <strong>Bez diakritiky a se špatnou typografií.</strong> Útočníci posílají SMS přes zahraniční brány, takže háčky a čárky často chybí
          (&bdquo;Vas balik&ldquo; místo &bdquo;Váš balík&ldquo;).
        </li>
        <li>
          <strong>Drobná částka pod 50 Kč.</strong> Cílem je, abys nezaváhal — &bdquo;hodím tam stovku, ať to mám z krku&ldquo;.
          Skutečná cena: stovky až tisíce po krádeži celé karty.
        </li>
        <li>
          <strong>Tlak na čas.</strong> &bdquo;Do 24 hodin&ldquo;, &bdquo;jinak balík vrátíme zpět&ldquo;.
          Skutečná Pošta nikdy neposílá SMS s placením přes odkaz pod časovým tlakem.
        </li>
        <li>
          <strong>Číslo balíku, které neznáš.</strong> Pokud jsi nic neobjednal nebo ti nikdo nic neoznámil, žádný balík neexistuje.
        </li>
        <li>
          <strong>Odesílatel je číslo, ne &bdquo;Posta&ldquo;.</strong> Skutečné notifikace Pošty chodí ze zkráceného jména &bdquo;CESKA POSTA&ldquo; nebo &bdquo;BALIKUJ&ldquo;.
          Pokud zpráva přišla z běžného mobilního čísla (+420 7XX...), je to podvrh.
        </li>
      </ol>

      <h2>Co se stane, když klikneš</h2>
      <p>
        Odkaz tě hodí na stránku, která vypadá jako platební brána. Skutečně tam zadáš číslo karty, datum platnosti a CVC.
        Útočníci pak okamžitě:
      </p>
      <ul>
        <li>vyzkoušejí kartu na zahraničních e-shopech (typicky $1 transakce na test),</li>
        <li>pokud projde, během minut nakoupí dárkové vouchery, kryptoměny nebo elektroniku,</li>
        <li>v některých případech zadají i 3D Secure SMS, kterou ti pošlou jako falešný &bdquo;dvoufaktor potvrzení Pošty&ldquo;.</li>
      </ul>
      <p>
        Průměrná škoda v ČR za rok 2025 podle policie: <strong>15 000 – 80 000 Kč</strong> v závislosti na limitu karty.
      </p>

      <h2>Co dělat, když jsi už klikl(a)</h2>
      <ol>
        <li><strong>Okamžitě zablokuj kartu</strong> v aplikaci banky nebo telefonicky na lince banky (na zadní straně karty).</li>
        <li><strong>Změň přístupové údaje</strong> do internetového bankovnictví, pokud jsi je zadal(a) na podvodné stránce.</li>
        <li><strong>Nahlaš to bance</strong> jako podvod — máš nárok na vrácení peněz, pokud útočníci stihli vybrat. Banka má 30 dní na rozhodnutí (zákon č. 370/2017 Sb.).</li>
        <li><strong>Nahlaš na Policii ČR</strong> — buď online přes portál <a href="https://www.policie.cz">policie.cz</a> nebo na 158.</li>
        <li>
          <strong>Nahlaš podvodnou doménu.</strong> Česká pošta provozuje formulář pro hlášení falešných stránek na
          <a href="https://www.ceskaposta.cz/podvodne-zpravy" target="_blank" rel="noopener noreferrer">ceskaposta.cz/podvodne-zpravy</a>.
        </li>
      </ol>

      <h2>Jak se chránit do budoucna</h2>
      <ul>
        <li>
          <strong>Sleduj balíky v oficiální aplikaci Pošty</strong> nebo na <code>balikuj.cz</code>.
          Pokud ti přijde SMS, kterou neumíš ověřit jiným kanálem, ber ji jako podvodnou.
        </li>
        <li>
          <strong>Nikdy neplať poplatky přes odkaz z SMS.</strong> Skutečná Pošta vybírá poplatky na pobočce nebo přímo u kurýra.
        </li>
        <li>
          <strong>Pokud nevíš, ověř to.</strong> Vlož text SMS sem na NeKlikni.cz — AI ti řekne s jakou pravděpodobností je to podvod.
        </li>
      </ul>

      <p>
        A pokud ti přijde podezřelá zpráva, kterou si nejsi jistý(á), <strong>pošli ji rodičům, prarodičům nebo dětem</strong> jako varování.
        Útočníci cílí na nejzranitelnější — tedy lidi, kteří podle jména &bdquo;Pošta&ldquo; klikají automaticky.
      </p>
    </ArticleLayout>
  );
}
