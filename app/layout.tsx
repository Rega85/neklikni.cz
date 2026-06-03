import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ReactNode } from "react";
import Header from "./components/Header";
import Footer from "./components/Footer";
import CookieConsent from "./components/CookieConsent";
import GaScript from "./components/GaScript";

const inter = Inter({ subsets: ["latin", "latin-ext"] });

export const viewport: Viewport = {
  themeColor: "#020617",
};

export const metadata: Metadata = {
  title: "NeKlikni.cz | AI bodyguard pro tvůj klidný internet",
  description: "Prověřte si podezřelou zprávu, SMS nebo odkaz dřív, než na něj kliknete. AI analýza phishingu s modelem Sonnet 3.5.",
  metadataBase: new URL('https://www.neklikni.cz'),
  manifest: "/manifest.json",
  openGraph: {
    title: "NeKlikni.cz — ověř, než klikneš",
    description: "Vlož podezřelou SMS, e-mail nebo prodejce a hned víš, jestli jde o podvod. Zdarma, anonymně, za 10 sekund.",
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
    title: "NeKlikni.cz — ověř, než klikneš",
    description: "Vlož podezřelou SMS, e-mail nebo prodejce a hned víš, jestli jde o podvod. Zdarma, anonymně, za 10 sekund.",
    images: ['/og-image.png'],
  },
  alternates: {
    canonical: "https://neklikni.cz",
  },
  robots: {
    index: true,
    follow: true,
  },
  appleWebApp: {
    capable: true,
    title: "NeKlikni",
    statusBarStyle: "black-translucent",
  },
  icons: {
    apple: "/icon-192.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="cs" className="selection:bg-purple-500/30">
      <body className={`${inter.className} bg-slate-950 text-white antialiased`}>
        <div className="bg-blobs" aria-hidden="true" />
        <GaScript />
        <Header />
        {children}
        <Footer />
        <CookieConsent />
      </body>
    </html>
  );
}
