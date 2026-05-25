/**
 * Utility helpers pro modul databáze nahlášení (/databaze).
 *
 * Normalizace, hashování a maskování identifikátorů (telefon, číslo
 * účtu, e-mail, FB URL, variabilní symbol).
 *
 * Návaznost: docs/SPEC.md sekce 4 (datový model) a sekce 6 (UI).
 * Pravidla maskování: docs/SPEC.md sekce 6.3 — všechny veřejné views
 * zobrazují maskované hodnoty, plné jen autorizovaným rolím.
 *
 * Žádné externí dependencies — používáme jen Web Crypto API.
 */

export type IdentifierType =
  | 'phone'
  | 'account'
  | 'email'
  | 'facebook_url'
  | 'var_symbol'
  | 'other'


/**
 * Normalizuje české telefonní číslo do kanonického tvaru `+420XXXXXXXXX`.
 *
 * Akceptuje: "777123456", "+420 777 123 456", "777 123 456",
 * "+420777123456", "00420777123456".
 *
 * @example
 *   normalizePhone('777 123 456')      // '+420777123456'
 *   normalizePhone('+420 777 123 456') // '+420777123456'
 *   normalizePhone('00420777123456')   // '+420777123456'
 *   normalizePhone('123')              // null
 */
export function normalizePhone(raw: string): string | null {
  if (typeof raw !== 'string') return null

  // Strip all whitespace, dashes, parens, dots
  const cleaned = raw.replace(/[\s\-().]/g, '')

  // Strip country code prefix
  let digits: string
  if (cleaned.startsWith('+420')) {
    digits = cleaned.slice(4)
  } else if (cleaned.startsWith('00420')) {
    digits = cleaned.slice(5)
  } else if (cleaned.startsWith('420') && cleaned.length === 12) {
    digits = cleaned.slice(3)
  } else if (cleaned.startsWith('+')) {
    // Cizí číslo — pro MVP nepodporujeme
    return null
  } else {
    digits = cleaned
  }

  // Musí být přesně 9 cifer, jen číslice
  if (!/^\d{9}$/.test(digits)) return null

  return `+420${digits}`
}


/**
 * Detekuje a normalizuje IBAN (mezinárodní formát čísla účtu).
 *
 * IBAN má 2 písmena ISO země + 2 kontrolní číslice + 11-30 alfanumerických
 * znaků (celková délka 15-34). Normalizace: strip mezer, uppercase.
 *
 * Příklady: `LT983130010177064564` (Revolut LT),
 * `CZ6508000000192000145399` (Česká spořitelna CZ),
 * `DE89370400440532013000` (DE).
 *
 * Nepoužíváme úplnou MOD-97 validaci — pro účely lookup-key stačí formát.
 *
 * @example
 *   normalizeIban('LT98 3130 0101 7706 4564') // 'LT983130010177064564'
 *   normalizeIban('cz6508000000192000145399') // 'CZ6508000000192000145399'
 *   normalizeIban('12345/0100')               // null  (česky účet, viz normalizeAccount)
 *   normalizeIban('abc')                      // null
 */
export function normalizeIban(raw: string): string | null {
  if (typeof raw !== 'string') return null
  const cleaned = raw.replace(/\s/g, '').toUpperCase()
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(cleaned)) return null
  return cleaned
}


/**
 * Vrátí true, pokud (potenciálně maskovaný) string vypadá jako IBAN —
 * tj. začíná 2 písmeny + 2 čísly. Použité pro výběr labelu při zobrazení.
 */
export function looksLikeIban(value: string): boolean {
  return typeof value === 'string' && /^[A-Z]{2}\d{2}/.test(value)
}


/**
 * Normalizuje české číslo účtu do tvaru `[prefix-]number/bank`.
 *
 * Akceptuje: "12345/0100", "12345-6789/0100", "0000-12345/0100".
 * Prefix: 0-6 cifer (volitelný). Number: 1-10 cifer. Bank kód: 4 cifry.
 *
 * @example
 *   normalizeAccount('12345/0100')        // '12345/0100'
 *   normalizeAccount('0000-12345/0100')   // '0000-12345/0100'
 *   normalizeAccount('12345-6789/0100')   // '12345-6789/0100'
 *   normalizeAccount('invalid')           // null
 */
