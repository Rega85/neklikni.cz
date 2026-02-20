import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Header from "./components/Header";
import Footer from "./components/Footer";

const inter = Inter({ subsets: ["latin"] });

// ✅ SEO a Sociální sítě: Tohle prodává PK Virgine, s.r.o. navenek
export const metadata: Metadata = {
  title: "NeKlikni.cz | AI bodyguard pro tvůj klidný internet",
  description: "Prověřte si podezřelou zprávu, SMS nebo odkaz dřív, než na něj kliknete. AI analýza phishingu s modelem Sonnet 3.5.",
  metadataBase: new URL('https://neklikni.cz'),
  manifest: "/manifest.json", // Propojení "mobilní aplikace"
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: "NeKlikni.cz | AI bodyguard",
    description: "Analýza podvodných zpráv v reálném čase. Chraňte své peníze i data.",
    url: 'https://neklikni.cz',
    siteName: 'NeKlikni.cz',
    locale: 'cs_CZ',
    type: 'website',
    images: [
      {
        url: '/og-image.png', // ✅ Nezapomeň tento obrázek nahrát do složky /public
        width: 1200,
        height: 630,
        alt: 'NeKlikni.cz Analysis Preview',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'NeKlikni.cz | AI bodyguard',
    description: 'Prověřte si podezřelou zprávu dřív, než na ni kliknete.',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
  },
  themeColor: "#020617", // ✅ Ladí s tvým tmavým pozadím
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="cs" className="selection:bg-purple-500/30">
      <body className={`${inter.className} bg-slate-950 text-white antialiased`}>
        {/* ✅ Fixní Header s navigací a kredity */}
        <Header />
        
        {/* Hlavní obsah stránky */}
        {children}

        {/* ✅ Vycentrovaný Footer s právním štítem */}
        <Footer />
      </body>
    </html>
  );
}