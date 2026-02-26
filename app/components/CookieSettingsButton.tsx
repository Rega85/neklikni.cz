"use client";

export default function CookieSettingsButton({ className }: { className?: string }) {
  function reset() {
    localStorage.removeItem("cookie_consent");
    // Okamžitě zastav GA4 tracking pro tuto session
    (window as any)["ga-disable-G-8C9GPC7C3J"] = true;
    // Reload = banner se znovu zobrazí, GaScript znovu zkontroluje souhlas
    window.location.reload();
  }

  return (
    <button type="button" onClick={reset} className={className}>
      Nastavení cookies
    </button>
  );
}
