/**
 * Shared security helpers pro public API endpoint.
 *
 * - `escapeHtml`: escape user inputu před vložením do HTML mailových
 *   templatů (zabrání injekci linků / phishing payloadů do admin emailů).
 * - `checkIpRateLimit`: jednoduchý per-IP / per-scope rate limit (sliding
 *   window). MVP implementace přes in-memory `Map` — TODO(v2): přesunout
 *   do Redis/DB. Na Vercel serverless je tahle implementace nespolehlivá
 *   napříč instancemi a cold starty, ale je lepší než nic (zastaví triviální
 *   spam burst z jedné session).
 */

const HTML_ESCAPE_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
  '/': '&#x2F;',
};

export function escapeHtml(input: string): string {
  if (typeof input !== 'string') return ''
  return input.replace(/[&<>"'/]/g, (ch) => HTML_ESCAPE_MAP[ch] ?? ch)
}

export function getClientIp(req: Request): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  )
}

// TODO(v2): přesunout do Redis/Supabase tabulky. In-memory funguje jen v
// rámci jednoho serverless instance — útočník obejde přes cold starty
// nebo paralelní regiony. Pro triviální spam ochranu MVP stačí.
const ipRateLimitMap = new Map<string, number[]>()

export function checkIpRateLimit(
  ip: string,
  scope: string,
  maxRequests: number,
  windowMs: number,
): boolean {
  const key = `${scope}:${ip}`
  const now = Date.now()
  const cutoff = now - windowMs
  const stamps = (ipRateLimitMap.get(key) ?? []).filter((t) => t > cutoff)
  if (stamps.length >= maxRequests) {
    ipRateLimitMap.set(key, stamps)
    return false
  }
  stamps.push(now)
  ipRateLimitMap.set(key, stamps)
  return true
}
