/**
 * Distributed rate limiting přes Upstash Redis.
 *
 * Nahrazuje nespolehlivý in-memory Map ze security.ts, který na Vercel
 * serverless nefunguje napříč instancemi ani cold starty.
 *
 * Fail-open vs fail-closed:
 *   - failOpen = true (výchozí): pokud Redis nedostupný → pustit request.
 *     Vhodné pro anti-spam ochranu (lead, contact), kde výpadek Redis
 *     nepředstavuje finanční riziko.
 *   - failOpen = false: pokud Redis nedostupný → blokovat request.
 *     Vhodné pro operace, kde abuse stojí peníze (AI tokeny).
 *     POZOR: při výpadku Redis zablokuje i legitimní uživatele — použít jen
 *     tam, kde existuje záložní DB-based check (jako v analyze/anon).
 *
 * Env vars (Vercel → Settings → Environment Variables):
 *   UPSTASH_REDIS_REST_URL   — https://<region>-<id>.upstash.io
 *   UPSTASH_REDIS_REST_TOKEN — AQ...
 */

import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// ── Upstash Duration type ─────────────────────────────────────────
// Re-exported so callers don't need to import from @upstash/ratelimit directly.
export type RLWindow = `${number} ${'s' | 'm' | 'h' | 'd'}`

export interface RLResult {
  /** true = request allowed, false = rate limit exceeded */
  allowed: boolean
  /** requests remaining in this window, -1 = unknown (Redis unavailable) */
  remaining: number
}

// ── Redis singleton ───────────────────────────────────────────────
// undefined = not yet initialized, null = initialization failed / env missing
let _redis: Redis | null | undefined = undefined

export function getRedis(): Redis | null {
  if (_redis !== undefined) return _redis
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) {
    console.warn(
      '[ratelimit] UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN not set — ' +
      'rate limiting degraded to fail-open/closed policy per caller',
    )
    return (_redis = null)
  }
  try {
    _redis = new Redis({ url, token })
    // TEMP diagnostic (viz /api/test/submit) — potvrzuje, že env proměnné
    // jsou v tomhle runtime skutečně vidět, ne jen "asi nastavené" ve Vercelu.
    console.log(`[ratelimit] Redis client inicializován (url prefix: ${url.slice(0, 24)}…)`)
    return _redis
  } catch (err) {
    console.error('[ratelimit] Redis init failed:', err)
    return (_redis = null)
  }
}

// ── Ratelimit instance cache ──────────────────────────────────────
const _limiters = new Map<string, Ratelimit>()

function getLimiter(scope: string, max: number, window: RLWindow): Ratelimit | null {
  const key = `${scope}:${max}:${window}`
  const cached = _limiters.get(key)
  if (cached) return cached
  const redis = getRedis()
  if (!redis) return null
  const limiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(max, window),
    prefix: 'neklikni:rl',
    analytics: false,
  })
  _limiters.set(key, limiter)
  return limiter
}

// ── Public API ────────────────────────────────────────────────────

/**
 * Check a sliding-window rate limit against Upstash Redis.
 *
 * @param identifier  Opaque string key (e.g. hashed IP, user UUID).
 *                    PII should be hashed before passing (use hashForRL below).
 * @param scope       Short label that namespaces the counter (e.g. 'contact', 'search:anon').
 * @param max         Maximum allowed requests in the window.
 * @param window      Upstash duration string (e.g. '1 h', '24 h').
 * @param failOpen    How to behave when Redis is unavailable.
 *                    true  → allow request (default, safe for anti-spam).
 *                    false → block request (for expensive/abusable ops with DB fallback).
 */
export async function checkRateLimit(
  identifier: string,
  scope: string,
  max: number,
  window: RLWindow,
  failOpen = true,
): Promise<RLResult> {
  const limiter = getLimiter(scope, max, window)

  if (!limiter) {
    if (!failOpen) {
      console.warn(`[ratelimit:${scope}] Redis unavailable → fail-closed`)
      return { allowed: false, remaining: 0 }
    }
    return { allowed: true, remaining: -1 }
  }

  try {
    const { success, remaining } = await limiter.limit(`${scope}:${identifier}`)
    return { allowed: success, remaining: Math.max(0, remaining) }
  } catch (err) {
    console.error(`[ratelimit:${scope}] Redis error:`, err)
    return failOpen
      ? { allowed: true, remaining: -1 }
      : { allowed: false, remaining: 0 }
  }
}

/**
 * Claim a one-time key via Redis SET NX EX (atomic — no check-then-set race).
 * Returns true the first time a given key is claimed, false on every
 * subsequent call (or if Redis is unavailable — fail-closed, since the
 * caller relies on this for replay protection, not just anti-spam).
 *
 * Used by /api/test/submit: 1 quiz seed = 1 scoring attempt, so a fixed
 * seed can't be brute-forced by resubmitting different answers.
 */
export async function claimOnce(key: string, ttlSeconds: number): Promise<boolean> {
  const redis = getRedis()
  if (!redis) {
    console.warn('[claimOnce] Redis unavailable — fail-closed, rejecting claim')
    return false
  }
  try {
    const result = await redis.set(key, '1', { nx: true, ex: ttlSeconds })
    return result === 'OK'
  } catch (err) {
    console.error('[claimOnce] Redis error:', err)
    return false
  }
}

/**
 * Krátkodobé úložiště jedné hodnoty pod klíčem (ne "claim", jen cache).
 * Použito v /api/test/submit k uložení už spočítaného skóre pod seed,
 * aby si ho /api/test/join mohl později přečíst a zapsat do žebříčku
 * BEZ toho, aby klient posílal skóre nebo odpovědi znovu (což by
 * vyžadovalo druhé volání claimOnce na už spálený seed).
 */
export async function setWithTtl<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
  const redis = getRedis()
  if (!redis) return
  try {
    await redis.set(key, value, { ex: ttlSeconds })
  } catch (err) {
    console.error('[setWithTtl] Redis error:', err)
  }
}

export async function getValue<T>(key: string): Promise<T | null> {
  const redis = getRedis()
  if (!redis) return null
  try {
    return await redis.get<T>(key)
  } catch (err) {
    console.error('[getValue] Redis error:', err)
    return null
  }
}

/**
 * SHA-256 hash of `value + IP_PEPPER` → 16 hex chars.
 * Use for IP addresses before passing to checkRateLimit (privacy + key size).
 */
export async function hashForRL(value: string): Promise<string> {
  const pepper = process.env.IP_PEPPER ?? 'neklikni-rl-fallback'
  const data = new TextEncoder().encode(value + pepper)
  const buf = await crypto.subtle.digest('SHA-256', data)
  const bytes = new Uint8Array(buf)
  let hex = ''
  for (let i = 0; i < 8; i++) hex += bytes[i].toString(16).padStart(2, '0')
  return hex // 16 chars — sufficient for rate-limit key uniqueness
}
