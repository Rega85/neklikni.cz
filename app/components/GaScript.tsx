"use client";

import { useEffect, useState } from "react";
import Script from "next/script";

const GA_ID = "G-8C9GPC7C3J";

export default function GaScript() {
  const [consented, setConsented] = useState(false);

  useEffect(() => {
    // Zkontroluj souhlas při mount
    if (localStorage.getItem("cookie_consent") === "all") {
      setConsented(true);
    }

    // Poslechni event z CookieConsent banneru (uživatel právě přijal)
    const handler = () => setConsented(true);
    window.addEventListener("cookieConsentAccepted", handler);
    return () => window.removeEventListener("cookieConsentAccepted", handler);
  }, []);

  if (!consented) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        strategy="afterInteractive"
      />
      <Script id="gtag-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_ID}');
        `}
      </Script>
    </>
  );
}
