/**
 * GET /api/databaze/my-incidents
 *
 * Prostý seznam vlastních nahlášení přihlášeného uživatele pro
 * sekci "Tvoje nahlášení" na /profile. RLS policy "Reporters can
 * read own incidents" dovolí SELECT bez service-role klienta.
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()

  if (authErr || !user) {
    return NextResponse.json({ error: 'Neautorizováno' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('incidents')
    .select('id, incident_date, category, category_other, created_at')
    .eq('reporter_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('my-incidents fetch failed:', error)
    return NextResponse.json({ error: 'Chyba serveru' }, { status: 500 })
  }

  return NextResponse.json({ incidents: data ?? [] })
}
