export default function VopPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white py-32 px-6">
      <div className="max-w-3xl mx-auto space-y-10">

        <div>
          <h1 className="text-4xl font-black tracking-tighter mb-2">Obchodní podmínky</h1>
          <p className="text-slate-500 text-sm">Platné od 1. ledna 2025</p>
        </div>

        <section className="space-y-4">
          <h2 className="text-xl font-bold text-blue-400">1. Provozovatel služby</h2>
          <p className="text-slate-300 leading-relaxed">
            Provozovatelem služby NeKlikni.cz je společnost <strong>PK Virgine, s.r.o.</strong>,
            se sídlem Korunní 2569/108, Vinohrady, 101 00 Praha, IČO: 21448507, DIČ: CZ21448507,
            zapsaná v obchodním rejstříku vedeném Městským soudem v Praze pod sp. zn. C 401405/MSPH.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-bold text-blue-400">2. Popis služby</h2>
          <p className="text-slate-300 leading-relaxed">
            NeKlikni.cz je nástroj využívající umělou inteligenci k analýze textových zpráv, SMS a odkazů
            za účelem detekce potenciálních podvodů a phishingových útoků. Výsledky analýzy mají
            <strong> výhradně informativní charakter</strong> a nepředstavují právní, bezpečnostní ani
            odborné poradenství.
          </p>
          <p className="text-slate-300 leading-relaxed">
            Součástí služby je rovněž <strong className="text-white">komunitní databáze nahlášení</strong> provozovaná
            v režimu platformy s uživatelským obsahem (viz body 8–14 níže).
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-bold text-blue-400">3. Registrace a uživatelský účet</h2>
          <p className="text-slate-300 leading-relaxed">
            Pro plné využití služby je nutná registrace. Uživatel je povinen uvádět pravdivé údaje
            a chránit přístupové údaje ke svému účtu. Provozovatel nenese odpovědnost za škody
            vzniklé zneužitím přístupových údajů třetí osobou.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-bold text-blue-400">4. Tarify a platby</h2>
          <p className="text-slate-300 leading-relaxed">
            Služba je poskytována v několika tarifech: JEDNORÁZOVÁ (jednorázový poplatek 49 Kč za 1 prémiovou analýzu),
            BASIC (99 Kč/měsíc za 50 analýz) a PRO (199 Kč/měsíc za 150 analýz). Ceny jsou uvedeny
            včetně DPH. Platby jsou zpracovávány prostřednictvím platební brány Stripe.
            Předplatné se automaticky obnovuje, dokud není zrušeno.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-bold text-blue-400">5. Zrušení předplatného a vrácení platby</h2>
          <p className="text-slate-300 leading-relaxed">
            Předplatné lze zrušit kdykoliv prostřednictvím správy účtu v sekci profilu. Zrušení
            nabývá účinnosti na konci aktuálního fakturačního období. Nevyčerpané kredity se
            nepřevádějí do dalšího období a nevracejí. Na základě oprávněné reklamace může
            provozovatel rozhodnout o vrácení platby individuálně.
          </p>
          <p className="text-slate-300 leading-relaxed">
            Zakoupením kreditů nebo předplatného souhlasíte s okamžitým poskytnutím digitálního obsahu
            ve smyslu § 1837 písm. l) občanského zákoníku. Tímto souhlasem ztrácíte právo na odstoupení
            od smlouvy ve 14denní lhůtě.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-bold text-blue-400">6. Omezení odpovědnosti</h2>
          <p className="text-slate-300 leading-relaxed">
            Analýzy prováděné službou NeKlikni.cz jsou generovány umělou inteligencí a mohou
            obsahovat nepřesnosti. Provozovatel <strong>nenese odpovědnost za žádné škody</strong> vzniklé
            na základě výsledků analýzy, včetně případů, kdy analýza nedetekovala podvod nebo
            označila legitimní zprávu jako podezřelou. Uživatel používá službu na vlastní riziko.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-bold text-blue-400">7. Ochrana osobních údajů</h2>
          <p className="text-slate-300 leading-relaxed">
            Zpracování osobních údajů se řídí Zásadami ochrany osobních údajů (GDPR).
            Analyzované texty nejsou trvale ukládány ani sdíleny s třetími stranami.
            Provozovatel zpracovává pouze údaje nezbytné pro provoz služby (e-mail, fakturační údaje).
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-bold text-blue-400">8. Databáze nahlášení jako platforma s uživatelským obsahem</h2>
          <p className="text-slate-300 leading-relaxed">
            Vedle nástroje pro analýzu zpráv provozuje NeKlikni.cz <strong className="text-white">komunitní databázi nahlášených podezření</strong>, do které registrovaní uživatelé (&bdquo;nahlašovatelé&ldquo;) vkládají informace o subjektech podezřelých z podvodného jednání. Služba slouží k <strong className="text-white">prevenci online podvodů a vyhodnocení rizikové komunikace</strong>.
          </p>
          <p className="text-slate-300 leading-relaxed">
            Ve vztahu k databázi vystupuje provozovatel jako <strong className="text-white">poskytovatel platformy umožňující sdílení uživatelského obsahu</strong>. Obsah jednotlivých nahlášení pochází od nahlašovatelů a <strong className="text-white">nepředstavuje tvrzení, stanovisko ani potvrzení provozovatele</strong>. Provozovatel obsah před zveřejněním moderuje, neručí však za jeho pravdivost.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-bold text-blue-400">9. Povinnosti nahlašovatele</h2>
          <p className="text-slate-300 leading-relaxed">Nahlašovatel je povinen:</p>
          <ul className="space-y-2 text-slate-400 text-sm">
            <li className="flex gap-2"><span className="text-blue-400">→</span> uvádět <strong className="text-white">pravdivé a úplné</strong> informace podle svého nejlepšího vědomí,</li>
            <li className="flex gap-2"><span className="text-blue-400">→</span> nahlašovat pouze jednání s <strong className="text-white">vlastní zkušeností</strong> nebo konkrétními poznatky,</li>
            <li className="flex gap-2"><span className="text-blue-400">→</span> nezneužívat databázi k <strong className="text-white">pomstě, šikaně, vydírání, nekalé soutěži</strong> ani k poškození třetích osob,</li>
            <li className="flex gap-2"><span className="text-blue-400">→</span> <strong className="text-white">nenahrávat</strong> doklady totožnosti (občanský průkaz, pas), rodná čísla, údaje o platebních kartách ani intimní obsah — pouze screenshoty komunikace a inzerátů nezbytné k doložení,</li>
            <li className="flex gap-2"><span className="text-blue-400">→</span> přikládat pouze <strong className="text-white">důkazy, které je oprávněn sdílet</strong>.</li>
          </ul>
          <p className="text-slate-300 leading-relaxed">
            Při odeslání nahlašovatel potvrzuje pravdivost údajů a souhlas se zpracováním. <strong className="text-white">Odpovědnost za obsah a pravdivost nahlášení nese nahlašovatel.</strong>
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-bold text-blue-400">10. Práva provozovatele při moderaci</h2>
          <p className="text-slate-300 leading-relaxed">Provozovatel je oprávněn:</p>
          <ul className="space-y-2 text-slate-400 text-sm">
            <li className="flex gap-2"><span className="text-blue-400">→</span> <strong className="text-white">posoudit</strong> každé nahlášení před zveřejněním a rozhodnout o jeho zveřejnění,</li>
            <li className="flex gap-2"><span className="text-blue-400">→</span> <strong className="text-white">vrátit k doplnění</strong> neúplné nebo nedostatečně doložené nahlášení,</li>
            <li className="flex gap-2"><span className="text-blue-400">→</span> <strong className="text-white">zamítnout nebo odstranit</strong> nahlášení porušující tyto podmínky, nepravdivé nebo zneužívající — i bez upozornění,</li>
            <li className="flex gap-2"><span className="text-blue-400">→</span> <strong className="text-white">skrýt záznam</strong> po dobu posuzování námitky,</li>
            <li className="flex gap-2"><span className="text-blue-400">→</span> <strong className="text-white">zablokovat</strong> nahlašovatele opakovaně porušujícího pravidla.</li>
          </ul>
          <p className="text-slate-300 leading-relaxed">
            Na zveřejnění nahlášení <strong className="text-white">není právní nárok</strong>.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-bold text-blue-400">11. Povaha záznamů a omezení odpovědnosti</h2>
          <p className="text-slate-300 leading-relaxed">
            Záznam v databázi představuje <strong className="text-white">nepotvrzené nahlášení</strong>, nikoli prokázaný fakt, rozsudek ani úřední rozhodnutí. Evidence subjektu <strong className="text-white">neznamená</strong>, že se prokazatelně dopustil podvodu. Záznamy zobrazujeme neutrálně (např. &bdquo;subjekt s více hlášeními&ldquo;, &bdquo;X nahlášení za posledních 12 měsíců&ldquo;), nikoli jako tvrzení o vině.
          </p>
          <p className="text-slate-300 leading-relaxed">
            Provozovatel nenese odpovědnost za pravdivost jednotlivých nahlášení, za rozhodnutí učiněná uživateli na jejich základě, ani za škody vzniklé v důsledku obsahu vloženého nahlašovatelem. Informace mají <strong className="text-white">informativní charakter</strong>.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-bold text-blue-400">12. Spolupráce s orgány veřejné moci</h2>
          <p className="text-slate-300 leading-relaxed">
            Provozovatel může v <strong className="text-white">zákonem předpokládaných případech spolupracovat s orgány veřejné moci</strong>. Nejde o automatické předávání údajů — provozovatel postupuje pouze v rozsahu a způsobem stanoveným právními předpisy.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-bold text-blue-400">13. Hlášení nezákonného obsahu (DSA)</h2>
          <p className="text-slate-300 leading-relaxed">
            Domníváte-li se, že obsah v databázi je <strong className="text-white">nezákonný</strong> (např. nepravdivé nahlášení zasahující do vašich práv), můžete to nahlásit na <strong className="text-white">info@neklikni.cz</strong> nebo přes{" "}
            <a href="/kontakt" className="text-blue-400 hover:text-blue-300 font-bold transition-colors">kontaktní formulář</a>.
            V hlášení uveďte:
          </p>
          <ul className="space-y-2 text-slate-400 text-sm">
            <li className="flex gap-2"><span className="text-blue-400">→</span> identifikaci sporného obsahu (kterého záznamu se týká),</li>
            <li className="flex gap-2"><span className="text-blue-400">→</span> důvod, proč jej považujete za nezákonný,</li>
            <li className="flex gap-2"><span className="text-blue-400">→</span> váš kontakt pro vyrozumění.</li>
          </ul>
          <p className="text-slate-300 leading-relaxed">
            Hlášení posoudíme <strong className="text-white">bez zbytečného odkladu, nejpozději do 14 dnů</strong>, a o výsledku vás vyrozumíme. Po dobu posouzení můžeme obsah dočasně skrýt; je-li hlášení důvodné, obsah odstraníme.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-bold text-blue-400">14. Námitky dotčených osob</h2>
          <p className="text-slate-300 leading-relaxed">
            Osoba nahlášená v databázi může podat námitku postupem dle Zásad ochrany osobních údajů (Notice &amp; Takedown). Provozovatel ji posoudí nejpozději do 14 dnů.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-bold text-blue-400">15. Změny podmínek</h2>
          <p className="text-slate-300 leading-relaxed">
            Provozovatel si vyhrazuje právo tyto podmínky měnit. O změnách bude uživatel informován
            e-mailem nebo oznámením v aplikaci. Pokračování v užívání služby po nabytí účinnosti
            změn představuje souhlas s novými podmínkami.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-bold text-blue-400">16. Kontakt</h2>
          <p className="text-slate-300 leading-relaxed">
            PK Virgine, s.r.o.<br />
            Korunní 2569/108, Vinohrady, 101 00 Praha<br />
            IČO: 21448507<br />
            Datová schránka: bty8mey<br />
            E-mail: info@neklikni.cz
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-bold text-blue-400">17. Rozhodné právo</h2>
          <p className="text-slate-300 leading-relaxed">
            Tyto podmínky se řídí právním řádem České republiky. Případné spory budou řešeny
            příslušným soudem v České republice.
          </p>
        </section>

      </div>
    </main>
  );
}
