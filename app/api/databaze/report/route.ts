/**
 * POST /api/databaze/report
 *
 * Vytvoření nahlášení incidentu. Multipart/form-data kvůli souborům.
 *
 * Návaznost: docs/SPEC.md sekce 5.1 (Proces nahlášení) a sekce 4
 * (datový model).
 *
 * Workflow (high-level):
 *  1. Auth (cookies) → 401 pokud nepřihlášen
 *  2. Parse + validace multipart fields
 *  3. Rate limit: max 3 nahlášení / 24h / reporter
 *  4. Upsert reporters row (nebo 403 pokud banned)
 *  5. Normalize + hash identifierů
 *  6. Match existing subjects (nebo vytvoř nový / pending_merge_review)
 *  7. Run AI precheck (shared `_lib/precheck.ts`)
 *  8. INSERT incident s computed status
 *  9. Upload každého souboru do storage + INSERT evidence
 * 10. Rollback při file upload chybě (storage cleanup + DELETE incident)
 * 11. Pokud máme notification_email a status='ai_reviewed' → 'notified'
 *     (skutečné odeslání e-mailu zatím TODO, v dalším promptu)
 * 12. Audit log
 * 13. Response 201 s incident_id, status a user-friendly message
 */

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import {
  normalizePhone,
  normalizeAccount,
  normalizeEmail,
  normalizeFacebookUrl,
  normalizeVarSymbol,
  hashIdentifier,
  maskIdentifier,
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE_BYTES,
} from '@/utils/databaze/identifiers'
import type {
  EvidenceType,
  IdentifierType,
  IncidentCategory,
  IncidentPlatform,
  IncidentSeverity,
  IncidentStatus,
} from '@/types/databaze'
import type { DatabazeDatabase } from '../_lib/database'
import { runAiPrecheck } from '../_lib/precheck'
import { sendReporterConfirmation } from '../_lib/email'

export const dynamic = 'force-dynamic'

const REPORTS_PER_DAY_LIMIT = 3
const MIN_EVIDENCE_FILES = 2
const MAX_EVIDENCE_FILES = 5

const STORAGE_BUCKET = 'evidence'

const VALID_CATEGORIES: ReadonlySet<IncidentCategory> = new Set([
  'non_delivery',
  'misrepresentation',
  'fake_courier',
  'disappeared_listing',
  'fake_profile',
  'romance',
  'investment',
  'rental',
  'tickets',
  'employment',
  'other',
])

const VALID_SEVERITIES: ReadonlySet<IncidentSeverity> = new Set([
  'attempt',
  'minor',
  'medium',
  'major',
  'severe',
])

const VALID_PLATFORMS: ReadonlySet<IncidentPlatform> = new Set([
  'fb_marketplace',
  'fb_groups',
  'sbazar',
  'bazos',
  'vinted',
  'aukro',
  'email',
  'sms',
  'phone',
  'other',
])

const VALID_IDENTIFIER_TYPES: ReadonlySet<IdentifierType> = new Set([
  'phone',
  'account',
  'email',
  'facebook_url',
  'var_symbol',
  'other',
])

const MIME_TO_EXT: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
}


// ── Lazy-init Supabase admin ─────────────────────────

type SupabaseAdminClient = ReturnType<typeof createClient<DatabazeDatabase>>
let _supabaseAdmin: SupabaseAdminClient | null = null
function supabaseAdmin(): SupabaseAdminClient {
  if (!_supabaseAdmin) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) throw new Error('Supabase admin env vars missing')
    _supabaseAdmin = createClient<DatabazeDatabase>(url, key)
  }
  return _supabaseAdmin
}


// ── Types pro internal pipeline ──────────────────────

interface ParsedIdentifier {
  type: IdentifierType
  rawValue: string
  normalizedValue: string
  hash: string
  masked: string
}

interface ParsedFields {
  incident_date: string
  platform: IncidentPlatform
  platform_other: string | null
  category: IncidentCategory
  category_other: string | null
  severity: IncidentSeverity
  amount_czk: number
  description: string
  contact_for_subject_email: string | null
  identifiers: Array<{ type: IdentifierType; value: string }>
  files: File[]
  truth_confirmation: boolean
  data_processing_consent: boolean
  law_enforcement_consent: boolean
  consent_version: string
}

