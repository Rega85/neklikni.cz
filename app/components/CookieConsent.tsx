"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem("cookie_consent")) {
      setVisible(true);
    }
  }, []);

  function accept() {
    localStorage.setItem("cookie_consent", "all");
    setVisible(false);
    // Informuj GaScript komponentu aby načetla GA4 bez page reload
    window.dispatchEvent(new Event("cookieConsentAccepted"));
  }

  function necessary() {
    localStorage.setItem("cookie_consent", "necessary");
    (window as any)["ga-disable-G-8C9GPC7C3J"] = true;
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-card backdrop-blur border-t border-border px-4 py-4">
      <div className="max-w-4xl mx-auto flex flex-col sm:flex-row sm:items-center gap-3">
        <p className="text-muted-foreground text-sm flex-1">
          Tento web používá cookies pro správné fungování a analýzu návštěvnosti. Podrobnosti najdete v našich{" "}
          <Link href="/cookies" className="text-primary hover:text-primary/80 underline underline-offset-2">
            zásadách cookies
          </Link>
          .
        </p>
        <div className="flex flex-col sm:flex-row gap-2 sm:shrink-0">
          <button
            onClick={necessary}
            className="w-full sm:w-auto px-4 py-2 text-xs font-black uppercase bg-secondary hover:bg-secondary/80 text-foreground rounded-lg transition-colors"
          >
            Pouze nezbytné
          </button>
          <button
            onClick={accept}
            className="w-full sm:w-auto px-4 py-2 text-xs font-black uppercase bg-primary hover:brightness-110 text-primary-foreground rounded-lg transition-colors"
          >
            Přijmout vše
          </button>
        </div>
      </div>
    </div>
  );
}
