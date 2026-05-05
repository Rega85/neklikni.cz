// GA4 event tracking. Safe to call even before GA loads (no-op until consent).
// Called from anywhere with a stable event name and optional params.

type EventName =
  | "analyze_started"
  | "analyze_completed"
  | "analyze_limit_reached"
  | "cta_pricing_clicked"
  | "cta_upgrade_clicked"
  | "cta_share_clicked"
  | "cta_pdf_download"
  | "checkout_started"
  | "lead_magnet_submitted"
  | "example_clicked";

type EventParams = Record<string, string | number | boolean | undefined>;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export function trackEvent(name: EventName, params: EventParams = {}) {
  if (typeof window === "undefined") return;
  // GA4 will pick this up via dataLayer; if user hasn't consented to cookies,
  // GaScript hasn't injected gtag.js, so the event simply queues in dataLayer
  // (and is ignored until / unless GA loads).
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event: name, ...params });
  if (typeof window.gtag === "function") {
    window.gtag("event", name, params);
  }
}