// Whitelist přijatelných verzí znění souhlasu. Klient pošle aktuální
// verzi (CONSENT_VERSION v IncidentReportForm.tsx). Cokoli mimo whitelist
// odmítáme — chrání proti zfalšované hodnotě, která by ublížila integritě
// audit trailu.
const ACCEPTED_CONSENT_VERSIONS: ReadonlySet<string> = new Set(['2026-05'])


// ── Helpers ──────────────────────────────────────────

function normalizeByType(
  type: IdentifierType,
  raw: string,
): string | null {
  switch (type) {
    case 'phone':
      return normalizePhone(raw)
    case 'account':
      return normalizeAccount(raw)
    case 'email':
      return normalizeEmail(raw)
    case 'facebook_url':
      return normalizeFacebookUrl(raw)
    case 'var_symbol':
      return normalizeVarSymbol(raw)
    case 'other':
      return raw.trim() === '' ? null : raw.trim()
    default:
      return null
  }
}


function mimeToEvidenceType(mime: string): EvidenceType {
  if (mime.startsWith('image/')) return 'screenshot'
  return 'other'
}


async function hashFile(file: File): Promise<string> {
  const buffer = await file.arrayBuffer()
  const digest = await crypto.subtle.digest('SHA-256', buffer)
  const bytes = new Uint8Array(digest)
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}


function parseBoolean(raw: FormDataEntryValue | null): boolean {
  if (typeof raw !== 'string') return false
  const v = raw.toLowerCase().trim()
  return v === 'true' || v === '1' || v === 'on' || v === 'yes'
}


function statusMessage(status: IncidentStatus): string {
  switch (status) {
    case 'pending':
      return 'Nahlášení bylo přijato a čeká na manuální kontrolu. Výsledek vám pošleme e-mailem.'
    case 'pending_merge_review':
      return 'Nahlášení bylo přijato. Detekovali jsme potenciální konflikt s jinými záznamy v databázi; admin to bude posuzovat. Výsledek vám pošleme e-mailem.'
    case 'ai_reviewed':
      return 'Nahlášení bylo přijato a prošlo automatickou kontrolou. Bude zveřejněno po krátké pauze.'
    case 'notified':
      return 'Nahlášení bylo přijato. Dotčená osoba byla informována a má 14 dní na vyjádření, poté bude záznam zveřejněn.'
    default:
      return 'Nahlášení bylo přijato.'
  }
}


// ── Parsing + validace multipart formdata ─────────────

