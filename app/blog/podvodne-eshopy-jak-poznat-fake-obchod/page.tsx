import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getArticleBySlug } from "../_data/articles";
import ArticleLayout from "../_components/ArticleLayout";

const SLUG = "podvodne-eshopy-jak-poznat-fake-obchod";

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
        Podvodné e-shopy patří k nejrozšířenějším formám online podvodů v Česku.
        Stránka vypadá jako běžný internetový obchod — má logo, produkty, košík i platební bránu.
        Po zaplacení se však zboží nikdy nedostaví, obchod se stane nedostupným
        nebo vám přijde produkt výrazně jiný, než byl inzerovaný.
        Tento průvodce vám ukáže, na co se podívat, <strong>než kliknete na &bdquo;Koupit&ldquo;</strong>.
      </p>

      <h2>Jak podvodné e-shopy fungují</h2>
      <p>
        Falešný e-shop může vzniknout za odpoledne — existují šablony, které útočníci přizpůsobí
        a za pár hodin mají fungující stránku s produkty. Typicky inzerují přes sociální sítě
        (Facebook, Instagram, TikTok), kde reklama s lákavou cenou přivede zákazníky přímo
        na podvodný web. Jakmile zákazník zaplatí, nastane jedna z variant:
      </p>
      <ul>
        <li>Zboží nedorazí vůbec a e-shop přestane být dostupný.</li>
        <li>Přijde levná náhrada — nekvalitní imitace místo značkového produktu.</li>
        <li>E-shop trvale odkládá doručení s vymlouváním, dokud zákazník přestane psát.</li>
        <li>Při platbě kartou jsou ukradeny platební údaje a e-shop zakrytě přesměruje transakci.</li>
      </ul>

      <h2>Deset věcí, které zkontrolujte před nákupem</h2>

      <h3>1. Doména a stáří webu</h3>
      <p>
        Podvodné weby mají obvykle doménu registrovanou teprve několik týdnů nebo měsíců před zahájením
        &bdquo;prodeje&ldquo;. Stáří domény lze zkontrolovat přes bezplatné nástroje jako <code>whois.domaintools.com</code>.
        Pokud existuje méně než rok, buďte opatrní.
        Název domény bývá obecný nebo záměrně podobný etablovaným obchodům:
        <code>sport-outlet-cz.com</code>, <code>nike-sale-cz.eu</code>, <code>electro-bazaar.cz</code>.
      </p>

      <h3>2. Kontaktní informace</h3>
      <p>
        Legitimní e-shop musí ze zákona uvést: obchodní firmu nebo jméno, sídlo, IČO.
        Pokud žádné kontaktní údaje nejsou, nebo je tam jen e-mailová adresa na Gmailu,
        může jít o podvod. IČO ověřte v bezplatném <a href="https://ares.gov.cz" target="_blank" rel="noopener noreferrer">ARES</a>
        — pokud v systému neexistuje nebo je registrováno na jinou firmu, dejte si pozor.
      </p>

      <h3>3. Ceny výrazně pod tržní hodnotou</h3>
      <p>
        Nový iPhone za 4 000 Kč, snowboard za 800 Kč nebo značkové tenisky za 600 Kč — takové ceny nejsou reálné.
        Pokud je cena více než třetinová oproti ostatním obchodům, je to varovný signál.
      </p>

      <h3>4. Kvalita textu a překlady</h3>
      <p>
        Podvodné weby bývají přeloženy automaticky nebo vytvořeny lidmi, pro které čeština není mateřský jazyk.
        Chyby v diakritice, podivné větné konstrukce, generické popisy produktů zkopírované z jiných zdrojů —
        to vše jsou varovné signály. Originální e-shopy investují do textu.
      </p>

      <h3>5. Platební metody</h3>
      <p>
        Podvodné obchody preferují platby bez ochrany kupujícího: bankovní převod předem,
        kryptoměny, dárkové poukázky. Legitimní e-shop vždy nabídne kartou nebo přes
        důvěryhodnou platební bránu (PayPal, GoPay, Comgate) — kde máte možnost reklamace.
      </p>

      {/* Mid-article CTA */}
      <div className="not-prose my-8 rounded-2xl border border-purple-500/30 bg-purple-500/5 p-5 space-y-3">
        <p className="font-bold text-white">Přišla vám reklama na e-shop a nevíte, jestli je v pořádku?</p>
        <p className="text-sm text-slate-300">
          Zkopírujte URL nebo popis e-shopu — AI prověří varovné signály do 10 sekund.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white px-4 py-2.5 rounded-xl font-bold text-sm transition-all"
        >
          Prověřit zdarma →
        </Link>
      </div>

      <h3>6. Recenze a hodnocení</h3>
      <p>
        Prohledejte název e-shopu na Googlu s přidaným slovem &bdquo;podvod&ldquo;, &bdquo;zkušenosti&ldquo; nebo &bdquo;recenze&ldquo;.
        Zkontrolujte Heureka.cz a Zboží.cz — pokud e-shop na těchto srovnávačích není vůbec, je to neobvyklé
        pro legitimní český obchod s výraznými slevami.
        Pozor na e-shopy s recenzemi výhradně pěti hvězdičkami bez jakéhokoli záporného hodnocení —
        mohou být falešné.
      </p>

      <h3>7. Fyzická adresa</h3>
      <p>
        Adresu z obchodních podmínek vložte do Mapy.cz nebo Google Maps. Skutečný obchod (nebo provozovna)
        by se na adrese měl fyzicky nacházet. Pokud mapa ukáže prázdné pole nebo jiný podnik,
        adresa může být smyšlená.
      </p>

      <h3>8. Sociální sítě obchodu</h3>
      <p>
        Podvodné e-shopy mají typicky čerstvě vytvořené sociální profily s minimem followerů
        a jen pár příspěvky. Legitimní obchody mají historii, odpovídají na komentáře a mají
        interakci od reálných lidí.
      </p>

      <h3>9. Zabezpečení webu (HTTPS)</h3>
      <p>
        HTTPS (zelený zámeček v prohlížeči) je dnes základní standard — ale sám o sobě nezaručuje legitimitu.
        Podvodné weby ho také mívají. Je to podmínka nutná, ale nedostačující.
      </p>

      <h3>10. Obchodní podmínky a vrácení zboží</h3>
      <p>
        Přečtěte si, co se stane, když zboží chcete vrátit. Podvodné e-shopy mívají buď žádné podmínky,
        nebo podmínky zkopírované z jiného obchodu, které evidentně nesedí na daný sortiment.
      </p>

      <h2>Co dělat, když jste na podvodný e-shop naletěli</h2>
      <ol>
        <li>
          <strong>Pokud jste platili kartou</strong> — okamžitě kontaktujte banku a zahajte
          <em> chargeback</em> (reklamaci transakce). Máte na to zákonnou lhůtu, zpravidla 120 dní od transakce.
          Chargeback je mechanismus vydavatele karty, který umožňuje vrácení platby za neposkytnuté zboží.
        </li>
        <li>
          <strong>Pokud jste platili převodem</strong> — kontaktujte banku co nejdříve a požádejte o recall platby.
          Úspěšnost závisí na tom, zda peníze stále čekají nebo byly vybrány.
        </li>
        <li>
          <strong>Nahlazte e-shop na Google</strong> přes formulář pro nebezpečné weby a na Českou obchodní inspekci
          (<a href="https://www.coi.cz" target="_blank" rel="noopener noreferrer">coi.cz</a>).
          ČOI prošetřuje spotřebitelské stížnosti a může web zablokovat.
        </li>
        <li>
          <strong>Podejte trestní oznámení</strong> na Policii ČR (158 nebo <a href="https://www.policie.cz" target="_blank" rel="noopener noreferrer">policie.cz</a>).
          Přiložte screenshoty stránky, potvrzení platby a veškerou komunikaci.
        </li>
        <li>
          <strong>Varujte ostatní</strong> — napište recenzi na Google Maps, přidejte zkušenost do diskuzních skupin.
          Každé varování pomáhá dalším zákazníkům.
        </li>
      </ol>

      <h2>Shrnutí: rychlý checklist před každým nákupem</h2>
      <ul>
        <li>☐ Existuje IČO v ARES a odpovídá provozovateli?</li>
        <li>☐ Je cena realistická ve srovnání s jiným obchody?</li>
        <li>☐ Nabízí platbu kartou nebo přes důvěryhodnou bránu?</li>
        <li>☐ Má e-shop historii recenzí na Heurece nebo Googlu?</li>
        <li>☐ Je adresa sídla dohledatelná a odpovídá firmě?</li>
        <li>☐ Funguje kontakt na zákaznickou podporu?</li>
      </ul>

      {/* End CTA */}
      <div className="not-prose mt-10 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-5 space-y-3">
        <p className="font-bold text-white">Naletěli jste? Nahlasite e-shop a ochraňte ostatní.</p>
        <p className="text-sm text-slate-300">
          Přidejte URL, e-mail nebo číslo účtu e-shopu do databáze nahlášených incidentů —
          varuje to lidi, kteří by mohli nakoupit na stejném místě.
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
