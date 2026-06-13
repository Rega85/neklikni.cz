import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getArticleBySlug } from "../_data/articles";
import ArticleLayout from "../_components/ArticleLayout";

const SLUG = "falesny-kuryir-dpd-zasilkovna-sms";

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
        Dostali jste SMS nebo e-mail od <strong>DPD</strong>, <strong>Zásilkovny</strong> nebo jiného kurýra s tím,
        že váš balík čeká na zaplacení poplatku nebo doručení nelze dokončit? Může jít o podvod.
        Schéma funguje jednoduše: útočník se vydává za kurýrní společnost, pošle falešnou notifikaci
        a odkaz, který vede na stránku kradoucí údaje karty.
      </p>

      <h2>Jak schéma funguje krok za krokem</h2>
      <ol>
        <li>
          <strong>Dostanete SMS nebo e-mail</strong>, který vypadá jako notifikace od DPD, Zásilkovny, PPL nebo jiné kurýrní firmy.
          Zpráva tvrdí, že vaše zásilka nemůže být doručena — chybí doplatek cla, adresné, poplatek za skladování nebo podobný poplatek.
        </li>
        <li>
          <strong>Odkaz vede na podvodnou stránku</strong>, která napodobuje web kurýrní firmy.
          Stránka vypadá věrohodně: logo, barvy, formulář. Ve skutečnosti patří útočníkům.
        </li>
        <li>
          <strong>Stránka vás vyzve k zadání platebních údajů</strong> — číslo karty, datum platnosti, CVC kód.
          Příliš malá částka (29–99 Kč) sníží váš odpor k platbě.
        </li>
        <li>
          <strong>Útočníci okamžitě zneužijí kradené údaje</strong> ke skutečným nákupům — obvykle malý testovací nákup,
          pak rychle větší transakce dřív, než si toho všimnete.
        </li>
      </ol>

      <h2>Reálné ukázky podvodných zpráv</h2>
      <blockquote>
        DPD: Vase zasilka 4827361 nebyla dorucena. Uhradte clo 49 Kc pro doruceni:
        dpd-doruceni.com/platba
      </blockquote>
      <blockquote>
        Zásilkovna: Váš balík čeká. Kvůli chybějícímu poplatku za doručení jej nemůžeme vydat.
        Zaplaťte 35 Kč zde: zasilkovna-online.cz/overit
      </blockquote>
      <blockquote>
        PPL: Váš balíček CZ9837261 je zadržen na celnici. Pro propuštění zaplaťte 75 Kč:
        ppl-platba.com
      </blockquote>
      <p>
        Všechny tři zprávy mají stejnou strukturu: identifikátor zásilky, malá částka, odkaz na podvodnou doménu.
      </p>

      {/* Mid-article CTA */}
      <div className="not-prose my-8 rounded-2xl border border-primary/30 bg-primary/5 p-5 space-y-3">
        <p className="font-bold text-foreground">Přišla ti podobná SMS nebo e-mail?</p>
        <p className="text-sm text-muted-foreground">
          Vlož text zprávy — AI odpoví do 10 sekund, jestli jde o podezřelý vzorec.
          Zdarma a bez registrace.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 bg-primary hover:brightness-110 text-primary-foreground px-4 py-2.5 rounded-xl font-bold text-sm transition-all"
        >
          Prověřit zprávu zdarma →
        </Link>
      </div>

      <h2>Jak poznat podvod: sedm konkrétních znaků</h2>
      <ol>
        <li>
          <strong>Doména není oficiální.</strong>
          DPD používá výhradně <code>dpd.com</code> a <code>mydpd.cz</code>.
          Zásilkovna: <code>zasilkovna.cz</code>.
          PPL: <code>ppl.cz</code>.
          Vše ostatní — <code>dpd-doruceni.com</code>, <code>zasilkovna-online.cz</code> — je podezřelé.
        </li>
        <li>
          <strong>SMS přišla z běžného mobilního čísla.</strong>
          Skutečné kurýrní firmy posílají notifikace ze zkrácených alfanumerických odesílatelů
          (&bdquo;DPD&ldquo;, &bdquo;ZASILKOVNA&ldquo;), ne z čísla +420 7XX.
        </li>
        <li>
          <strong>Bez diakritiky nebo s pravopisnými chybami.</strong>
          &bdquo;Vase zasilka&ldquo; místo &bdquo;Vaše zásilka&ldquo;, &bdquo;uhradte&ldquo; místo &bdquo;uhraďte&ldquo;.
        </li>
        <li>
          <strong>Nic jste neobjednali.</strong>
          Pokud vám žádný skutečný odesílatel neoznámil zásilku, číslo balíku ve zprávě neexistuje.
        </li>
        <li>
          <strong>Tlak na rychlé zaplacení.</strong>
          &bdquo;Do 48 hodin jinak zásilku vrátíme&ldquo;. Kurýrní firmy nemají takto krátké lhůty pro úhradu poplatků.
        </li>
        <li>
          <strong>Platba přes odkaz v SMS.</strong>
          Skutečné celní poplatky a doplatky hradíte buď přímo kurýrovi při doručení,
          nebo v aplikaci/webu konkrétní firmy po přímém vyhledání zásilky číslem.
        </li>
        <li>
          <strong>Podvodná stránka žádá CVC kód.</strong>
          Legitimní platební brány sice CVC žádají, ale v kombinaci s podvodnou doménou je to signál.
        </li>
      </ol>

      <h2>Co dělat, když jsi zadal(a) platební údaje</h2>
      <ol>
        <li>
          <strong>Zablokuj kartu okamžitě</strong> — v aplikaci banky nebo na infolince na zadní straně karty.
          Čas hraje roli: útočníci zpravidla použijí údaje do minut.
        </li>
        <li>
          <strong>Sleduj transakce</strong> a reklamuj vše, co nepocházelo od tebe — neautorizované transakce.
          Banka má ze zákona povinnost je prošetřit a v odůvodněných případech vrátit.
        </li>
        <li>
          <strong>Změň heslo k internetovému bankovnictví</strong>, pokud jsi ho na podvodné stránce zadal(a).
        </li>
        <li>
          <strong>Nahlaš podvodný web</strong> — Google nabízí formulář pro hlášení phishingových stránek:
          <a href="https://safebrowsing.google.com/safebrowsing/report_phish/" target="_blank" rel="noopener noreferrer"> safebrowsing.google.com</a>.
          Stránka pak bude v prohlížečích označena jako nebezpečná.
        </li>
        <li>
          <strong>Oznámení Policii ČR</strong> přes <a href="https://www.policie.cz" target="_blank" rel="noopener noreferrer">policie.cz</a> nebo 158.
        </li>
      </ol>

      <h2>Jak ověřit zásilku bezpečně</h2>
      <ul>
        <li>
          <strong>Tracking číslo zadejte přímo na webu kurýra</strong> — přejděte na <code>dpd.com</code>, <code>zasilkovna.cz</code>
          nebo <code>ppl.cz</code> ručně v prohlížeči (nepřeklikávejte z odkazu ve zprávě) a zadejte číslo zásilky tam.
        </li>
        <li>
          <strong>Kontaktujte kurýra přímo.</strong> Telefonní čísla najdete na officiálním webu firmy — ne ta, která uvádí SMS.
        </li>
        <li>
          <strong>Nainstalujte si aplikaci kurýra.</strong> DPD, Zásilkovna i PPL mají vlastní aplikace — notifikace z nich jsou autentické.
        </li>
      </ul>

      {/* End CTA */}
      <div className="not-prose mt-10 rounded-2xl border border-success/30 bg-success/5 p-5 space-y-3">
        <p className="font-bold text-foreground">Podvedl tě někdo? Nahlas ho a ochraň ostatní.</p>
        <p className="text-sm text-muted-foreground">
          Nahlásit číslo nebo doménu trvá dvě minuty. Každý záznam varuje další lidi,
          kteří by mohli dostat stejnou zprávu.
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
