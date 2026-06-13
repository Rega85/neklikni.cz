export default function GdprPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white py-32 px-6">
      <div className="max-w-3xl mx-auto space-y-10">

        <div>
          <h1 className="text-4xl font-black tracking-tighter mb-2">Ochrana osobních údajů</h1>
          <p className="text-slate-500 text-sm">Platné od 1. ledna 2025 · PK Virgine, s.r.o.</p>
        </div>

        <section className="space-y-4">
          <h2 className="text-xl font-bold text-blue-400">1. Správce osobních údajů</h2>
          <p className="text-slate-300 leading-relaxed">
            Správcem osobních údajů je společnost <strong>PK Virgine, s.r.o.</strong>,
            Korunní 2569/108, Vinohrady, 101 00 Praha, IČO: 21448507, DIČ: CZ21448507,
            datová schránka: bty8mey.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-bold text-blue-400">2. Jaké údaje zpracováváme</h2>
          <p className="text-slate-300 leading-relaxed">
            Zpracováváme pouze údaje nezbytné pro provoz služby:
          </p>
          <ul className="space-y-2 text-slate-400 text-sm">
            <li className="flex gap-2"><span className="text-blue-400">→</span> E-mailová adresa (pro přihlášení a komunikaci)</li>
            <li className="flex gap-2"><span className="text-blue-400">→</span> Fakturační údaje (při platbě předplatného)</li>
            <li className="flex gap-2"><span className="text-blue-400">→</span> Záznamy o použití služby (počet analýz, tarif)</li>
          </ul>
          <p className="text-slate-400 text-sm leading-relaxed">
            Analyzované texty a zprávy <strong className="text-white">nejsou trvale ukládány</strong> a
            nejsou sdíleny s třetími stranami mimo zpracování analýzy.
            <strong className="text-white"> Toto se nevztahuje na komunitní databázi nahlášení</strong> —
            tam se údaje vložené nahlašovateli uchovávají v režimu popsaném v bodech 8–15 níže.
          </p>
          <p className="text-slate-400 text-sm leading-relaxed">
            Nahrané screenshoty mohou obsahovat osobní údaje třetích stran (telefonní čísla, jména, adresy).
            Tyto údaje jsou zpracovány výhradně za účelem analýzy a nejsou po jejím dokončení ukládány.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-bold text-blue-400">3. Účel zpracování</h2>
          <ul className="space-y-2 text-slate-400 text-sm">
            <li className="flex gap-2"><span className="text-blue-400">→</span> Poskytování a provoz služby NeKlikni.cz</li>
            <li className="flex gap-2"><span className="text-blue-400">→</span> Správa uživatelského účtu a předplatného</li>
            <li className="flex gap-2"><span className="text-blue-400">→</span> Zpracování plateb a vystavení daňových dokladů</li>
            <li className="flex gap-2"><span className="text-blue-400">→</span> Zákaznická podpora</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-bold text-blue-400">4. Právní základ zpracování</h2>
          <p className="text-slate-300 leading-relaxed">
            Osobní údaje zpracováváme na základě plnění smlouvy (čl. 6 odst. 1 písm. b) GDPR)
            a oprávněného zájmu provozovatele (čl. 6 odst. 1 písm. f) GDPR).
            Fakturační údaje zpracováváme na základě zákonné povinnosti.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-bold text-blue-400">5. Příjemci osobních údajů</h2>
          <p className="text-slate-300 leading-relaxed">
            Vaše údaje sdílíme pouze s důvěryhodnými zpracovateli nutnými pro provoz služby:
          </p>
          <ul className="space-y-2 text-slate-400 text-sm">
            <li className="flex gap-2"><span className="text-blue-400">→</span> <strong className="text-white">Supabase</strong> – autentizace a databáze (USA, Standard Contractual Clauses)</li>
            <li className="flex gap-2"><span className="text-blue-400">→</span> <strong className="text-white">Stripe</strong> – zpracování plateb (USA, Standard Contractual Clauses)</li>
            <li className="flex gap-2"><span className="text-blue-400">→</span> <strong className="text-white">Anthropic</strong> – AI analýza textů (USA, Standard Contractual Clauses)</li>
            <li className="flex gap-2"><span className="text-blue-400">→</span> <strong className="text-white">Vercel</strong> – hosting aplikace (USA, Standard Contractual Clauses)</li>
            <li className="flex gap-2"><span className="text-blue-400">→</span> <strong className="text-white">Google Analytics</strong> – analýza návštěvnosti (pouze se souhlasem uživatele)</li>
          </ul>
          <p className="text-slate-400 text-sm leading-relaxed">
            Podrobnosti o používání cookies naleznete na stránce{" "}
            <a href="/cookies" className="text-blue-400 hover:text-blue-300 font-bold transition-colors">
              Cookies
            </a>
            .
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-bold text-blue-400">6. Doba uchování dat</h2>
          <p className="text-slate-300 leading-relaxed">
            Osobní údaje uchováváme po dobu trvání uživatelského účtu a dále po dobu
            stanovenou právními předpisy (zejména daňové doklady po dobu 10 let).
            Po zrušení účtu jsou údaje do 30 dnů smazány, s výjimkou zákonných povinností.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-bold text-blue-400">7. Vaše práva</h2>
          <p className="text-slate-300 leading-relaxed">
            V souladu s GDPR máte právo na:
          </p>
          <ul className="space-y-2 text-slate-400 text-sm">
            <li className="flex gap-2"><span className="text-blue-400">→</span> Přístup k vašim osobním údajům</li>
            <li className="flex gap-2"><span className="text-blue-400">→</span> Opravu nepřesných údajů</li>
            <li className="flex gap-2"><span className="text-blue-400">→</span> Výmaz údajů (&bdquo;právo být zapomenut&ldquo;)</li>
            <li className="flex gap-2"><span className="text-blue-400">→</span> Přenositelnost dat</li>
            <li className="flex gap-2"><span className="text-blue-400">→</span> Námitku proti zpracování</li>
            <li className="flex gap-2"><span className="text-blue-400">→</span> Podání stížnosti u Úřadu pro ochranu osobních údajů (uoou.cz)</li>
          </ul>
          <p className="text-slate-400 text-sm">
            Svá práva můžete uplatnit prostřednictvím{" "}
            <a href="/kontakt" className="text-blue-400 hover:text-blue-300 font-bold transition-colors">
              kontaktního formuláře
            </a>.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-bold text-blue-400">8. Komunitní databáze nahlášených podezření</h2>
          <p className="text-slate-300 leading-relaxed">
            Vedle analýzy zpráv provozujeme <strong className="text-white">komunitní databázi nahlášených podezření na podvodné jednání</strong> (dále jen &bdquo;databáze&ldquo;). Registrovaní uživatelé do ní mohou nahlásit subjekt (např. prodejce, inzerent, protistranu transakce), u kterého mají <strong className="text-white">podezření</strong> na podvodné jednání (typicky nedodání zboží po platbě). Účelem databáze je <strong className="text-white">prevence online podvodů</strong> a varování ostatních uživatelů před opakujícím se rizikovým jednáním.
          </p>
          <p className="text-slate-300 leading-relaxed">
            Databáze neslouží k &bdquo;trestání&ldquo; osob ani k vedení blacklistu. Každý záznam představuje <strong className="text-white">nepotvrzené nahlášení uživatele</strong>, nikoli prokázaný fakt.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-bold text-blue-400">9. Údaje o nahlášených osobách (třetích stranách)</h2>
          <p className="text-slate-300 leading-relaxed">
            V souvislosti s databází zpracováváme údaje o <strong className="text-white">třetích osobách, které samy nejsou našimi uživateli</strong> a které do databáze vložil nahlašovatel:
          </p>
          <ul className="space-y-2 text-slate-400 text-sm">
            <li className="flex gap-2"><span className="text-blue-400">→</span> <strong className="text-white">Identifikátory subjektu</strong> — telefonní číslo, e-mailová adresa, číslo bankovního účtu, odkaz na profil na platformě (Vinted, Facebook Marketplace, Bazoš apod.)</li>
            <li className="flex gap-2"><span className="text-blue-400">→</span> <strong className="text-white">Popis nahlášeného podezření</strong> — text vložený nahlašovatelem (datum, platforma, kategorie, částka, okolnosti)</li>
            <li className="flex gap-2"><span className="text-blue-400">→</span> <strong className="text-white">Důkazní materiály</strong> — screenshoty komunikace nebo inzerátů nahrané nahlašovatelem</li>
            <li className="flex gap-2"><span className="text-blue-400">→</span> <strong className="text-white">Odvozené údaje</strong> — agregovaný počet nahlášení, kategorie, časové rozpětí</li>
          </ul>
          <p className="text-slate-400 text-sm leading-relaxed">
            <strong className="text-white">Veřejně zobrazujeme pouze maskované identifikátory</strong> (např. +420 7** *** *88, ********3/0800) a agregované informace. Plné identifikátory, popisy a důkazy <strong className="text-white">nejsou veřejně přístupné</strong> — slouží pouze pro interní moderaci a případnou spolupráci s oprávněnými orgány.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-bold text-blue-400">10. Zdroj údajů</h2>
          <p className="text-slate-300 leading-relaxed">
            Údaje o nahlášených subjektech získáváme <strong className="text-white">od nahlašovatelů</strong> (našich registrovaných uživatelů), nikoli od dotčených osob samotných. Tuto skutečnost uvádíme v souladu s čl. 14 GDPR.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-bold text-blue-400">11. Právní základ — oprávněný zájem</h2>
          <p className="text-slate-300 leading-relaxed">
            Zpracování provádíme na základě <strong className="text-white">oprávněného zájmu</strong> podle čl. 6 odst. 1 písm. f) GDPR. Oprávněným zájmem je <strong className="text-white">prevence podvodů a ochrana uživatelů</strong> před opakujícím se podvodným jednáním v online prostředí. Služba slouží k vyhodnocení rizikové komunikace, nikoli k postihu osob.
          </p>
          <p className="text-slate-400 text-sm leading-relaxed">
            Provedli jsme posouzení (balanční test) mezi tímto zájmem a právy dotčených osob a přijali následující ochranná opatření zajišťující přiměřenost:
          </p>
          <ul className="space-y-2 text-slate-400 text-sm">
            <li className="flex gap-2"><span className="text-blue-400">→</span> veřejně pouze <strong className="text-white">maskované</strong> identifikátory, nikdy plná jména ani plné údaje</li>
            <li className="flex gap-2"><span className="text-blue-400">→</span> každé nahlášení prochází <strong className="text-white">manuální kontrolou</strong> před zveřejněním — nezveřejňujeme automaticky</li>
            <li className="flex gap-2"><span className="text-blue-400">→</span> záznam je vždy označen jako <strong className="text-white">nepotvrzené nahlášení</strong>, nikoli prokázaný fakt</li>
            <li className="flex gap-2"><span className="text-blue-400">→</span> dotčená osoba má právo <strong className="text-white">námitky</strong>, opravy a výmazu (viz bod 13)</li>
            <li className="flex gap-2"><span className="text-blue-400">→</span> omezená <strong className="text-white">doba uchování</strong> (viz bod 12)</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-bold text-blue-400">12. Doba uchování nahlášení</h2>
          <p className="text-slate-300 leading-relaxed">
            Nahlášení jsou <strong className="text-white">pravidelně revidována a mazána nejpozději do 2 let</strong> od posledního nahlášení vztahujícího se k danému subjektu. Pokud dotčená osoba úspěšně podá námitku nebo prokáže nepravdivost, záznam odstraníme bezodkladně dle bodu 13.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-bold text-blue-400">13. Práva nahlášené osoby a mechanismus námitky (Notice &amp; Takedown)</h2>
          <p className="text-slate-300 leading-relaxed">
            Pokud jste byli v databázi nahlášeni a domníváte se, že je záznam nepravdivý, neoprávněný nebo zasahuje do vašich práv, můžete podat <strong className="text-white">námitku</strong> přes{" "}
            <a href="/kontakt" className="text-blue-400 hover:text-blue-300 font-bold transition-colors">kontaktní formulář</a>{" "}
            nebo na info@neklikni.cz.
          </p>
          <p className="text-slate-400 text-sm leading-relaxed">Po obdržení námitky:</p>
          <ul className="space-y-2 text-slate-400 text-sm">
            <li className="flex gap-2"><span className="text-blue-400">→</span> záznam můžeme <strong className="text-white">dočasně skrýt</strong> po dobu posouzení,</li>
            <li className="flex gap-2"><span className="text-blue-400">→</span> námitku posoudíme a vyrozumíme vás <strong className="text-white">bez zbytečného odkladu, nejpozději do 14 dnů</strong>,</li>
            <li className="flex gap-2"><span className="text-blue-400">→</span> je-li důvodná, záznam <strong className="text-white">odstraníme nebo opravíme</strong>.</li>
          </ul>
          <p className="text-slate-400 text-sm leading-relaxed">
            Máte rovněž všechna práva podle GDPR uvedená v bodě 7 těchto zásad.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-bold text-blue-400">14. Zpracování bezpečnostních a auditních údajů</h2>
          <p className="text-slate-300 leading-relaxed">
            Za účelem <strong className="text-white">zajištění bezpečnosti systému, prevence zneužití a vedení auditní stopy</strong> zpracováváme technické údaje: IP adresy, identifikátory relací, záznamy o akcích uživatelů a administrátorů (audit log), záznamy o moderaci a o vyřízení námitek. Právním základem je <strong className="text-white">oprávněný zájem</strong> na bezpečném a nezneužitelném provozu služby (čl. 6 odst. 1 písm. f) GDPR).
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-bold text-blue-400">15. Odpovědnost za obsah nahlášení</h2>
          <p className="text-slate-300 leading-relaxed">
            Obsah jednotlivých nahlášení pochází od <strong className="text-white">nahlašovatelů</strong>, kteří odpovídají za pravdivost uvedených údajů. Provozovatel vystupuje jako <strong className="text-white">provozovatel platformy</strong> s uživatelským obsahem, obsah před zveřejněním moderuje, negarantuje však pravdivost jednotlivých tvrzení.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-bold text-blue-400">16. Kontakt</h2>
          <p className="text-slate-300 leading-relaxed">
            PK Virgine, s.r.o.<br />
            Korunní 2569/108, Vinohrady, 101 00 Praha<br />
            IČO: 21448507<br />
            Datová schránka: bty8mey
          </p>
        </section>

      </div>
    </main>
  );
}
