import type { Metadata, Viewport } from "next"; // ✅ Přidán Viewport
import { Inter } from "next/font/google";
import "./globals.css";
import Header from "./components/Header";
import Footer from "./components/Footer";

const inter = Inter({ subsets: ["latin"] });

// ✅ Nastavení barev pro mobilní prohlížeče
export const viewport: Viewport = {
  themeColor: "#020617",
};

// ✅ SEO a Sociální sítě
export const metadata: Metadata = {
  title: "NeKlikni.cz | AI bodyguard pro tvůj klidný internet",
  description: "Prověřte si podezřelou zprávu, SMS nebo odkaz dřív, než na něj kliknete. AI analýza phishingu s modelem Sonnet 3.5.",
  metadataBase: new URL('https://www.neklikni.cz'),
  manifest: "/manifest.json", 
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
        url: '/og-image.png', 
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
  }
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="cs" className="selection:bg-purple-500/30">
      <body className={`${inter.className} bg-slate-950 text-white antialiased`}>
        {/* ✅ Fixní Header */}
        <Header />
        
        {children}

        {/* ✅ Vycentrovaný Footer */}
        <Footer />
      </body>
    </html>
  );
}