import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

// Whitelist verzí znění newsletter souhlasu (checkbox na /register).
// Stejný princip jako u ACCEPTED_LEAD_CONSENT_VERSIONS v /api/lead —
// chrání DB sloupec před zfalšovanou hodnotou z URL parametru.
const ACCEPTED_NEWSLETTER_CONSENT_VERSIONS: ReadonlySet<string> = new Set(['2026-06'])

export async function GET(request: Request) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type')
  // Supabase posts auth errors back as ?error=...&error_description=...
  const errorParam = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')
  // Validate next: must be a relative path starting with "/" and no double slashes or protocol
  const rawNext = searchParams.get('next') ?? '/'
  const next = /^\/[^/\\]/.test(rawNext) || rawNext === '/' ? rawNext : '/'
  // Přítomné jen když confirm-link vznikl z /register (checkbox tam uživatel
  // už viděl) — viz emailRedirectTo v app/register/page.tsx.
  const consentParam = searchParams.get('consent')
  const consentVersionParam = searchParams.get('consent_version')

  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        },
      },
    }
  )

  async function tryApplyReferral() {
    const refCookie = cookieStore.get('neklikni_ref')
    if (!refCookie?.value) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { error } = await supabaseAdmin.rpc('apply_referral', {
      p_new_user_id: user.id,
      p_ref_code: refCookie.value,
    })
    if (error) console.warn('apply_referral failed:', error.message)
    cookieStore.delete('neklikni_ref')
  }

  // Newsletter consent: zapíše volbu z /register (pokud přišla v URL) NEBO
  // jednou ukáže onboarding modal OAuth/magic-link uživatelům, kteří
  // checkbox nikdy neviděli. Selhání nesmí rozbít přihlášení — fail-open
  // na `next`.
  async function resolveNewsletterRedirect(): Promise<string> {
    try {
      // Reset hesla je citlivý flow — nesmí se do něj vmísit onboarding
      // modal. /update-password je jediná hodnota next, kterou appka pro
      // recovery posílá (viz app/login/page.tsx handleResetPassword).
      if (next === '/update-password') return next

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return next

      // Z /register — checkbox uživatel už viděl, ulož volbu a nikdy
      // už neukazuj onboarding modal.
      if (
        (consentParam === '1' || consentParam === '0') &&
        consentVersionParam &&
        ACCEPTED_NEWSLETTER_CONSENT_VERSIONS.has(consentVersionParam)
      ) {
        const consent = consentParam === '1'
        const { error } = await supabaseAdmin
          .from('user_profiles')
          .update({
            newsletter_consent: consent,
            // _at/_version = "poslední změna stavu", ne jen "kdy souhlasil" —
            // zaznamenává se i odmítnutí (jedna timestamp pojistka, viz FÁZE 1).
            newsletter_consent_at: new Date().toISOString(),
            newsletter_consent_version: consentVersionParam,
            onboarding_newsletter_shown: true,
          })
          .eq('id', user.id)
        if (error) console.warn('newsletter consent update failed:', error.message)
        return next
      }

      // OAuth / magic-link bez consent parametru — ukaž onboarding modal
      // jen jednou (gate přes onboarding_newsletter_shown, ne datum).
      const { data: profile, error: profileErr } = await supabaseAdmin
        .from('user_profiles')
        .select('onboarding_newsletter_shown')
        .eq('id', user.id)
        .maybeSingle()
      if (profileErr) {
        console.warn('newsletter onboarding lookup failed:', profileErr.message)
        return next
      }
      if (profile && profile.onboarding_newsletter_shown === false) {
        const { error: flagErr } = await supabaseAdmin
          .from('user_profiles')
          .update({ onboarding_newsletter_shown: true })
          .eq('id', user.id)
        if (flagErr) console.warn('newsletter onboarding flag update failed:', flagErr.message)
        return `/onboarding/newsletter?next=${encodeURIComponent(next)}`
      }
      return next
    } catch (err) {
      console.warn('resolveNewsletterRedirect exception:', err)
      return next
    }
  }

  // If Supabase forwarded an error (expired link, access denied), surface it
  if (errorParam) {
    const reason = encodeURIComponent(errorDescription || errorParam)
    return NextResponse.redirect(`${origin}/login?error=${reason}`)
  }

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      await tryApplyReferral()
      const redirectPath = await resolveNewsletterRedirect()
      return NextResponse.redirect(`${origin}${redirectPath}`)
    }
    console.warn('exchangeCodeForSession failed:', error.message)
  }

  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash,
      type: type as any,
    })
    if (!error) {
      if (type === 'signup') await tryApplyReferral()
      const redirectPath = await resolveNewsletterRedirect()
      return NextResponse.redirect(`${origin}${redirectPath}`)
    }
    console.warn('verifyOtp failed:', error.message)
  }

  return NextResponse.redirect(`${origin}/login?error=link_expired`)
}
