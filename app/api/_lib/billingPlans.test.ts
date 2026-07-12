import { describe, expect, it } from 'vitest'
import {
  FULL_TIER_CREDIT_CEILING,
  isPlanKey,
  resolveTierAndCredits,
  trialDisclosure,
  TRIAL_DAYS,
} from './billingPlans'

describe('resolveTierAndCredits', () => {
  it('oneshot na free tarifu: tarif -> oneshot, +1 kredit', () => {
    expect(resolveTierAndCredits('oneshot', 'free', 0)).toEqual({ tier: 'oneshot', credits: 1 })
  })

  it('oneshot s existujicimi kredity: pricita, tarif oneshot', () => {
    expect(resolveTierAndCredits('oneshot', 'oneshot', 3)).toEqual({ tier: 'oneshot', credits: 4 })
  })

  it('oneshot nakoupeny FULL predplatitelem nesnizuje ani nemeni FULL tarif', () => {
    expect(resolveTierAndCredits('oneshot', 'full', FULL_TIER_CREDIT_CEILING)).toEqual({
      tier: 'full',
      credits: FULL_TIER_CREDIT_CEILING,
    })
  })

  it('full_monthly vzdy nastavi tarif full a kredity na strop', () => {
    expect(resolveTierAndCredits('full_monthly', 'free', 0)).toEqual({
      tier: 'full',
      credits: FULL_TIER_CREDIT_CEILING,
    })
  })

  it('full_yearly ze stavajiciho oneshot tarifu take prepne na full se stropem', () => {
    expect(resolveTierAndCredits('full_yearly', 'oneshot', 2)).toEqual({
      tier: 'full',
      credits: FULL_TIER_CREDIT_CEILING,
    })
  })

  it('renewal (invoice.payment_succeeded) full tarifu resetuje na strop, ne pricita', () => {
    // Simulace: currentCredits uz je pod stropem po mesici pouzivani
    const result = resolveTierAndCredits('full_monthly', 'full', 42)
    expect(result.credits).toBe(FULL_TIER_CREDIT_CEILING)
  })
})

describe('isPlanKey', () => {
  it('rozezna platne plan klice', () => {
    expect(isPlanKey('oneshot')).toBe(true)
    expect(isPlanKey('full_monthly')).toBe(true)
    expect(isPlanKey('full_yearly')).toBe(true)
  })

  it('odmitne stare/neplatne klice (basic, pro, prazdny retezec)', () => {
    expect(isPlanKey('basic')).toBe(false)
    expect(isPlanKey('pro')).toBe(false)
    expect(isPlanKey('')).toBe(false)
  })
})

describe('trialDisclosure', () => {
  it('obsahuje 7 dni, castku, automaticke strhavani a zruseni jednim klikem', () => {
    const text = trialDisclosure('79 Kč/měsíc')
    expect(TRIAL_DAYS).toBe(7)
    expect(text).toContain('7 dní')
    expect(text).toContain('79 Kč/měsíc')
    expect(text).toContain('strhává se automaticky')
    expect(text).toContain('Zrušíte kdykoli jedním klikem')
  })

  it('funguje i pro rocni castku', () => {
    const text = trialDisclosure('790 Kč/rok')
    expect(text).toContain('790 Kč/rok')
  })
})
