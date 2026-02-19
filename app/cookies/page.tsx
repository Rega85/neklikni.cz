export default function CookiesPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white py-32 px-6">
      <div className="max-w-3xl mx-auto space-y-10">

        <div>
          <h1 className="text-4xl font-black tracking-tighter mb-2">Zásady cookies</h1>
          <p className="text-slate-500 text-sm">Platné od 1. ledna 2025</p>
        </div>

        <section className="space-y-4">
          <h2 className="text-xl font-bold text-purple-400">Co jsou cookies?</h2>
          <p className="text-slate-300 leading-relaxed">
            Cookies jsou malé textové soubory ukládané do vašeho prohlížeče při návštěvě webových stránek. 
            Pomáhají nám zajistit správnou funkčnost služby a zlepšovat uživatelský zážitek.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-bold text-purple-400">Jaké cookies používáme?</h2>
          
          <div className="space-y-4">
            <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl">
              <h3 className="font-bold text-white mb-2">Nezbytné cookies</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Tyto cookies jsou nutné pro fungování služby. Zahrnují autentizační tokeny 
                (Supabase session) potřebné pro přihlášení a uchování vašeho uživatelského stavu. 
                Bez těchto cookies nelze službu používat.
              </p>
            </div>

            <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl">
              <h3 className="font-bold text-white mb-2">Funkční cookies</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Ukládají vaše preference (např. zvolený jazyk nebo tarif) pro lepší uživatelský zážitek 
                při opakovaných návštěvách.
              </p>
            </div>

            <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl">
              <h3 className="font-bold text-white mb-2">Platební cookies</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Při platbě používáme platební bránu Stripe, která může ukládat vlastní cookies 
                nezbytné pro bezpečné zpracování platby. Tyto cookies se řídí zásadami ochrany 
                osobních údajů společnosti Stripe (stripe.com).
              </p>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-bold text-purple-400">Cookies třetích stran</h2>
          <p className="text-slate-300 leading-relaxed">
            Služba využívá následující třetí strany, které mohou ukládat vlastní cookies:
          </p>
          <ul className="space-y-2 text-slate-400 text-sm">
            <li className="flex gap-2"><span className="text-purple-400">→</span> <strong className="text-white">Supabase</strong> – autentizace a databáze uživatelů</li>
            <li className="flex gap-2"><span className="text-purple-400">→</span> <strong className="text-white">Stripe</strong> – zpracování plateb</li>
            <li className="flex gap-2"><span className="text-purple-400">→</span> <strong className="text-white">Vercel</strong> – hosting a analytika</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-bold text-purple-400">Jak spravovat cookies?</h2>
          <p className="text-slate-300 leading-relaxed">
            Cookies můžete spravovat nebo zakázat v nastavení vašeho prohlížeče. Upozorňujeme, 
            že zakázání nezbytných cookies může způsobit nefunkčnost přihlášení a dalších funkcí služby.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-bold text-purple-400">Kontakt</h2>
          <p className="text-slate-300 leading-relaxed">
            PK Virgine, s.r.o.<br />
            Korunní 2569/108, Vinohrady, 101 00 Praha<br />
            IČO: 21448507<br />
            Datová schránka: bty8mey<br />
            E-mail: info@neklikni.cz
          </p>
        </section>

      </div>
    </main>
  );
}