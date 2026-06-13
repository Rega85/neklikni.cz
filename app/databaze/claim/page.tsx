/**
 * /databaze/claim — Placeholder pro "Toto je o mně, chci se vyjádřit".
 *
 * Server component, public (žádný auth check).
 *
 * Plná self-service claim funkce přijde později. Tato stránka existuje,
 * aby dotčená osoba (GDPR čl. 15-16) měla aspoň cestu, jak reagovat na
 * záznam o sobě — místo 404. Směruje na kontaktní email / formulář.
 */

import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, Mail, Scale } from 'lucide-react'
import PageHero from '@/app/components/PageHero'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Chci se vyjádřit k záznamu — Neklikni.cz',
  description:
    'Pokud je o tobě záznam v databázi nahlášených incidentů, máš právo se vyjádřit, požádat o opravu nebo stažení.',
  robots: { index: false, follow: false },
}

const CONTACT_EMAIL = 'info@neklikni.cz'
const MAILTO_SUBJECT = 'Vyjádření k záznamu v databázi'
const MAILTO_BODY =
  'Dobrý den,\n\nv databázi nahlášených incidentů na Neklikni.cz je veden záznam, který se mě týká. Chci se k němu vyjádřit / požádat o opravu / stažení.\n\nIdentifikátor (telefon / e-mail / číslo účtu / jiné):\n\nDůvod / vyjádření:\n\nDěkuji,\n'

export default function ClaimPage() {
  const mailtoHref = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(
    MAILTO_SUBJECT,
  )}&body=${encodeURIComponent(MAILTO_BODY)}`

  return (
    <main className="min-h-screen">
      <PageHero
        tag="Právo na vyjádření"
        title="Chci se vyjádřit"
        highlight="k záznamu"
        description="Pokud je o tobě veden záznam v databázi nahlášených incidentů, máš právo se k němu vyjádřit, požádat o opravu nebo stažení."
      />
      <div className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
        <section className="mb-6 rounded-2xl border border-border bg-card p-6 backdrop-blur-sm sm:p-8">
          <h2 className="mb-3 text-lg font-semibold text-foreground">
            Self-service formulář se připravuje
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Pracujeme na interaktivním procesu, kterým bude možné záznam
            ověřit přes vlastnictví identifikátoru (telefon / e-mail / účet)
            a přidat veřejné vyjádření. Než bude hotový, můžeš se ozvat
            přímo nám — vyřídíme to ručně.
          </p>
        </section>

        <section className="mb-6 rounded-2xl border border-primary/30 bg-primary/5 p-6 backdrop-blur-sm sm:p-8">
          <div className="mb-4 flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2">
              <Mail size={20} className="text-primary" aria-hidden="true" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">
              Jak nás kontaktovat
            </h2>
          </div>
          <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
            Napiš nám na{' '}
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="font-medium text-primary underline-offset-2 hover:underline"
            >
              {CONTACT_EMAIL}
            </a>
            . Do zprávy uveď identifikátor (např. poslední 4 číslice
            telefonu / účtu nebo doménu e-mailu), kterého se záznam týká,
            a co chceš upravit nebo doplnit. Ověříme vlastnictví a do 14
            dnů ti odpovíme.
          </p>
          <div className="flex flex-wrap gap-3">
            <a
              href={mailtoHref}
              className="bg-primary hover:brightness-110 text-primary-foreground inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold transition"
            >
              <Mail size={16} aria-hidden="true" />
              Napsat e-mail
            </a>
            <Link
              href="/kontakt"
              className="inline-flex items-center gap-2 rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-muted-foreground transition hover:bg-secondary"
            >
              Kontaktní formulář
            </Link>
          </div>
        </section>

        <section className="mb-8 rounded-xl border border-border bg-card p-4">
          <div className="flex items-start gap-3">
            <Scale
              size={16}
              className="mt-0.5 flex-shrink-0 text-muted-foreground"
              aria-hidden="true"
            />
            <div className="space-y-2 text-xs leading-relaxed text-muted-foreground">
              <p>
                <strong className="text-foreground">Tvoje práva.</strong>{' '}
                Podle GDPR (čl. 15 — právo na přístup, čl. 16 — právo na
                opravu) máš nárok zjistit, jaké údaje o tobě zpracováváme,
                a požadovat jejich opravu, pokud jsou nepřesné. Záznam
                v databázi je nahlášení od třetí strany — nejde o úřední
                ani soudní rozhodnutí, takže máš plné právo se vyjádřit.
              </p>
              <p>
                Pro identifikaci budeme potřebovat ověřit, že identifikátor
                (telefon / e-mail / účet) skutečně patří tobě. Bez ověření
                záznam neupravíme, aby se nedalo zneužít.
              </p>
            </div>
          </div>
        </section>

        <div className="text-center">
          <Link
            href="/databaze"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground"
          >
            <ArrowLeft size={14} aria-hidden="true" />
            Zpět na databázi
          </Link>
        </div>
      </div>
    </main>
  )
}
