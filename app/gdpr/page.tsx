export default function GdprPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white py-32 px-6">
      <div className="max-w-3xl mx-auto space-y-10">

        <div>
          <h1 className="text-4xl font-black tracking-tighter mb-2">Ochrana osobních údajů</h1>
          <p className="text-slate-500 text-sm">Platné od 1. ledna 2025 · PK Virgine, s.r.o.</p>
        </div>

        <section className="space-y-4">
          <h2 className="text-xl font-bold text-purple-400">1. Správce osobních údajů</h2>
          <p className="text-slate-300 leading-relaxed">
            Správcem osobních údajů je společnost <strong>PK Virgine, s.r.o.</strong>, 
            Korunní 2569/108, Vinohrady, 101 00 Praha, IČO: 21448507, DIČ: CZ21448507, 
            datová schránka: bty8mey.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-bold text-purple-400">2. Jaké údaje zpracováváme</h2>
          <p className="text-slate-300 leading-relaxed">
            Zpracováváme pouze údaje nezbytné pro provoz služby:
          </p>
          <ul className="space-y-2 text-slate-400 text-sm">
            <li className="flex gap-2"><span className="text-purple-400">→</span> E-mailová adresa (pro přihlášení a komunikaci)</li>
            <li className="flex gap-2"><span className="text-purple-400">→</span> Fakturační údaje (při platbě předplatného)</li>
            <li className="flex gap-2"><span className="text-purple-400">→</span> Záznamy o použití služby (počet analýz, tarif)</li>
          </ul>
          <p className="text-slate-400 text-sm leading-relaxed">
            Analyzované texty a zprávy <strong className="text-white">nejsou trvale ukládány</strong> a
            nejsou sdíleny s třetími stranami mimo zpracování analýzy.
          </p>
          <p className="text-slate-400 text-sm leading-relaxed">
            Nahrané screenshoty mohou obsahovat osobní údaje třetích stran (telefonní čísla, jména, adresy).
            Tyto údaje jsou zpracovány výhradně za účelem analýzy a nejsou po jejím dokončení ukládány.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-bold text-purple-400">3. Účel zpracování</h2>
          <ul className="space-y-2 text-slate-400 text-sm">
            <li className="flex gap-2"><span className="text-purple-400">→</span> Poskytování a provoz služby NeKlikni.cz</li>
            <li className="flex gap-2"><span className="text-purple-400">→</span> Správa uživatelského účtu a předplatného</li>
            <li className="flex gap-2"><span className="text-purple-400">→</span> Zpracování plateb a vystavení daňových dokladů</li>
            <li className="flex gap-2"><span className="text-purple-400">→</span> Zákaznická podpora</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-bold text-purple-400">4. Právní základ zpracování</h2>
          <p className="text-slate-300 leading-relaxed">
            Osobní údaje zpracováváme na základě plnění smlouvy (čl. 6 odst. 1 písm. b) GDPR) 
            a oprávněného zájmu provozovatele (čl. 6 odst. 1 písm. f) GDPR). 
            Fakturační údaje zpracováváme na základě zákonné povinnosti.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-bold text-purple-400">5. Příjemci osobních údajů</h2>
          <p className="text-slate-300 leading-relaxed">
            Vaše údaje sdílíme pouze s důvěryhodnými zpracovateli nutnými pro provoz služby:
          </p>
          <ul className="space-y-2 text-slate-400 text-sm">
            <li className="flex gap-2"><span className="text-purple-400">→</span> <strong className="text-white">Supabase</strong> – autentizace a databáze (USA, Standard Contractual Clauses)</li>
            <li className="flex gap-2"><span className="text-purple-400">→</span> <strong className="text-white">Stripe</strong> – zpracování plateb (USA, Standard Contractual Clauses)</li>
            <li className="flex gap-2"><span className="text-purple-400">→</span> <strong className="text-white">Anthropic</strong> – AI analýza textů (USA, Standard Contractual Clauses)</li>
            <li className="flex gap-2"><span className="text-purple-400">→</span> <strong className="text-white">Vercel</strong> – hosting aplikace (USA, Standard Contractual Clauses)</li>
            <li className="flex gap-2"><span className="text-purple-400">→</span> <strong className="text-white">Google Analytics</strong> – analýza návštěvnosti (pouze se souhlasem uživatele)</li>
          </ul>
          <p className="text-slate-400 text-sm leading-relaxed">
            Podrobnosti o používání cookies naleznete na stránce{" "}
            <a href="/cookies" className="text-purple-400 hover:text-purple-300 font-bold transition-colors">
              Cookies
            </a>
            .
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-bold text-purple-400">6. Doba uchování dat</h2>
          <p className="text-slate-300 leading-relaxed">
            Osobní údaje uchováváme po dobu trvání uživatelského účtu a dále po dobu 
            stanovenou právními předpisy (zejména daňové doklady po dobu 10 let). 
            Po zrušení účtu jsou údaje do 30 dnů smazány, s výjimkou zákonných povinností.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-bold text-purple-400">7. Vaše práva</h2>
          <p className="text-slate-300 leading-relaxed">
            V souladu s GDPR máte právo na:
          </p>
          <ul className="space-y-2 text-slate-400 text-sm">
            <li className="flex gap-2"><span className="text-purple-400">→</span> Přístup k vašim osobním údajům</li>
            <li className="flex gap-2"><span className="text-purple-400">→</span> Opravu nepřesných údajů</li>
            <li className="flex gap-2"><span className="text-purple-400">→</span> Výmaz údajů ("právo být zapomenut")</li>
            <li className="flex gap-2"><span className="text-purple-400">→</span> Přenositelnost dat</li>
            <li className="flex gap-2"><span className="text-purple-400">→</span> Námitku proti zpracování</li>
            <li className="flex gap-2"><span className="text-purple-400">→</span> Podání stížnosti u Úřadu pro ochranu osobních údajů (uoou.cz)</li>
          </ul>
          <p className="text-slate-400 text-sm">
            Svá práva můžete uplatnit prostřednictvím{" "}
            <a href="/kontakt" className="text-purple-400 hover:text-purple-300 font-bold transition-colors">
              kontaktního formuláře
            </a>.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-bold text-purple-400">8. Kontakt</h2>
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