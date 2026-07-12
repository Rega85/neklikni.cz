/**
 * Sdílená čistá logika nového ceníku (Free / Jednorázová 49 Kč / Full
 * 79 Kč měsíčně nebo 790 Kč ročně, 7denní trial u obou Full variant).
 * Žádné I/O — používá ji /api/checkout (vytvoření session) i
 * /api/webhook (zpracování eventů), plus /pricing a LimitReachedCard
 * pro právní text u trialu. Testovatelné bez Stripe/DB.
 *
 * Starý ceník (BASIC 99 Kč, PRO 199 Kč) měl k datu přechodu 0 aktivních
 * předplatitelů — kompletně nahrazen, ne migrován.
 */

export type PlanKey = "oneshot" | "full_monthly" | "full_yearly";

export const TRIAL_DAYS = 7;

// TEMPORARY (do Fáze 4): FULL je koncepčně neomezený (fair use), ne
// kreditový — ale /api/analyze (starý, dosud živý endpoint) pořád gatuje
// přes credits_remaining. Než Fáze 4 zruší /api/analyze (nahrazen
// /api/check, který kredity vůbec nepoužívá), dáváme FULL tarifu prakticky
// nevyčerpatelný kreditový strop místo přepisování živé odečítací logiky.
// Až /api/analyze zmizí, FULL_TIER_CREDIT_CEILING a jeho použití ve
// webhooku jde pryč beze zbytku.
export const FULL_TIER_CREDIT_CEILING = 100_000;

export interface PlanConfig {
  /** Název env proměnné s reálným Stripe Price ID (viz .env.local / Vercel). */
  envVar: string;
  mode: "payment" | "subscription";
  trialDays?: number;
}

export const PLAN_CONFIG: Record<PlanKey, PlanConfig> = {
  oneshot: { envVar: "STRIPE_PRICE_ONESHOT", mode: "payment" },
  full_monthly: { envVar: "STRIPE_PRICE_FULL_MONTHLY", mode: "subscription", trialDays: TRIAL_DAYS },
  full_yearly: { envVar: "STRIPE_PRICE_FULL_YEARLY", mode: "subscription", trialDays: TRIAL_DAYS },
};

export function isPlanKey(value: string): value is PlanKey {
  return value === "oneshot" || value === "full_monthly" || value === "full_yearly";
}

export interface TierCreditsResolution {
  tier: string;
  credits: number;
}

/**
 * Rozhodne nový tarif + kredity po úspěšném checkoutu.
 *
 * - oneshot: +1 kredit. Pokud je uživatel už na FULL, tarif zůstává FULL
 *   (jednorázový nákup navíc FULL nesnižuje ani nemění — je to zbytečný,
 *   ale neškodný nákup).
 * - full_monthly / full_yearly: tarif FULL, kredity na strop (viz
 *   FULL_TIER_CREDIT_CEILING výše) — nepřičítá se, resetuje se, ať
 *   opakované renewaly nerostou donekonečna.
 */
export function resolveTierAndCredits(
  plan: PlanKey,
  currentTier: string | null | undefined,
  currentCredits: number,
): TierCreditsResolution {
  if (plan === "oneshot") {
    if (currentTier === "full") {
      return { tier: "full", credits: currentCredits };
    }
    return { tier: "oneshot", credits: (currentCredits || 0) + 1 };
  }
  // full_monthly | full_yearly
  return { tier: "full", credits: FULL_TIER_CREDIT_CEILING };
}

/**
 * Právní minimum u trial checkoutu — MUSÍ být viditelné přímo u
 * tlačítka (ne jen ve VOP), tučně částka a automatické strhávání.
 * Jedna sdílená funkce použitá na /pricing i v LimitReachedCard, ať se
 * text nikdy nerozejde.
 *
 * @example
 *   trialDisclosure('79 Kč/měsíc')
 *   // 'Prvních 7 dní zdarma. Poté 79 Kč/měsíc, strhává se automaticky.
 *   //  Zrušíte kdykoli jedním klikem.'
 */
export function trialDisclosure(priceLabel: string): string {
  return `Prvních ${TRIAL_DAYS} dní zdarma. Poté ${priceLabel}, strhává se automaticky. Zrušíte kdykoli jedním klikem.`;
}
