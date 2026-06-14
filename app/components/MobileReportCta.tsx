"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Flag } from "lucide-react";

/**
 * Sticky "Nahlásit podvod" CTA pro mobil (<768px).
 * Skryté na /databaze/nahlasit (uživatel je už tam) a na desktopu,
 * kde je akce dostupná v hlavní navigaci.
 */
export default function MobileReportCta() {
  const pathname = usePathname();
  if (pathname.startsWith("/databaze/nahlasit")) return null;

  return (
    <>
      {/* Spacer, aby sticky bar nezakrýval patičku/poslední sekci */}
      <div
        className="h-20 sm:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        aria-hidden="true"
      />

      <div className="sm:hidden fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur px-4 pt-2.5 pb-[calc(0.625rem+env(safe-area-inset-bottom))]">
        <Link
          href="/databaze/nahlasit"
          className="flex items-center justify-center gap-2 w-full rounded-xl border border-primary/40 bg-primary/10 py-3 text-sm font-semibold text-primary transition active:scale-[0.98]"
        >
          <Flag size={16} aria-hidden="true" />
          Nahlásit podvod
        </Link>
      </div>
    </>
  );
}