export function normalizeAccount(raw: string): string | null {
  if (typeof raw !== 'string') return null

  // Strip whitespace
  const cleaned = raw.replace(/\s/g, '')

  const match = cleaned.match(/^(?:(\d{1,6})-)?(\d{1,10})\/(\d{4})$/)
  if (!match) return null

  const [, prefix, number, bank] = match

  if (prefix) {
    return `${prefix}-${number}/${bank}`
  }
  return `${number}/${bank}`
}


/**
 * Normalizuje e-mailovou adresu (lowercase, trim, validace formátu).
 *
 * Používá zjednodušený regex (ne RFC 5322 úplný) pro praktické použití.
 *
 * @example
 *   normalizeEmail('  Pavel@Example.CZ ')  // 'pavel@example.cz'
 *   normalizeEmail('not-an-email')         // null
 */
export function normalizeEmail(raw: string): string | null {
  if (typeof raw !== 'string') return null

  const cleaned = raw.trim().toLowerCase()

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleaned)) return null

  return cleaned
}


/**
 * Normalizuje Facebook URL do kanonického tvaru `facebook.com/...`.
 *
 * Strip protokolu, `www.`, `m.` prefixu. `fb.com` → `facebook.com`.
 * Pro `profile.php?id=N` zachová query, jinak strip query stringu.
 *
 * @example
 *   normalizeFacebookUrl('facebook.com/honza.novak')
 *     // 'facebook.com/honza.novak'
 *   normalizeFacebookUrl('https://www.facebook.com/honza.novak')
 *     // 'facebook.com/honza.novak'
 *   normalizeFacebookUrl('fb.com/honza.novak')
 *     // 'facebook.com/honza.novak'
 *   normalizeFacebookUrl('https://m.facebook.com/profile.php?id=123')
 *     // 'facebook.com/profile.php?id=123'
 *   normalizeFacebookUrl('https://example.com/foo')
 *     // null
 */
export function normalizeFacebookUrl(raw: string): string | null {
  if (typeof raw !== 'string') return null

  const trimmed = raw.trim()
  const match = trimmed.match(
    /^(?:https?:\/\/)?(?:www\.|m\.)?(?:fb\.com|facebook\.com)\/(.+)$/i,
  )
  if (!match) return null

  const path = match[1]

  // profile.php?id=N — zachovej jen id query param
  const profileMatch = path.match(/^profile\.php\?(?:.*&)?id=(\d+)/i)
  if (profileMatch) {
    return `facebook.com/profile.php?id=${profileMatch[1]}`
  }

  // Ostatní cesty: strip query a hash
  const cleanPath = path.split('?')[0].split('#')[0]
  if (!cleanPath) return null

  return `facebook.com/${cleanPath}`
}


/**
 * Normalizuje variabilní symbol (jen číslice, 1-10 cifer).
 *
 * @example
 *   normalizeVarSymbol('12345')      // '12345'
 *   normalizeVarSymbol('12 345')     // '12345'
 *   normalizeVarSymbol('12-345')     // '12345'
 *   normalizeVarSymbol('12345678901') // null  (přesahuje 10 cifer)
 *   normalizeVarSymbol('')           // null
 */
export function normalizeVarSymbol(raw: string): string | null {
  if (typeof raw !== 'string') return null

  const digits = raw.replace(/\D/g, '')

  if (digits.length < 1 || digits.length > 10) return null

  return digits
}


/**
 * Auto-detekce typu identifikátoru z formátu vstupu.
 *
 * Priorita (při shodě): email > facebook_url > account > phone > var_symbol.
 *
 * @example
 *   detectIdentifierType('pavel@example.cz')        // 'email'
 *   detectIdentifierType('facebook.com/honza')      // 'facebook_url'
 *   detectIdentifierType('12345/0100')              // 'account'
 *   detectIdentifierType('+420 777 123 456')        // 'phone'
 *   detectIdentifierType('12345')                   // 'var_symbol'
 *   detectIdentifierType('')                        // null
 */
