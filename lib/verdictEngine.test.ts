import { describe, expect, it } from 'vitest'
import { buildVerdict, planChecks, type VerdictInput } from './verdictEngine'
import type { ParsedInput } from './inputParser'

const emptyParsed: ParsedInput = {
  urls: [],
  domains: [],
  emails: [],
  phones: [],
  bankAccounts: [],
  companyIds: [],
  freeText: '',
  inputKind: 'message',
}

function baseInput(overrides: Partial<VerdictInput>): VerdictInput {
  return {
    parsed: emptyParsed,
    database: null,
    ai: null,
    ...overrides,
  }
}

describe('buildVerdict', () => {
  it('ČOI shoda přebíjí i čistý AI výsledek (AI nesmí zmírnit tvrdou shodu)', () => {
    const verdict = buildVerdict(
      baseInput({
        database: {
          coi_matches: [
            {
              domain: 'eshop-xy.cz',
              reason: 'Nedodání zboží po platbě',
              category: 'nedodani',
              source: 'ČOI',
              source_url: null,
            },
          ],
          identifier_matches: [],
        },
        ai: {
          risk: 5,
          verdict: 'Zpráva vypadá v pořádku',
          analysis: 'Neobsahuje podezřelé prvky.',
          threats: [],
          recommendation: 'Není třeba nic dělat.',
        },
      }),
    )

    expect(verdict.level).toBe('red')
    expect(verdict.score).toBeGreaterThanOrEqual(80)
    expect(verdict.headline).toContain('ČOI')
    expect(verdict.sources.ai?.risk).toBe(5)
  })

  it('čistá databáze + AI risk 75 → level podle AI skóre (orange)', () => {
    const verdict = buildVerdict(
      baseInput({
        database: { coi_matches: [], identifier_matches: [] },
        ai: {
          risk: 75,
          verdict: 'Zpráva obsahuje podezřelé prvky',
          analysis: 'Naléhavost a neosobní oslovení.',
          threats: ['urgence'],
          recommendation: 'Buďte opatrní.',
        },
      }),
    )

    expect(verdict.level).toBe('orange')
    expect(verdict.score).toBe(75)
  })

  it('obojí čisté → green, headline bez slova "bezpečné"/"v pořádku"', () => {
    const verdict = buildVerdict(
      baseInput({
        database: { coi_matches: [], identifier_matches: [] },
        ai: {
          risk: 5,
          verdict: 'Zpráva vypadá v pořádku',
          analysis: 'Neobsahuje podezřelé prvky.',
          threats: [],
          recommendation: 'Není třeba nic dělat.',
        },
      }),
    )

    expect(verdict.level).toBe('green')
    expect(verdict.headline.toLowerCase()).not.toContain('bezpečné')
    expect(verdict.headline.toLowerCase()).not.toContain('v pořádku')
  })

  it('neověřené komunitní nahlášení → orange s formulací "komunitní nahlášení"', () => {
    const verdict = buildVerdict(
      baseInput({
        database: {
          coi_matches: [],
          identifier_matches: [
            {
              type: 'phone',
              value_masked: '+420 7** *** *56',
              verified: false,
              incident_count: 2,
              trust_score: 40,
            },
          ],
        },
        ai: null,
      }),
    )

    expect(verdict.level).toBe('orange')
    expect(verdict.headline).toContain('komunitním nahlášení')
    expect(verdict.headline).not.toMatch(/je to podvod/i)
  })

  it('databáze i AI null (defenzivní fallback) → green s nízkým skóre', () => {
    const verdict = buildVerdict(baseInput({}))

    expect(verdict.level).toBe('green')
    expect(verdict.score).toBeLessThan(40)
  })
})

describe('planChecks', () => {
  it('inputKind identifier: jen databáze, AI se neplánuje (a tedy nevolá)', () => {
    expect(planChecks('identifier')).toEqual({ checkDatabase: true, checkAi: false })
  })

  it('inputKind message: jen AI', () => {
    expect(planChecks('message')).toEqual({ checkDatabase: false, checkAi: true })
  })

  it('inputKind url/mixed: obojí paralelně', () => {
    expect(planChecks('url')).toEqual({ checkDatabase: true, checkAi: true })
    expect(planChecks('mixed')).toEqual({ checkDatabase: true, checkAi: true })
  })
})
