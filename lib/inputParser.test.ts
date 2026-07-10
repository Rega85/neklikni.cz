import { describe, expect, it } from 'vitest'
import { parseInput } from './inputParser'

describe('parseInput', () => {
  it('SMS s odkazem: inputKind mixed, doména vytažená', () => {
    const raw =
      'Vazeny zakazniku, vase zasilka ceka na potvrzeni adresy, jinak bude vracena odesilateli: http://ceska-posta-cz.info/potvrdit'
    const result = parseInput(raw)

    expect(result.inputKind).toBe('mixed')
    expect(result.domains).toEqual(['ceska-posta-cz.info'])
    expect(result.urls).toEqual(['http://ceska-posta-cz.info/potvrdit'])
  })

  it('holé telefonní číslo: inputKind identifier', () => {
    const result = parseInput('777 123 456')

    expect(result.phones).toEqual(['+420777123456'])
    expect(result.inputKind).toBe('identifier')
    expect(result.freeText).toBe('')
  })

  it('text s číslem účtu: bankAccounts', () => {
    const raw =
      'Pošlete prosím platbu na účet 123456789/0800, děkuji za pochopení a rychlé vyřízení'
    const result = parseInput(raw)

    expect(result.bankAccounts).toEqual(['123456789/0800'])
  })

  it('validní IČO (kontrolní součet) je v companyIds', () => {
    // 47114983 = Česká pošta, s.p. — ověřený kontrolní součet mod 11
    const result = parseInput('IČO 47114983')

    expect(result.companyIds).toEqual(['47114983'])
    expect(result.inputKind).toBe('identifier')
  })

  it('nevalidní IČO (chybný kontrolní součet) není v companyIds', () => {
    const result = parseInput('IČO 47114984')

    expect(result.companyIds).toEqual([])
  })

  it('e-shop URL s parametry: normalizovaná doména bez cesty/query', () => {
    const raw = 'https://www.Eshop-XY.cz/produkt/123?utm_source=fb&utm_medium=sms&ref=xyz'
    const result = parseInput(raw)

    expect(result.domains).toEqual(['eshop-xy.cz'])
    expect(result.urls).toEqual([raw])
    expect(result.inputKind).toBe('url')
  })

  it('text bez entit: inputKind message, freeText = celý vstup', () => {
    const raw = 'Ahoj, chci se zeptat, jak poznat podvodnou nabídku na sociální síti, díky moc'
    const result = parseInput(raw)

    expect(result.inputKind).toBe('message')
    expect(result.freeText).toBe(raw)
    expect(result.urls).toEqual([])
    expect(result.domains).toEqual([])
    expect(result.emails).toEqual([])
    expect(result.phones).toEqual([])
    expect(result.bankAccounts).toEqual([])
    expect(result.companyIds).toEqual([])
  })

  it('IBAN v textu je v bankAccounts', () => {
    const result = parseInput('Prosím pošlete platbu na LT98 3130 0101 7706 4564, díky')

    expect(result.bankAccounts).toEqual(['LT983130010177064564'])
  })

  it('kombinace URL + email + telefon bez volného textu: inputKind mixed', () => {
    const raw = 'https://eshop-xy.cz podpora@eshop-xy.cz 777123456'
    const result = parseInput(raw)

    expect(result.domains).toEqual(['eshop-xy.cz'])
    expect(result.emails).toEqual(['podpora@eshop-xy.cz'])
    expect(result.phones).toEqual(['+420777123456'])
    expect(result.inputKind).toBe('mixed')
  })

  it('prázdný vstup: message s prázdným freeText', () => {
    const result = parseInput('   ')

    expect(result.inputKind).toBe('message')
    expect(result.freeText).toBe('')
  })
})
