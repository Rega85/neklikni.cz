import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Header from "@/app/components/header";
import Footer from "@/app/components/Footer"; // ✅ Přidán import patičky

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "NeKlikni.cz",
  description: "AI bodyguard pro tvůj klidný internet.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="cs">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-slate-950 text-white flex flex-col min-h-screen`}>
        <Header />
        
        {/* Hlavní obsah, který vytlačuje patičku dolů */}
        <div className="pt-20 flex-grow">
          {children}
        </div>

        {/* ✅ Patička se zobrazí na všech stránkách */}
        <Footer />
      </body>
    </html>
  );
}