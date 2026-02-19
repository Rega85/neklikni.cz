import React from 'react';

export default function GDPRPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-300 py-24 px-6">
      <div className="max-w-3xl mx-auto space-y-12">
        
        <header className="space-y-4">
          <h1 className="text-4xl font-black text-white italic">
            Ochrana soukromí <span className="text-purple-500">&</span> GDPR
          </h1>
          <p className="text-lg text-slate-400">
            U NeKlikni.cz je tvoje soukromí prioritou. Takhle nakládáme s tvými daty.
          </p>
        </header>

        <section className="space-y-6">
          <div className="bg-slate-900/50 border border-slate-800 p-8 rounded-3xl space-y-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="w-2 h-6 bg-purple-500 rounded-full" />
              Co se děje s tvými zprávami?
            </h2>
            <p className="leading-relaxed">
              Když vložíš text nebo nahraješ screenshot (v budoucnu), naše AI ho analyzuje v reálném čase. 
              **Zprávy neukládáme do žádné databáze pro pozdější čtení ani pro trénování našich modelů.** Jakmile je analýza hotová a ty vidíš výsledek, data jsou z naší operační paměti smazána.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="p-6 border border-slate-800 rounded-2xl">
              <h3 className="text-white font-bold mb-2">Žádné profilování</h3>
              <p className="text-sm">
                Neprodáváme tvoje data inzerentům ani třetím stranám. Nejsme data-broker, jsme bodyguard.
              </p>
            </div>
            <div className="p-6 border border-slate-800 rounded-2xl">
              <h3 className="text-white font-bold mb-2">Bezpečné platby</h3>
              <p className="text-sm">
                Údaje o tvé kartě nikdy nevidíme. Vše řeší Stripe, světová špička v bezpečnosti plateb.
              </p>
            </div>
          </div>
        </section>

        <section className="space-y-4 text-sm text-slate-500 border-t border-slate-800 pt-8">
          <p>
            Správcem osobních údajů je **[Tvoje Jméno / Firma]**, se sídlem [Tvoje Adresa]. 
            Zpracováváme pouze e-mailovou adresu pro účely tvého účtu a technické logy nezbytné pro provoz webu.
          </p>
          <p>
            Máš právo na výmaz, přístup k datům nebo opravu. Stačí nám napsat na: **[Tvůj e-mail]**.
          </p>
        </section>

      </div>
    </main>
  );
}