export function detectIdentifierType(raw: string): IdentifierType | null {
  if (typeof raw !== 'string' || raw.trim() === '') return null

  if (normalizeEmail(raw) !== null) return 'email'
  if (normalizeFacebookUrl(raw) !== null) return 'facebook_url'
  if (normalizeAccount(raw) !== null) return 'account'
  if (normalizeIban(raw) !== null) return 'account'
  if (normalizePhone(raw) !== null) return 'phone'
  if (normalizeVarSymbol(raw) !== null) return 'var_symbol'

  return null
}


/**
 * Lidsky čitelný popisek typu identifikátoru pro UI (admin moderace,
 * veřejný search FoundPanel, homepage DB match list). Pokud je hodnota
 * (případně maskovaná) ve tvaru IBAN, vrátí "Číslo účtu (IBAN)", aby
 * admin/uživatel poznal, že nejde o český formát.
 *
 * `valueMasked` je volitelné — bez něj se vrátí obecný label pro `account`.
 */
export function identifierLabel(type: IdentifierType, valueMasked?: string): string {
  switch (type) {
    case 'phone':
      return 'Telefon'
    case 'email':
      return 'E-mail'
    case 'facebook_url':
      return 'Profil na platformě'
    case 'var_symbol':
      return 'Variabilní symbol'
    case 'account':
      if (valueMasked && looksLikeIban(valueMasked)) return 'Číslo účtu (IBAN)'
      return 'Číslo účtu'
    case 'other':
    default:
      return 'Neurčený identifikátor'
  }
}


/**
 * Vrátí SHA-256 hex hash hodnoty (po normalizaci).
 *
 * Použití: lookup v `subject_identifiers.value_hash` — viz SPEC.md sekce 4.
 * Hash je deterministický, lowercase hex (64 znaků).
 *
 * @example
 *   await hashIdentifier('+420777123456')
 *     // 'a3f...64znaků...'
 */
export async function hashIdentifier(value: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(value)
  const buffer = await crypto.subtle.digest('SHA-256', data)
  const bytes = new Uint8Array(buffer)
  let hex = ''
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, '0')
  }
  return hex
}


/**
 * Maskuje identifikátor pro veřejný view podle SPEC.md sekce 6.3.
 *
 * Pravidla:
 * - phone: ponech +420 prefix, první cifru a poslední 2 cifry
 * - account: ponech prefix, poslední cifru čísla, bank kód
 * - email: ponech první znak local-part, celý doménu
 * - facebook_url: ponech první znak každého segmentu jména
 * - var_symbol: ponech první 2 a poslední 3 cifry (pokud délka > 5)
 * - other / fallback: první 2 znaky + asterisky + posledních 2
 *
 * @example
 *   maskIdentifier('+420777123456', 'phone')           // '+420 7** *** *56'
 *   maskIdentifier('12345-6789/0100', 'account')       // '12345-***9/0100'
 *   maskIdentifier('pavel@example.cz', 'email')        // 'p****@example.cz'
 *   maskIdentifier('facebook.com/honza.novak', 'facebook_url')
 *     // 'facebook.com/h****.n****'
 *   maskIdentifier('1234567890', 'var_symbol')         // '12***890'
 */
export function maskIdentifier(value: string, type: IdentifierType): string {
  if (typeof value !== 'string' || value.length === 0) return ''

  switch (type) {
    case 'phone':
      return maskPhone(value)
    case 'account':
      if (looksLikeIban(value)) return maskIban(value)
      return maskAccount(value)
    case 'email':
      return maskEmail(value)
    case 'facebook_url':
      return maskFacebookUrl(value)
    case 'var_symbol':
      return maskVarSymbol(value)
    case 'other':
    default:
      return maskFallback(value)
  }
}


function maskPhone(value: string): string {
  // Očekává canonical "+420XXXXXXXXX" (13 znaků)
  const match = value.match(/^(\+\d{3})(\d)\d{6}(\d{2})$/)
  if (!match) return maskFallback(value)
  const [, country, firstDigit, lastTwo] = match
  return `${country} ${firstDigit}** *** *${lastTwo}`
}


