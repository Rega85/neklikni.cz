import type { NextConfig } from "next";

const securityHeaders = [
  // M-1: HSTS — brání SSL stripping při prvním připojení
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains",
  },

  // X-Frame-Options zůstává jako belt-and-suspenders (starší prohlížeče)
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },

  // L-1: X-XSS-Protection odstraněn — deprecated, Chrome/Firefox ignoruje,
  // v IE 11 může způsobit problémy. CSP níže je správná náhrada.

  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },

  // M-2: Content-Security-Policy — REPORT-ONLY fáze
  //
  // Proč Report-Only nejdřív:
  //   Striktní CSP může rozbít Next.js hydration, Stripe Elements nebo GA
  //   inline scripty. Report-Only zaloguje porušení do konzole a na reporting
  //   endpoint BEZ blokování. Až v konzoli uvidíš 0 nových violation zpráv
  //   (typicky pár dní monitoringu), přejmenuj klíč na
  //   "Content-Security-Policy" pro plné vynucení.
  //
  // Proč 'unsafe-inline' v script-src:
  //   Next.js App Router vkládá inline skripty pro hydration, GA gtag-init
  //   (strategy="afterInteractive") je také inline. Odstranění 'unsafe-inline'
  //   vyžaduje implementaci nonce-based CSP (Next.js 14 to podporuje, ale je
  //   to samostatná refaktorizace).
  {
    key: "Content-Security-Policy-Report-Only",
    value: [
      "default-src 'self'",

      // Next.js hydration + GA gtag inline script
      "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com",

      // Tailwind utility classes aplikované přes style attribute
      "style-src 'self' 'unsafe-inline'",

      // Obrázky: local, data URIs, blob (canvas), Supabase storage
      "img-src 'self' data: blob: https://*.supabase.co",

      // API volání: Supabase REST + Realtime WS, Stripe, GA, Vercel vitals
      [
        "connect-src 'self'",
        "https://*.supabase.co",
        "wss://*.supabase.co",
        "https://api.stripe.com",
        "https://www.google-analytics.com",
        "https://region1.google-analytics.com",
        "https://analytics.google.com",
        "https://www.googletagmanager.com",
        "https://vitals.vercel-insights.com",
        "https://vitals.vercel-analytics.com",
      ].join(" "),

      // Stripe Elements / Stripe.js iframy
      "frame-src https://js.stripe.com https://hooks.stripe.com",

      "font-src 'self' data:",

      // Blokovat <object>, <embed>, <applet>
      "object-src 'none'",

      // Zabrání base-tag hijackingu
      "base-uri 'self'",

      // Form submit jen na vlastní origin + Stripe checkout
      "form-action 'self' https://checkout.stripe.com",

      // Belt-and-suspenders k X-Frame-Options
      "frame-ancestors 'none'",

      // Automaticky upgradovat http:// requesty na https:// (na produkci)
      "upgrade-insecure-requests",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
