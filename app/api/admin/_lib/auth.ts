/**
 * Admin auth helper pro `/admin/*` server stránky a `/api/admin/*` routes.
 *
 * Postup:
 *  1. Vyzvedne authenticated user ze session (SSR cookies + anon klient).
 *  2. Ověří, že userId existuje v `public.app_admins` (přes service_role,
 *     aby kontrola nezávisela na RLS).
 *  3. Vrátí `{ userId, email } | null`. Null = neoprávněn.
 *
 * Volající rozhoduje, co dělat: redirect na /login, vrátit 403, atd.
 */

import { createServerClient } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

export interface AdminIdentity {
  userId: string
  email: string | null
}

export async function getAdminIdentity(): Promise<AdminIdentity | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !anonKey || !serviceKey) return null

  let userId: string | null = null
  let email: string | null = null
  try {
    const cookieStore = await cookies()
    const ssr = createServerClient(url, anonKey, {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll() {},
      },
    })
    const { data } = await ssr.auth.getUser()
    if (!data.user) return null
    userId = data.user.id
    email = data.user.email ?? null
  } catch (err) {
    console.error('getAdminIdentity: session lookup failed', err)
    return null
  }

  try {
    const admin = createSupabaseClient(url, serviceKey)
    const { data: row, error } = await admin
      .from('app_admins')
      .select('user_id')
      .eq('user_id', userId)
      .maybeSingle()
    if (error) {
      console.error('getAdminIdentity: app_admins lookup failed', error)
      return null
    }
    if (!row) return null
  } catch (err) {
    console.error('getAdminIdentity: app_admins exception', err)
    return null
  }

  return { userId: userId!, email }
}