function maskIban(value: string): string {
  // IBAN: ponech country prefix (LT/CZ/...) + 2 kontrolní cifry + posledních 4 znaků
  // např. "LT983130010177064564" → "LT98 **** **** **** 4564"
  const cleaned = value.replace(/\s/g, '').toUpperCase()
  if (cleaned.length < 8) return maskFallback(cleaned)
  const head = cleaned.slice(0, 4)
  const tail = cleaned.slice(-4)
  return `${head}${'*'.repeat(Math.max(4, cleaned.length - 8))}${tail}`
}


function maskAccount(value: string): string {
  // Tvar "[prefix-]number/bank"
  const match = value.match(/^(?:(\d{1,6})-)?(\d{1,10})\/(\d{4})$/)
  if (!match) return maskFallback(value)
  const [, prefix, number, bank] = match
  const lastDigit = number.slice(-1)
  const maskedNumber = '*'.repeat(Math.max(0, number.length - 1)) + lastDigit
  if (prefix) {
    return `${prefix}-${maskedNumber}/${bank}`
  }
  return `${maskedNumber}/${bank}`
}


function maskEmail(value: string): string {
  const atIdx = value.indexOf('@')
  if (atIdx <= 0) return maskFallback(value)
  const local = value.slice(0, atIdx)
  const domain = value.slice(atIdx)
  if (local.length <= 1) return `${local}${domain}`
  return `${local[0]}${'*'.repeat(local.length - 1)}${domain}`
}


function maskFacebookUrl(value: string): string {
  // Tvar "facebook.com/username" nebo "facebook.com/profile.php?id=N"
  const match = value.match(/^facebook\.com\/(.+)$/)
  if (!match) return maskFallback(value)
  const path = match[1]

  // profile.php?id=N — maskovat ID
  if (path.startsWith('profile.php?id=')) {
    const id = path.slice('profile.php?id='.length)
    const maskedId = id.length <= 2 ? id : id[0] + '*'.repeat(id.length - 1)
    return `facebook.com/profile.php?id=${maskedId}`
  }

  // Jinak: každý .-segment → první znak + asterisky
  const segments = path.split('.')
  const masked = segments
    .map((seg) => {
      if (seg.length <= 1) return seg
      return seg[0] + '*'.repeat(seg.length - 1)
    })
    .join('.')
  return `facebook.com/${masked}`
}


function maskVarSymbol(value: string): string {
  if (value.length <= 5) return maskFallback(value)
  const first2 = value.slice(0, 2)
  const last3 = value.slice(-3)
  return `${first2}***${last3}`
}


function maskFallback(value: string): string {
  if (value.length <= 4) {
    return '*'.repeat(value.length)
  }
  const first2 = value.slice(0, 2)
  const last2 = value.slice(-2)
  return `${first2}${'*'.repeat(Math.max(4, value.length - 4))}${last2}`
}


/**
 * Vygeneruje 32-znakový hex token pro token-based access k objekci námitky.
 *
 * Použití: `objections.access_token` — sdílíme dotčené osobě e-mailem
 * jako součást URL `/databaze/namitka/[token]`.
 *
 * Implementace: 2× crypto.randomUUID() stripped of dashes, prvních 32 znaků.
 *
 * @example
 *   generateAccessToken()  // 'a3f8e9d2...32 znaků hex...'
 */
export function generateAccessToken(): string {
  const part1 = crypto.randomUUID().replace(/-/g, '')
  const part2 = crypto.randomUUID().replace(/-/g, '')
  return (part1 + part2).slice(0, 32)
}


/**
 * Povolené MIME types pro upload důkazů (storage bucket `evidence`).
 * Viz SPEC.md sekce 4 (tabulka evidence) a sekce 6.4 (formulář).
 */
export const ALLOWED_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'application/pdf',
] as const


/**
 * Maximální velikost souboru důkazu v bytech (3 MB).
 *
 * Kompromis mezi Vercel payload limitem (~4.5 MB pro celý multipart
 * request) a komfortem uživatele. Pro obrázky je browser-side komprese
 * v utils/databaze/imageCompress.ts (cílí na 1-2 MB po resize na 1920px).
 * PDF se nekomprimují, validují se proti tomuto limitu.
 *
 * Server (app/api/databaze/report/route.ts) validuje stejně — defense
 * in depth proti klientovi, který by limit obešel.
 */
export const MAX_FILE_SIZE_BYTES = 3 * 1024 * 1024
