import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getArticleBySlug } from "../_data/articles";
import ArticleLayout from "../_components/ArticleLayout";

const SLUG = "smishing-7-typu-sms-podvodu";

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
        Smishing (SMS phishing) je v Česku každodenní realita. Operátoři reportují řádově desítky tisíc
        podvodných SMS denně. Tady je <strong>7 typů</strong>, které právě teď kolují, s reálnými ukázkami a obranou.
      </p>

      <h2>1. Falešná Česká pošta</h2>
      <p>
        Nejčastější. Tvrdí, že nelze doručit balík kvůli &bdquo;poplatku&ldquo;. Detaily v samostatném článku:
        <a href="/blog/falesna-ceska-posta">Falešná Česká pošta</a>.
      </p>
      <blockquote>
        Ceska posta: Vas balik nelze dorucit kvuli chybejicimu poplatku 29 Kc. Zaplatte zde:
        ceska-posta-doruceni.com/platba
      </blockquote>

      <h2>2. Bankovní phishing</h2>
      <p>
        Vystrašení &bdquo;podezřelou transakcí&ldquo; nebo &bdquo;zablokovaným účtem&ldquo;. Konkrétně pro ČSOB, KB, Air Bank atd.
        viz <a href="/blog/bankovni-phishing-cesko">Bankovní phishing v Česku</a>.
      </p>
      <blockquote>
        Vážený kliente, Vaše karta byla zablokována z důvodu podezřelé aktivity.
        Pro odblokování klikněte: csob-overeni.cz/login
      </blockquote>

      <h2>3. Nedoplatek na zdravotním pojištění / dani</h2>
      <p>
        Útočníci se vydávají za <strong>VZP, OSSZ nebo Finanční úřad</strong>. Cílí na strach z exekuce.
      </p>
      <blockquote>
        Financni urad CR: Evidujeme u Vas nedoplatek na dani z prijmu ve vysi 4 250 Kc.
        Pokud nezaplatite do 48 hodin, bude zahajeno exekucni rizeni. Platba zde:
        financni-urad-platby.cz
      </blockquote>
      <p>
        <strong>Realita:</strong> FÚ ani VZP nikdy nepošlou SMS s odkazem na platbu. Komunikují datovou schránkou,
        doporučeným dopisem nebo přes oficiální portál (<code>mojedane.cz</code>, <code>vzp.cz</code>).
      </p>

      <h2>4. &bdquo;Mami, rozbil se mi telefon&ldquo;</h2>
      <p>
        Velmi účinný útok cílený na rodiče. Útočník se vydává za vaše dítě z neznámého čísla, tvrdí, že má rozbitý telefon a žádá rychlou platbu nebo přihlašovací údaje k účtu.
      </p>
      <blockquote>
        Ahoj mami, rozbil se mi telefon, tohle je nove cislo. Ulozim si ho prosim?
        Potrebuju pomoct s urgentni platbou, muzes prosim?
      </blockquote>
      <p>
        <strong>Obrana:</strong> vždy zavolej dítěti na jeho původní číslo (i když ti říkají, že tam nejde). Nebo dohodněte rodinné &bdquo;heslo&ldquo;,
        které musí použít, když se ozve z neznámého čísla.
      </p>

      <h2>5. Falešná soutěž / výhra</h2>
      <p>
        &bdquo;Vyhrál(a) jste iPhone, vyzvedněte si ho zde&ldquo;. Forma je téměř vždy výhra elektroniky nebo dárkové karty od značek (Lidl, Albert, Tesco).
      </p>
      <blockquote>
        GRATULUJEME! Byl/a jste vybran/a jako vyherce iPhone 16 Pro v nasi soutezi.
        Pro vyzvednuti vyplnte udaje zde: vyhry-cz.com/iphone
      </blockquote>
      <p>
        <strong>Realita:</strong> Pokud jsi do soutěže nepřihlásil(a), žádná výhra neexistuje. Útočníci sebrali jména a čísla z úniků dat
        a posílají hromadně.
      </p>

      <h2>6. Falešný kurýr (DPL, Zásilkovna, GLS)</h2>
      <p>
        Stejná logika jako Česká pošta, ale jméno přepravce střídá. Aktuálně velmi populární u Zásilkovny a DPL.
      </p>
      <blockquote>
        Zasilkovna: Vas balik byl odeslan na vyzvednutim. Pro doruceni domu zaplatte 35 Kc:
        zasilkovna-doruceni.com
      </blockquote>
      <p>
        <strong>Skutečné domény:</strong> <code>zasilkovna.cz</code>, <code>dpd.cz</code>, <code>gls-czech.com</code>. Sledování balíků se nikdy neplatí přes SMS odkaz.
      </p>

      <h2>7. Falešný operátor (T-Mobile, O2, Vodafone)</h2>
      <p>
        Tvrzení o &bdquo;nedoplaceném vyúčtování&ldquo; nebo &bdquo;ztraceném tarifu&ldquo;.
      </p>
      <blockquote>
        T-Mobile: Vase faktura nebyla uhrazena, sluzba bude prerusena. Zaplatte do 24h:
        tmobile-platby.cz
      </blockquote>
      <p>
        <strong>Skutečné domény:</strong> <code>t-mobile.cz</code>, <code>o2.cz</code>, <code>vodafone.cz</code>. Vyúčtování ti operátor pošle e-mailem nebo přes svou aplikaci, nikdy odkazem k zaplacení v SMS.
      </p>

      <h2>Univerzální slovní zásoba útočníků</h2>
      <p>Většina podvodných SMS používá kombinaci tří prvků. Pokud zprávu obsahuje, je s 90% pravděpodobností phishing:</p>
      <ul>
        <li><strong>Slovní tlak:</strong> &bdquo;okamžitě&ldquo;, &bdquo;do 24 hodin&ldquo;, &bdquo;pokud nezaplatíte, bude...&ldquo;, &bdquo;poslední upozornění&ldquo;.</li>
        <li><strong>Drobná částka:</strong> 29, 35, 45, 49 Kč. Účelně malá, abys zbytečně nepřemýšlel(a).</li>
        <li><strong>Bez diakritiky:</strong> SMS přes zahraniční brány nemají háčky.</li>
      </ul>

      <h2>Pět pravidel obrany</h2>
      <ol>
        <li><strong>Klikni jen na to, co jsi sám(a) inicioval(a).</strong> Pokud čekáš balík, jdi na ofiicální web nebo do aplikace, ne přes SMS odkaz.</li>
        <li><strong>Když pochybuješ, ověř to.</strong> Vlož SMS sem na NeKlikni.cz, nebo zavolej na oficiální linku organizace (z jejich webu, ne z SMS).</li>
        <li><strong>Žádný úřad ani banka neposílá platební link.</strong> FÚ, VZP, ČSSZ, banky — komunikují přes datovou schránku, dopisem nebo oficiální portál.</li>
        <li><strong>Rodinné heslo</strong> proti útokům typu &bdquo;mami, rozbil se mi telefon&ldquo;. Krátké slovo, které dítě řekne, když se ozve z cizího čísla.</li>
        <li><strong>Sdílej toto varování.</strong> Útočníci cílí na lidi, kteří nikdy neslyšeli, že to existuje. Pošli tento článek rodičům a prarodičům.</li>
      </ol>

      <h2>Kde nahlásit podvodnou SMS</h2>
      <ul>
        <li><a href="https://www.policie.cz" target="_blank" rel="noopener noreferrer">policie.cz</a> — oznámení podvodu nebo zlozinu.</li>
        <li><a href="https://nukib.cz" target="_blank" rel="noopener noreferrer">NÚKIB.cz</a> — Národní úřad pro kybernetickou bezpečnost (i pro firmy).</li>
        <li>Tvůj operátor — <strong>přepošli SMS na číslo 7726</strong> (T-Mobile, O2, Vodafone) jako spam nahlášení.</li>
      </ul>
    </ArticleLayout>
  );
}