function parseFormData(form: FormData): ParsedFields | string {
  const incident_date = form.get('incident_date')
  if (typeof incident_date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(incident_date)) {
    return 'Neplatné incident_date (YYYY-MM-DD)'
  }

  const platform = form.get('platform')
  if (typeof platform !== 'string' || !VALID_PLATFORMS.has(platform as IncidentPlatform)) {
    return 'Neplatná platforma'
  }

  const platform_other = form.get('platform_other')
  const platform_other_value =
    typeof platform_other === 'string' && platform_other.trim() !== ''
      ? platform_other.trim()
      : null

  const category = form.get('category')
  if (typeof category !== 'string' || !VALID_CATEGORIES.has(category as IncidentCategory)) {
    return 'Neplatná kategorie'
  }

  const category_other = form.get('category_other')
  const category_other_value =
    typeof category_other === 'string' && category_other.trim() !== ''
      ? category_other.trim()
      : null

  const severity = form.get('severity')
  if (typeof severity !== 'string' || !VALID_SEVERITIES.has(severity as IncidentSeverity)) {
    return 'Neplatná závažnost'
  }

  const amountRaw = form.get('amount_czk')
  const amount_czk = typeof amountRaw === 'string' ? Math.floor(Number(amountRaw)) : NaN
  if (!Number.isFinite(amount_czk) || amount_czk < 0 || amount_czk > 100_000_000) {
    return 'Neplatná částka (musí být celé číslo 0–100 000 000 Kč)'
  }

  const description = form.get('description')
  if (typeof description !== 'string' || description.length < 50 || description.length > 1000) {
    return 'Popis musí být 50–1000 znaků'
  }

  const contactRaw = form.get('contact_for_subject_email')
  let contact_for_subject_email: string | null = null
  if (typeof contactRaw === 'string' && contactRaw.trim() !== '') {
    const normalized = normalizeEmail(contactRaw)
    if (!normalized) return 'Neplatný kontakt na dotčenou osobu (e-mail)'
    contact_for_subject_email = normalized
  }

  // identifiers jako JSON string
  const identifiersRaw = form.get('identifiers')
  if (typeof identifiersRaw !== 'string') return 'Chybí identifiers'
  let identifiersParsed: unknown
  try {
    identifiersParsed = JSON.parse(identifiersRaw)
  } catch {
    return 'identifiers musí být validní JSON array'
  }
  if (!Array.isArray(identifiersParsed) || identifiersParsed.length === 0) {
    return 'Musíte uvést alespoň jeden identifikátor protistrany'
  }
  const identifiers: Array<{ type: IdentifierType; value: string }> = []
  for (const item of identifiersParsed) {
    if (!item || typeof item !== 'object') return 'Neplatný identifier (musí být objekt)'
    const it = item as Record<string, unknown>
    if (typeof it.type !== 'string' || !VALID_IDENTIFIER_TYPES.has(it.type as IdentifierType)) {
      return 'Neplatný identifier.type'
    }
    if (typeof it.value !== 'string' || it.value.trim() === '') {
      return 'Neplatný identifier.value'
    }
    identifiers.push({ type: it.type as IdentifierType, value: it.value })
  }

  // konsenty
  const truth_confirmation = parseBoolean(form.get('truth_confirmation'))
  if (!truth_confirmation) return 'Musíte potvrdit pravdivost údajů'
  const data_processing_consent = parseBoolean(form.get('data_processing_consent'))
  if (!data_processing_consent) return 'Musíte souhlasit se zpracováním osobních údajů'
  const law_enforcement_consent = parseBoolean(form.get('law_enforcement_consent'))
  if (!law_enforcement_consent) {
    return 'Musíte souhlasit s předáním údajů orgánům činným v trestním řízení'
  }

  const consentVersionRaw = form.get('consent_version')
  if (typeof consentVersionRaw !== 'string' || !ACCEPTED_CONSENT_VERSIONS.has(consentVersionRaw)) {
    return 'Neplatná verze znění souhlasu'
  }
  const consent_version = consentVersionRaw

  // soubory
  const filesRaw = form.getAll('evidence_files')
  const files: File[] = []
  for (const f of filesRaw) {
    if (f instanceof File) files.push(f)
  }
  if (files.length < MIN_EVIDENCE_FILES || files.length > MAX_EVIDENCE_FILES) {
    return `Musíte nahrát ${MIN_EVIDENCE_FILES}–${MAX_EVIDENCE_FILES} souborů jako důkaz`
  }
  for (const f of files) {
    if (f.size > MAX_FILE_SIZE_BYTES) {
      return `Soubor "${f.name}" přesahuje limit ${MAX_FILE_SIZE_BYTES / 1024 / 1024} MB`
    }
    if (!ALLOWED_MIME_TYPES.includes(f.type as (typeof ALLOWED_MIME_TYPES)[number])) {
      return `Soubor "${f.name}" má nepodporovaný formát (${f.type})`
    }
  }

  return {
    incident_date,
    platform: platform as IncidentPlatform,
    platform_other: platform_other_value,
    category: category as IncidentCategory,
    category_other: category_other_value,
    severity: severity as IncidentSeverity,
    amount_czk,
    description,
    contact_for_subject_email,
    identifiers,
    files,
    truth_confirmation,
    data_processing_consent,
    law_enforcement_consent,
    consent_version,
  }
}


// ── POST handler ─────────────────────────────────────

