import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type')
  // Validate next: must be a relative path starting with "/" and no double slashes or protocol
  const rawNext = searchParams.get('next') ?? '/'
  const next = /^\/[^/\\]/.test(rawNext) || rawNext === '/' ? rawNext : '/'

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
    await supabaseAdmin.rpc('apply_referral', {
      p_new_user_id: user.id,
      p_ref_code: refCookie.value,
    })
    cookieStore.delete('neklikni_ref')
  }

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      await tryApplyReferral()
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash,
      type: type as any,
    })
    if (!error) {
      if (type === 'signup') await tryApplyReferral()
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=Prihlaseni_selhalo`)
}
