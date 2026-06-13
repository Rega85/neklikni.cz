/**
 * Server-side data helpers pro veřejný výpis nahlášených incidentů
 * (/databaze a /databaze/pripad/[id]).
 *
 * Veřejně se zobrazují jen incidenty se `status = 'published'` u subjektů
 * s `visibility_status = 'active'`. Identifikátory jsou vždy maskované
 * (`value_masked`) — plnou hodnotu vrací `getIncidentDetail` jen na
 * explicitní `includeFull = true` (volá se pouze pro přihlášené uživatele).
 */

import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import type { DatabazeDatabase } from '@/app/api/databaze/_lib/database'
import type { IdentifierType, IncidentCategory } from '@/types/databaze'

type SupabaseAdminClient = ReturnType<typeof createSupabaseClient<DatabazeDatabase>>
let _supabaseAdmin: SupabaseAdminClient | null = null
function supabaseAdmin(): SupabaseAdminClient {
  if (!_supabaseAdmin) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) throw new Error('Supabase admin env vars missing')
    _supabaseAdmin = createSupabaseClient<DatabazeDatabase>(url, key)
  }
  return _supabaseAdmin
}


export interface RecentIncidentCard {
  id: string
  category: IncidentCategory
  categoryOther: string | null
  incidentDate: string
  publicAt: string
  identifierType: IdentifierType
  identifierMasked: string
  subjectIncidentCount: number
}


/**
 * Vrátí nejnovější veřejně publikované incidenty pro sekci
 * "Naposledy nahlášené případy" na /databaze.
 *
 * Pro každý incident vybere jeden (první) identifikátor subjektu jako
 * zástupný pro kartu a počet všech publikovaných nahlášení daného
 * subjektu.
 */
export async function getRecentPublishedIncidents(
  limit = 15,
): Promise<RecentIncidentCard[]> {
  const { data: incidentRows, error: incidentsErr } = await supabaseAdmin()
    .from('incidents')
    .select('id, subject_id, incident_date, category, category_other, public_at')
    .eq('status', 'published')
    .order('public_at', { ascending: false })
    .limit(limit)

  if (incidentsErr || !incidentRows || incidentRows.length === 0) {
    if (incidentsErr) console.error('getRecentPublishedIncidents: incidents fetch failed', incidentsErr)
    return []
  }

  const subjectIds = [...new Set(incidentRows.map((r) => r.subject_id))]

  const [{ data: subjects }, { data: identifiers }, { data: allPublished }] = await Promise.all([
    supabaseAdmin()
      .from('subjects')
      .select('id, visibility_status')
      .in('id', subjectIds),
    supabaseAdmin()
      .from('subject_identifiers')
      .select('subject_id, type, value_masked, created_at')
      .in('subject_id', subjectIds),
    supabaseAdmin()
      .from('incidents')
      .select('subject_id')
      .in('subject_id', subjectIds)
      .eq('status', 'published'),
  ])

  const activeSubjectIds = new Set(
    (subjects ?? []).filter((s) => s.visibility_status === 'active').map((s) => s.id),
  )

  const incidentCountBySubject = new Map<string, number>()
  for (const row of allPublished ?? []) {
    incidentCountBySubject.set(row.subject_id, (incidentCountBySubject.get(row.subject_id) ?? 0) + 1)
  }

  const identifierBySubject = new Map<string, { type: IdentifierType; value_masked: string }>()
  for (const id of identifiers ?? []) {
    if (!identifierBySubject.has(id.subject_id)) {
      identifierBySubject.set(id.subject_id, { type: id.type, value_masked: id.value_masked })
    }
  }

  const cards: RecentIncidentCard[] = []
  for (const incident of incidentRows) {
    if (!activeSubjectIds.has(incident.subject_id)) continue
    const identifier = identifierBySubject.get(incident.subject_id)
    if (!identifier || !incident.public_at) continue

    cards.push({
      id: incident.id,
      category: incident.category,
      categoryOther: incident.category_other,
      incidentDate: incident.incident_date,
      publicAt: incident.public_at,
      identifierType: identifier.type,
      identifierMasked: identifier.value_masked,
      subjectIncidentCount: incidentCountBySubject.get(incident.subject_id) ?? 1,
    })
  }

  return cards
}


export interface IncidentTimelineEntry {
  id: string
  incidentDate: string
  publicAt: string
  category: IncidentCategory
  categoryOther: string | null
}

export interface IncidentDetail {
  id: string
  category: IncidentCategory
  categoryOther: string | null
  incidentDate: string
  publicAt: string
  description: string
  identifiers: Array<{ type: IdentifierType; valueMasked: string; value: string | null }>
  timeline: IncidentTimelineEntry[]
}


/**
 * Vrátí detail veřejně publikovaného incidentu pro /databaze/pripad/[id].
 *
 * Vrací `null`, pokud incident neexistuje, nemá `status = 'published'`,
 * nebo subjekt nemá `visibility_status = 'active'`.
 *
 * `includeFull` (jen pro přihlášené uživatele) přidá nemaskovanou hodnotu
 * identifikátorů (`identifiers[].value`).
 */
export async function getPublishedIncidentDetail(
  id: string,
  includeFull: boolean,
): Promise<IncidentDetail | null> {
  const { data: incident, error: incidentErr } = await supabaseAdmin()
    .from('incidents')
    .select('id, subject_id, incident_date, category, category_other, description, public_at, status')
    .eq('id', id)
    .maybeSingle()

  if (incidentErr || !incident || incident.status !== 'published' || !incident.public_at) {
    return null
  }

  const { data: subject } = await supabaseAdmin()
    .from('subjects')
    .select('id, visibility_status')
    .eq('id', incident.subject_id)
    .maybeSingle()

  if (!subject || subject.visibility_status !== 'active') return null

  const { data: identifierRows } = await supabaseAdmin()
    .from('subject_identifiers')
    .select('type, value_masked, value')
    .eq('subject_id', incident.subject_id)

  const identifiers = (identifierRows ?? []).map((row) => ({
    type: row.type,
    valueMasked: row.value_masked,
    value: includeFull ? row.value : null,
  }))

  const { data: timelineRows } = await supabaseAdmin()
    .from('incidents')
    .select('id, incident_date, public_at, category, category_other')
    .eq('subject_id', incident.subject_id)
    .eq('status', 'published')
    .order('public_at', { ascending: false })

  const timeline: IncidentTimelineEntry[] = (timelineRows ?? [])
    .filter((row) => row.public_at !== null)
    .map((row) => ({
      id: row.id,
      incidentDate: row.incident_date,
      publicAt: row.public_at as string,
      category: row.category,
      categoryOther: row.category_other,
    }))

  return {
    id: incident.id,
    category: incident.category,
    categoryOther: incident.category_other,
    incidentDate: incident.incident_date,
    publicAt: incident.public_at,
    description: incident.description,
    identifiers,
    timeline,
  }
}