export async function POST(req: Request) {
  // 1. Auth
  let userId: string | null = null
  let userEmail: string | null = null
  try {
    const cookieStore = await cookies()
    const supabaseSsr = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll() {},
        },
      },
    )
    const { data } = await supabaseSsr.auth.getUser()
    if (data.user) {
      userId = data.user.id
      userEmail = data.user.email ?? null
    }
  } catch (err) {
    console.error('Report auth error:', err)
  }

  if (!userId || !userEmail) {
    return NextResponse.json(
      { error: 'Pro nahlášení incidentu se musíte přihlásit.' },
      { status: 401 },
    )
  }

  // 2. Parse multipart form
  let form: FormData
  try {
    form = await req.formData()
  } catch (err) {
    console.error('Report formData parse failed:', err)
    return NextResponse.json({ error: 'Neplatná multipart data.' }, { status: 400 })
  }
  const parsed = parseFormData(form)
  if (typeof parsed === 'string') {
    return NextResponse.json({ error: parsed }, { status: 400 })
  }

  // 3. Rate limit (incidents za posledních 24h)
  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { count, error: countErr } = await supabaseAdmin()
      .from('incidents')
      .select('*', { count: 'exact', head: true })
      .eq('reporter_id', userId)
      .gte('created_at', since)

    if (countErr) {
      console.error('Report rate-limit lookup failed:', countErr)
    } else if ((count ?? 0) >= REPORTS_PER_DAY_LIMIT) {
      return NextResponse.json(
        {
          error: `Limit ${REPORTS_PER_DAY_LIMIT} nahlášení za 24 hodin vyčerpán. Zkuste to později.`,
        },
        { status: 429 },
      )
    }
  } catch (err) {
    console.error('Report rate-limit exception:', err)
  }

  // 4. Upsert reporter / banned check
  try {
    const { data: existing, error: selectErr } = await supabaseAdmin()
      .from('reporters')
      .select('id, banned')
      .eq('id', userId)
      .maybeSingle()

    if (selectErr) {
      console.error('Report reporter lookup failed:', selectErr)
      return NextResponse.json(
        { error: 'Nepodařilo se ověřit váš profil.' },
        { status: 500 },
      )
    }

    if (existing?.banned) {
      return NextResponse.json(
        { error: 'Váš účet byl pozastaven, nemůžete podávat nová nahlášení.' },
        { status: 403 },
      )
    }

    if (!existing) {
      const { error: insertErr } = await supabaseAdmin()
        .from('reporters')
        .insert({ id: userId, email: userEmail })
      if (insertErr) {
        console.error('Report reporter insert failed:', insertErr)
        return NextResponse.json(
          { error: 'Nepodařilo se vytvořit profil nahlašovatele.' },
          { status: 500 },
        )
      }
    }
  } catch (err) {
    console.error('Report reporter upsert exception:', err)
    return NextResponse.json(
      { error: 'Chyba serveru při ověřování profilu.' },
      { status: 500 },
    )
  }

  // 5. Normalize + hash identifierů
  const parsedIdentifiers: ParsedIdentifier[] = []
  for (const item of parsed.identifiers) {
    const normalized = normalizeByType(item.type, item.value)
    if (!normalized) {
      return NextResponse.json(
        { error: `Neplatný ${item.type}: "${item.value}"` },
        { status: 400 },
      )
    }
    const hash = await hashIdentifier(normalized)
    parsedIdentifiers.push({
      type: item.type,
      rawValue: item.value,
      normalizedValue: normalized,
      hash,
      masked: maskIdentifier(normalized, item.type),
    })
  }

  // 6. Subject matching přes value_hash
  let subjectId: string
  let wasNewSubject = false
  let needsMergeReview = false
  let conflictingSubjectIds: string[] = []
  const newIdentifiersToInsert: ParsedIdentifier[] = []

  try {
    const hashes = parsedIdentifiers.map((i) => i.hash)
    const { data: existingIdentifiers, error: idLookupErr } = await supabaseAdmin()
      .from('subject_identifiers')
      .select('subject_id, value_hash')
      .in('value_hash', hashes)

    if (idLookupErr) {
      console.error('Report identifier lookup failed:', idLookupErr)
      return NextResponse.json(
        { error: 'Chyba při vyhledávání existujících záznamů.' },
        { status: 500 },
      )
    }

    const existingHashes = new Set<string>()
    const matchedSubjectIds = new Set<string>()
    for (const row of existingIdentifiers ?? []) {
      existingHashes.add(row.value_hash)
      matchedSubjectIds.add(row.subject_id)
    }

    for (const id of parsedIdentifiers) {
      if (!existingHashes.has(id.hash)) {
        newIdentifiersToInsert.push(id)
      }
    }

    if (matchedSubjectIds.size === 0) {
      // Vytvoř nový subject
      const firstId = parsedIdentifiers[0]
      const displayName = firstId.masked
      const { data: newSubject, error: subjectInsertErr } = await supabaseAdmin()
        .from('subjects')
        .insert({ display_name_masked: displayName })
        .select('id')
        .single()
      if (subjectInsertErr || !newSubject) {
        console.error('Report subject insert failed:', subjectInsertErr)
        return NextResponse.json(
          { error: 'Nepodařilo se vytvořit subjekt.' },
          { status: 500 },
        )
      }
      subjectId = newSubject.id
      wasNewSubject = true
    } else if (matchedSubjectIds.size === 1) {
      subjectId = [...matchedSubjectIds][0]
    } else {
      // Konflikt: identifikátory patří k více subjektům
      needsMergeReview = true
      conflictingSubjectIds = [...matchedSubjectIds]
      subjectId = conflictingSubjectIds[0]
    }

    // INSERT nových identifikátorů pod tento subject
    if (newIdentifiersToInsert.length > 0) {
      const rows = newIdentifiersToInsert.map((i) => ({
        subject_id: subjectId,
        type: i.type,
        value: i.normalizedValue,
        value_hash: i.hash,
        value_masked: i.masked,
      }))
      const { error: idInsertErr } = await supabaseAdmin()
        .from('subject_identifiers')
        .insert(rows)
      if (idInsertErr) {
        if (idInsertErr.code === '23505') {
          // Race condition: another request inserted same value_hash
          // between our SELECT and INSERT.
          if (wasNewSubject) {
            await supabaseAdmin().from('subjects').delete().eq('id', subjectId)
          }
          return NextResponse.json(
            { error: 'Konflikt: stejné nahlášení bylo právě zpracováno. Zkuste to znovu.' },
            { status: 409 },
          )
        }
        console.error('Report identifier insert failed:', idInsertErr)
        return NextResponse.json(
          { error: 'Nepodařilo se uložit identifikátory.' },
          { status: 500 },
        )
      }
    }
  } catch (err) {
    console.error('Report subject matching exception:', err)
    return NextResponse.json(
      { error: 'Chyba při zpracování identifikátorů.' },
      { status: 500 },
    )
  }

  // 7. AI precheck (shared lib, bez HTTP roundtripu)
  const aiResult = await runAiPrecheck({
    category: parsed.category,
    category_other: parsed.category_other,
    severity: parsed.severity,
    incident_date: parsed.incident_date,
    amount_czk: parsed.amount_czk,
    platform: parsed.platform,
    platform_other: parsed.platform_other,
    description: parsed.description,
    evidence_summary: {
      count: parsed.files.length,
      types: parsed.files.map((f) => mimeToEvidenceType(f.type)),
    },
  })

  // 8. Determine notification email (priority: contact > identifier type=email)
  let notification_email: string | null = parsed.contact_for_subject_email
  if (!notification_email) {
    const emailIdentifier = parsedIdentifiers.find((i) => i.type === 'email')
    if (emailIdentifier) {
      notification_email = emailIdentifier.normalizedValue
    }
  }

  // 9. Compute initial status
  let initialStatus: IncidentStatus
  if (needsMergeReview) {
    initialStatus = 'pending_merge_review'
  } else if (aiResult.confidence_score < 60) {
    initialStatus = 'pending'
  } else {
    initialStatus = 'ai_reviewed'
  }

  // 10. INSERT incident
  let incidentId: string
  try {
    const { data: newIncident, error: incidentInsertErr } = await supabaseAdmin()
      .from('incidents')
      .insert({
        reporter_id: userId,
        subject_id: subjectId,
        incident_date: parsed.incident_date,
        platform: parsed.platform,
        platform_other: parsed.platform_other,
        category: parsed.category,
        category_other: parsed.category_other,
        severity: parsed.severity,
        amount_czk: parsed.amount_czk,
        description: parsed.description,
        contact_for_subject_email: parsed.contact_for_subject_email,
        ai_confidence_score: aiResult.confidence_score,
        ai_summary: aiResult.ai_summary,
        ai_red_flags: aiResult.red_flags,
        status: initialStatus,
        notification_email,
      })
      .select('id')
      .single()

    if (incidentInsertErr || !newIncident) {
      console.error('Report incident insert failed:', incidentInsertErr)
      return NextResponse.json(
        { error: 'Nepodařilo se vytvořit nahlášení.' },
        { status: 500 },
      )
    }
    incidentId = newIncident.id
  } catch (err) {
    console.error('Report incident insert exception:', err)
    return NextResponse.json(
      { error: 'Chyba při vytváření nahlášení.' },
      { status: 500 },
    )
  }

  // 11. Upload souborů + INSERT evidence (s rollbackem při chybě)
  const uploadedPaths: string[] = []
  try {
    for (const file of parsed.files) {
      const fileHash = await hashFile(file)
      const ext = MIME_TO_EXT[file.type] ?? 'bin'
      const path = `${incidentId}/${fileHash}.${ext}`

      const { error: uploadErr } = await supabaseAdmin()
        .storage.from(STORAGE_BUCKET)
        .upload(path, file, {
          contentType: file.type,
          upsert: false,
          cacheControl: '3600',
        })

      if (uploadErr) {
        throw new Error(`Upload "${file.name}" selhal: ${uploadErr.message}`)
      }
      uploadedPaths.push(path)

      const { error: evidenceInsertErr } = await supabaseAdmin()
        .from('evidence')
        .insert({
          incident_id: incidentId,
          type: mimeToEvidenceType(file.type),
          file_path: path,
          file_hash: fileHash,
          file_size_bytes: file.size,
          mime_type: file.type,
        })

      if (evidenceInsertErr) {
        throw new Error(`Evidence DB insert selhal: ${evidenceInsertErr.message}`)
      }
    }
  } catch (err) {
    console.error('Report evidence upload failed, rolling back:', err)
    // Rollback: smaž uploadnuté soubory + incident (CASCADE smaže evidence rows)
    if (uploadedPaths.length > 0) {
      try {
        await supabaseAdmin().storage.from(STORAGE_BUCKET).remove(uploadedPaths)
      } catch (cleanupErr) {
        console.error('Rollback storage cleanup failed:', cleanupErr)
      }
    }
    try {
      await supabaseAdmin().from('incidents').delete().eq('id', incidentId)
    } catch (cleanupErr) {
      console.error('Rollback incident delete failed:', cleanupErr)
    }
    return NextResponse.json(
      { error: 'Nepodařilo se uložit důkazy. Zkuste to znovu.' },
      { status: 500 },
    )
  }

  // 12. Notification email + status='notified' transition
  // TODO: Notification email k subjektu (email B) bude přidána později.
  // Status zůstává initialStatus — žádný přechod na 'notified'.
  const finalStatus: IncidentStatus = initialStatus

  // 12b. Best-effort potvrzení nahlašovateli (email A).
  // Selhání NESMÍ shodit request — incident je už uložený.
  try {
    await sendReporterConfirmation(userEmail, incidentId)
  } catch (err) {
    console.error('Reporter confirmation email exception:', err)
  }

  // 13. Audit log
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null
    const userAgent = req.headers.get('user-agent') || null
    // consent_at je server-side čas přijetí submitu — referenční bod pro
    // doložitelnost při právním sporu. Drží se pohromadě s IP+UA, takže
    // jeden audit_log řádek tvoří kompletní forenzní snímek.
    const consentAt = new Date().toISOString()
    await supabaseAdmin()
      .from('audit_log')
      .insert({
        actor_type: 'reporter',
        actor_id: userId,
        action: 'create_incident',
        target_type: 'incident',
        target_id: incidentId,
        ip_address: ip,
        user_agent: userAgent,
        metadata: {
          phase: 'commit',
          subject_id: subjectId,
          status: finalStatus,
          ai_confidence_score: aiResult.confidence_score,
          ai_recommendation: aiResult.recommendation,
          red_flag_count: aiResult.red_flags.length,
          files_count: parsed.files.length,
          new_identifiers_count: newIdentifiersToInsert.length,
          needs_merge_review: needsMergeReview,
          conflicting_subject_ids: conflictingSubjectIds,
          consent: {
            truth_confirmed: parsed.truth_confirmation,
            data_processing_consent: parsed.data_processing_consent,
            law_enforcement_consent: parsed.law_enforcement_consent,
            version: parsed.consent_version,
            consent_at: consentAt,
          },
        },
      })
  } catch (err) {
    // TODO: Silent audit failures are bad for forensics. In v2 send
    // to monitoring (Sentry) and consider failing the request if
    // audit is critical.
    console.error('Report audit_log insert failed:', err)
  }

  // 14. Response
  return NextResponse.json(
    {
      incident_id: incidentId,
      status: finalStatus,
      message: statusMessage(finalStatus),
    },
    { status: 201 },
  )
}
