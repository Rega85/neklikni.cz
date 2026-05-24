import type { Metadata } from 'next'

// Wrapper jen kvůli metadata.robots — /databaze/hledat/page.tsx je client
// component a sám metadata exportovat nemůže. Vyhledávací stránka by neměla
// být v indexu (search výsledky obsahují maskované identifikátory subjektů).
export const metadata: Metadata = {
  title: 'Ověřit subjekt v databázi — Neklikni.cz',
  description:
    'Vlož telefon, e-mail, číslo účtu nebo Facebook profil a zjisti, zda byl subjekt nahlášen.',
  robots: { index: false, follow: false },
}

export default function HledatLayout({ children }: { children: React.ReactNode }) {
  return children
}
