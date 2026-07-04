/**
 * "Chci do žebříčku" úmysl, který musí přežít auth redirect (registrace
 * nebo přihlášení).
 *
 * Záměrně localStorage, NE sessionStorage: potvrzovací e-mail při
 * registraci se často otevírá v NOVÉ kartě, kde by sessionStorage byl
 * prázdný (je scoped na kartu). localStorage je scoped na origin, takže
 * přežije i tenhle běžný případ.
 *
 * Ukládáme jen seed + jméno/souhlasy, NIKDY odpovědi ani skóre — server
 * si skóre dopočítá/přečte sám (viz /api/test/join). Pokud krátkodobá
 * cache skóre pod seedem mezitím vyprší, /api/test/join vrátí 410 a
 * uživatel prostě zahraje kvíz znovu — férově, bez tahání starého
 * seedu přes zbytek auth flow.
 */

const KEY = "neklikni:quiz:pendingJoin";
const MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24h — i pro pomalé potvrzení e-mailem

export interface PendingJoin {
  seed: number;
  firstName: string;
  lastName: string;
  newsletterConsent: boolean;
  newsletterConsentVersion: string;
  savedAt: number;
}

export function savePendingJoin(data: Omit<PendingJoin, "savedAt">): void {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...data, savedAt: Date.now() }));
  } catch {
    // localStorage nedostupný (privátní režim apod.) — join po redirectu
    // prostě nevyjde, uživatel dostane fresh kvíz. Nic kritického.
  }
}

/** Přečte a hned smaže (spotřebuje napoprvé, žádné opakované pokusy). */
export function consumePendingJoin(): PendingJoin | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    localStorage.removeItem(KEY);
    const parsed = JSON.parse(raw) as PendingJoin;
    if (typeof parsed.seed !== "number" || Date.now() - parsed.savedAt > MAX_AGE_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}
