export default function VopPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white py-32 px-6">
      <div className="max-w-3xl mx-auto space-y-10">
        
        <div>
          <h1 className="text-4xl font-black tracking-tighter mb-2">Obchodní podmínky</h1>
          <p className="text-slate-500 text-sm">Platné od 1. ledna 2025</p>
        </div>

        <section className="space-y-4">
          <h2 className="text-xl font-bold text-purple-400">1. Provozovatel služby</h2>
          <p className="text-slate-300 leading-relaxed">
            Provozovatelem služby NeKlikni.cz je společnost <strong>PK Virgine, s.r.o.</strong>, 
            se sídlem Korunní 2569/108, Vinohrady, 101 00 Praha, IČO: 21448507, DIČ: CZ21448507, 
            zapsaná v obchodním rejstříku vedeném Městským soudem v Praze pod sp. zn. C 401405/MSPH.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-bold text-purple-400">2. Popis služby</h2>
          <p className="text-slate-300 leading-relaxed">
            NeKlikni.cz je nástroj využívající umělou inteligenci k analýze textových zpráv, SMS a odkazů 
            za účelem detekce potenciálních podvodů a phishingových útoků. Výsledky analýzy mají 
            <strong> výhradně informativní charakter</strong> a nepředstavují právní, bezpečnostní ani 
            odborné poradenství.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-bold text-purple-400">3. Registrace a uživatelský účet</h2>
          <p className="text-slate-300 leading-relaxed">
            Pro plné využití služby je nutná registrace. Uživatel je povinen uvádět pravdivé údaje 
            a chránit přístupové údaje ke svému účtu. Provozovatel nenese odpovědnost za škody 
            vzniklé zneužitím přístupových údajů třetí osobou.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-bold text-purple-400">4. Tarify a platby</h2>
          <p className="text-slate-300 leading-relaxed">
            Služba je poskytována ve třech tarifech: EASY (jednorázový poplatek 29 Kč za 10 analýz), 
            BASIC (99 Kč/měsíc za 50 analýz) a PRO (199 Kč/měsíc za 200 analýz). Ceny jsou uvedeny 
            včetně DPH. Platby jsou zpracovávány prostřednictvím platební brány Stripe. 
            Předplatné se automaticky obnovuje, dokud není zrušeno.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-bold text-purple-400">5. Zrušení předplatného a vrácení platby</h2>
          <p className="text-slate-300 leading-relaxed">
            Předplatné lze zrušit kdykoliv prostřednictvím správy účtu v sekci profilu. Zrušení 
            nabývá účinnosti na konci aktuálního fakturačního období. Nevyčerpané kredity se 
            nepřevádějí do dalšího období a nevracejí. Na základě oprávněné reklamace může 
            provozovatel rozhodnout o vrácení platby individuálně.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-bold text-purple-400">6. Omezení odpovědnosti</h2>
          <p className="text-slate-300 leading-relaxed">
            Analýzy prováděné službou NeKlikni.cz jsou generovány umělou inteligencí a mohou 
            obsahovat nepřesnosti. Provozovatel <strong>nenese odpovědnost za žádné škody</strong> vzniklé 
            na základě výsledků analýzy, včetně případů, kdy analýza nedetekovala podvod nebo 
            označila legitimní zprávu jako podezřelou. Uživatel používá službu na vlastní riziko.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-bold text-purple-400">7. Ochrana osobních údajů</h2>
          <p className="text-slate-300 leading-relaxed">
            Zpracování osobních údajů se řídí Zásadami ochrany osobních údajů (GDPR). 
            Analyzované texty nejsou trvale ukládány ani sdíleny s třetími stranami. 
            Provozovatel zpracovává pouze údaje nezbytné pro provoz služby (e-mail, fakturační údaje).
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-bold text-purple-400">8. Změny podmínek</h2>
          <p className="text-slate-300 leading-relaxed">
            Provozovatel si vyhrazuje právo tyto podmínky měnit. O změnách bude uživatel informován 
            e-mailem nebo oznámením v aplikaci. Pokračování v užívání služby po nabytí účinnosti 
            změn představuje souhlas s novými podmínkami.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-bold text-purple-400">9. Kontakt</h2>
          <p className="text-slate-300 leading-relaxed">
            PK Virgine, s.r.o.<br />
            Korunní 2569/108, Vinohrady, 101 00 Praha<br />
            IČO: 21448507<br />
            Datová schránka: bty8mey<br />
            E-mail: info@neklikni.cz
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-bold text-purple-400">10. Rozhodné právo</h2>
          <p className="text-slate-300 leading-relaxed">
            Tyto podmínky se řídí právním řádem České republiky. Případné spory budou řešeny 
            příslušným soudem v České republice.
          </p>
        </section>

      </div>
    </main>
  );
}