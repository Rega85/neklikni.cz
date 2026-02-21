import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type')
  const next = searchParams.get('next') ?? '/'

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

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) return NextResponse.redirect(`${origin}${next}`)
    console.error('Code exchange error:', error)
  }

  if (token_hash && type) {
    // Pro magic link použij exchangeCodeForSession místo verifyOtp
    const { error } = await supabase.auth.exchangeCodeForSession(token_hash)
    if (!error) return NextResponse.redirect(`${origin}${next}`)
    
    // Fallback na verifyOtp
    const { error: otpError } = await supabase.auth.verifyOtp({ 
      token_hash, 
      type: type as any 
    })
    if (!otpError) return NextResponse.redirect(`${origin}${next}`)
    console.error('Auth error:', otpError)
  }

  return NextResponse.redirect(`${origin}/login?error=Prihlaseni_selhalo`)
}