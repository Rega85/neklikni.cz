import { ShieldCheck, Lock, RotateCcw } from "lucide-react";
import Link from "next/link";
import CookieSettingsButton from "./CookieSettingsButton";
import BrandLogo from "./BrandLogo";
import SocialLinks from "./SocialLinks";

export default function Footer() {
  return (
    <footer className="w-full mt-auto border-t border-border/60 bg-card">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="flex flex-wrap justify-center gap-x-8 gap-y-3 text-xs text-muted-foreground mb-10">
          <span className="inline-flex items-center gap-1.5"><ShieldCheck size={14} className="text-success" /> 100% anonymní</span>
          <span className="inline-flex items-center gap-1.5"><Lock size={14} className="text-success" /> Zprávy se neukládají</span>
          <span className="inline-flex items-center gap-1.5"><RotateCcw size={14} className="text-success" /> Zrušit kdykoli</span>
        </div>

        <div className="grid gap-10 lg:grid-cols-[1.5fr_1fr_1fr_1fr]">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <BrandLogo size={28} />
              <span className="font-bold text-foreground tracking-tight text-base">
                NEKLIKNI<span className="brand-gradient-text">.CZ</span>
              </span>
            </div>
            <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
              AI bodyguard, který nikdy nespí. Prověř podezřelou zprávu, číslo
              nebo účet dřív, než bude pozdě.
            </p>
            <div className="pt-1">
              <p className="text-muted-foreground font-semibold mb-2 uppercase text-[10px] tracking-widest">Sleduj nás</p>
              <SocialLinks size={24} />
            </div>
          </div>

          <div>
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Produkt</h3>
            <ul className="space-y-2.5">
              <li><Link href="/databaze" className="text-sm text-foreground/80 transition-colors hover:text-primary">Databáze podvodů</Link></li>
              <li><Link href="/databaze/nahlasit" className="text-sm text-foreground/80 transition-colors hover:text-primary">Nahlásit podvod</Link></li>
              <li><Link href="/pricing" className="text-sm text-foreground/80 transition-colors hover:text-primary">Ceník</Link></li>
              <li><Link href="/" className="text-sm text-foreground/80 transition-colors hover:text-primary">Ověřit zprávu</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Informace</h3>
            <ul className="space-y-2.5">
              <li><Link href="/blog" className="text-sm text-foreground/80 transition-colors hover:text-primary">Blog</Link></li>
              <li><Link href="/gdpr" className="text-sm text-foreground/80 transition-colors hover:text-primary">Ochrana osobních údajů</Link></li>
              <li><Link href="/vop" className="text-sm text-foreground/80 transition-colors hover:text-primary">Obchodní podmínky</Link></li>
              <li><Link href="/cookies" className="text-sm text-foreground/80 transition-colors hover:text-primary">Cookies</Link></li>
              <li><CookieSettingsButton className="text-sm text-foreground/80 transition-colors hover:text-primary text-left" /></li>
            </ul>
          </div>

          <div>
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Kontakt</h3>
            <ul className="space-y-2.5 text-sm text-foreground/80 leading-relaxed">
              <li><Link href="/kontakt" className="transition-colors hover:text-primary">Napsat zprávu</Link></li>
              <li className="pt-2 text-xs text-muted-foreground leading-relaxed">
                PK Virgine, s.r.o.<br />
                IČO: 21448507, DIČ: CZ21448507<br />
                Korunní 2569/108, Vinohrady, 101 00 Praha<br />
                Datová schránka: bty8mey<br />
                Spisová značka: C 401405/MSPH Městský soud v Praze
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-4 border-t border-border/60 pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 NeKlikni.cz — PK Virgine, s.r.o. Všechna práva vyhrazena.</p>
          <p className="max-w-md leading-relaxed sm:text-right">
            Výsledky analýzy vygenerované umělou inteligencí mají informativní charakter. Technologie se může mýlit — poslední rozhodnutí je vždy na Vás.
          </p>
        </div>
      </div>
    </footer>
  );
}
