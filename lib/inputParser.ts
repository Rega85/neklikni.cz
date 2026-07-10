/**
 * Univerzální parser vstupu (Fáze 1 sjednoceného vstupu).
 *
 * Z libovolného textu (SMS, zpráva, odkaz, holý identifikátor) vytáhne
 * strukturované entity — URL, domény, e-maily, telefony, čísla účtů,
 * IČO — a zbytek jako volný text.
 *
 * Extrakční regexy pro e-mail/účet/telefon a jejich normalizace jsou
 * sdílené s app/api/databaze/_lib/crossReference.ts a
 * utils/databaze/identifiers.ts — žádná logika se nezdvojuje.
 *
 * Zatím se nikde nevolá — příprava na sjednocený vstupní formulář.
 */

import { EMAIL_RE, ACCOUNT_RE, PHONE_RE } from '@/app/api/databaze/_lib/crossReference'
import {
  normalizeAccount,
  normalizeEmail,
  normalizeIban,
  normalizePhone,
  normalizeWebsite,
} from '@/utils/databaze/identifiers'

export type InputKind = 'message' | 'identifier' | 'url' | 'mixed'

export interface ParsedInput {
  urls: string[]
  domains: string[]
  emails: string[]
  phones: string[]
  bankAccounts: string[]
  companyIds: string[]
  freeText: string
  inputKind: InputKind
}

// URL s protokolem — plný odkaz vč. cesty a query.
const URL_RE = /\bhttps?:\/\/[^\s<>"')\]]+/gi

// Holá doména v textu (bez protokolu), volitelně s cestou —
// např. "eshop-xy.cz" nebo "www.eshop-xy.cz/produkt". Záměrně bez
// omezení na písmennou TLD v samotném regexu (kandidát), platnost tvaru
// ověřuje až normalizeWebsite() přes extractHostname — ať se pravidlo
// "co je platná doména" nevede na dvou místech.
const BARE_DOMAIN_RE =
  /\b(?:www\.)?[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+(?:\/\S*)?/gi

// IBAN v textu — 2 písmena země + 2 kontrolní číslice + 2-7 skupin po
// (volitelně mezerou oddělených) 4 alfanumerických znacích, jak IBAN
// běžně zapisují lidé. normalizeIban() mezery sama odstraňuje.
const IBAN_RE = /\b[A-Za-z]{2}\d{2}(?:[ ]?[A-Za-z0-9]{4}){2,7}\b/g

// IČO kandidát — přesně 8 číslic ohraničených word-boundary.
const ICO_RE = /\b\d{8}\b/g

/**
 * Validuje české IČO kontrolním součtem modulo 11 (algoritmus ARES).
 * Váhy 8..2 pro první 7 číslic, kontrolní číslice na 8. pozici.
 */
function isValidIco(digits: string): boolean {
  if (!/^\d{8}$/.test(digits)) return false
  const d = digits.split('').map(Number)
  let sum = 0
  for (let i = 0; i < 7; i++) {
    sum += d[i] * (8 - i)
  }
  const remainder = sum % 11
  const check = remainder === 0 ? 1 : remainder === 1 ? 0 : 11 - remainder
  return check === d[7]
}

function stripTrailingPunctuation(value: string): string {
  return value.replace(/[.,;:!?)\]'"]+$/, '')
}

function collapseWhitespace(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}

/**
 * Vytáhne hostname z plné URL (přes protokol) nebo z holé domény
 * (odřízne cestu/query před tečkou) a předá do normalizeWebsite() pro
 * lowercase/www-strip/validaci tvaru.
 */
function extractHostname(candidate: string): string | null {
  const trimmed = stripTrailingPunctuation(candidate)
  let hostname: string
  if (/^https?:\/\//i.test(trimmed)) {
    try {
      hostname = new URL(trimmed).hostname
    } catch {
      return null
    }
  } else {
    hostname = trimmed.split(/[/?#]/)[0]
  }
  return normalizeWebsite(hostname)
}

/**
 * Heuristika pro klasifikaci vstupu — stejný práh jako
 * looksLikeFullMessage() v utils/databaze/identifiers.ts (60+ znaků
 * nebo 8+ slov = plnohodnotná zpráva, ne jen zbytkové oddělovače).
 */
function isMeaningfulFreeText(text: string): boolean {
  const t = text.trim()
  if (t === '') return false
  return t.length > 60 || t.split(/\s+/).length > 8
}

/**
 * Rozebere libovolný vstupní text na strukturované entity + zbytek
 * volného textu. Pořadí extrakce (URL → email → holá doména → IBAN →
 * účet → telefon → IČO) brání tomu, aby si regexy navzájem
 * "ukrajovaly" shody (stejný princip jako extractIdentifiers()
 * v crossReference.ts).
 */
export function parseInput(raw: string): ParsedInput {
  if (typeof raw !== 'string' || raw.trim() === '') {
    return {
      urls: [],
      domains: [],
      emails: [],
      phones: [],
      bankAccounts: [],
      companyIds: [],
      freeText: '',
      inputKind: 'message',
    }
  }

  const urls = new Set<string>()
  const domains = new Set<string>()
  const emails = new Set<string>()
  const phones = new Set<string>()
  const bankAccounts = new Set<string>()
  const companyIds = new Set<string>()

  let work = raw

  work = work.replace(URL_RE, (match) => {
    const url = stripTrailingPunctuation(match)
    urls.add(url)
    const hostname = extractHostname(url)
    if (hostname) domains.add(hostname)
    return ' '
  })

  work = work.replace(EMAIL_RE, (match) => {
    const email = normalizeEmail(match)
    if (email) emails.add(email)
    return ' '
  })

  work = work.replace(BARE_DOMAIN_RE, (match) => {
    const hostname = extractHostname(match)
    if (!hostname) return match
    domains.add(hostname)
    return ' '
  })

  work = work.replace(IBAN_RE, (match) => {
    const iban = normalizeIban(match)
    if (!iban) return match
    bankAccounts.add(iban)
    return ' '
  })

  work = work.replace(ACCOUNT_RE, (match) => {
    const account = normalizeAccount(match)
    if (!account) return match
    bankAccounts.add(account)
    return ' '
  })

  work = work.replace(PHONE_RE, (match) => {
    const phone = normalizePhone(match)
    if (!phone) return match
    phones.add(phone)
    return ' '
  })

  work = work.replace(ICO_RE, (match) => {
    if (!isValidIco(match)) return match
    companyIds.add(match)
    return ' '
  })

  const freeText = collapseWhitespace(work)

  const hasUrlEntities = urls.size > 0 || domains.size > 0
  const hasIdentifierEntities =
    emails.size > 0 || phones.size > 0 || bankAccounts.size > 0 || companyIds.size > 0
  const hasEntities = hasUrlEntities || hasIdentifierEntities
  const hasMeaningfulText = isMeaningfulFreeText(freeText)

  let inputKind: InputKind
  if (!hasEntities) {
    inputKind = 'message'
  } else if (hasMeaningfulText || (hasUrlEntities && hasIdentifierEntities)) {
    inputKind = 'mixed'
  } else if (hasUrlEntities) {
    inputKind = 'url'
  } else {
    inputKind = 'identifier'
  }

  return {
    urls: [...urls],
    domains: [...domains],
    emails: [...emails],
    phones: [...phones],
    bankAccounts: [...bankAccounts],
    companyIds: [...companyIds],
    freeText,
    inputKind,
  }
}
