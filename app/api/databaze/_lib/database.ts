/**
 * Minimal Database type pro tabulky z `/databaze` modulu.
 *
 * Dokud nejsou vygenerované `types/supabase.ts` přes
 * `supabase gen types typescript`, tahle definice slouží
 * jako typový kontrakt pro server-side Supabase admin client.
 *
 * Pokrývá tabulky:
 * - reporters
 * - subjects
 * - subject_identifiers
 * - incidents
 * - evidence
 * - audit_log
 *
 * Až budou generated types k dispozici, tohle nahradíme
 * importem `Database['public']` z `@/types/supabase`.
 */

import type {
  IdentifierType,
  IncidentCategory,
  IncidentPlatform,
  IncidentSeverity,
  IncidentStatus,
  EvidenceType,
  ReporterTrustLevel,
  SubjectVisibility,
} from '@/types/databaze'

// ── reporters ─────────────────────────────────────────

export type ReporterRow = {
  id: string
  email: string
  phone: string | null
  phone_verified: boolean
  bank_id_verified: boolean
  trust_level: ReporterTrustLevel
  reports_count: number
  false_reports_count: number
  banned: boolean
  banned_reason: string | null
  banned_at: string | null
  created_at: string
  updated_at: string
}

export type ReporterInsert = {
  id: string
  email: string
  phone?: string | null
  phone_verified?: boolean
  bank_id_verified?: boolean
  trust_level?: ReporterTrustLevel
  reports_count?: number
  false_reports_count?: number
  banned?: boolean
  banned_reason?: string | null
  banned_at?: string | null
  created_at?: string
  updated_at?: string
}


// ── subjects ──────────────────────────────────────────

export type SubjectRow = {
  id: string
  display_name_masked: string | null
  claimed_by: string | null
  claim_paid_until: string | null
  trust_score: number
  visibility_status: SubjectVisibility
  created_at: string
  updated_at: string
}

export type SubjectInsert = {
  id?: string
  display_name_masked?: string | null
  claimed_by?: string | null
  claim_paid_until?: string | null
  trust_score?: number
  visibility_status?: SubjectVisibility
  created_at?: string
  updated_at?: string
}


// ── subject_identifiers ───────────────────────────────

export type SubjectIdentifierRow = {
  id: string
  subject_id: string
  type: IdentifierType
  value: string
  value_hash: string
  value_masked: string
  verified: boolean
  created_at: string
}

export type SubjectIdentifierInsert = {
  id?: string
  subject_id: string
  type: IdentifierType
  value: string
  value_hash: string
  value_masked: string
  verified?: boolean
  created_at?: string
}


// ── incidents ─────────────────────────────────────────

export type IncidentRow = {
  id: string
  reporter_id: string
  subject_id: string
  incident_date: string
  platform: IncidentPlatform
  platform_other: string | null
  category: IncidentCategory
  category_other: string | null
  severity: IncidentSeverity
  amount_czk: number
  description: string
  contact_for_subject_email: string | null
  ai_confidence_score: number | null
  ai_summary: string | null
  ai_red_flags: unknown
  status: IncidentStatus
  notification_sent_at: string | null
  notification_email: string | null
  public_at: string | null
  objection_at: string | null
  removed_at: string | null
  removed_reason: string | null
  created_at: string
  updated_at: string
}

export type IncidentInsert = {
  id?: string
  reporter_id: string
  subject_id: string
  incident_date: string
  platform: IncidentPlatform
  platform_other?: string | null
  category: IncidentCategory
  category_other?: string | null
  severity: IncidentSeverity
  amount_czk?: number
  description: string
  contact_for_subject_email?: string | null
  ai_confidence_score?: number | null
  ai_summary?: string | null
  ai_red_flags?: unknown
  status?: IncidentStatus
  notification_sent_at?: string | null
  notification_email?: string | null
  public_at?: string | null
  objection_at?: string | null
  removed_at?: string | null
  removed_reason?: string | null
  created_at?: string
  updated_at?: string
}


// ── evidence ──────────────────────────────────────────

export type EvidenceRow = {
  id: string
  incident_id: string
  type: EvidenceType
  file_path: string
  file_hash: string
  file_size_bytes: number
  mime_type: string
  uploaded_at: string
  deleted_at: string | null
}

export type EvidenceInsert = {
  id?: string
  incident_id: string
  type: EvidenceType
  file_path: string
  file_hash: string
  file_size_bytes: number
  mime_type: string
  uploaded_at?: string
  deleted_at?: string | null
}


// ── audit_log ─────────────────────────────────────────

// target_id: per migrace `target_id uuid NOT NULL` — povinný, ne nullable.
// Audit log se zapisuje JEN když existuje konkrétní target_id (např. po
// vytvoření incidentu). Pro intermediate phase (precheck) se audit
// neukládá vůbec.

export type AuditLogRow = {
  id: string
  actor_type: 'reporter' | 'admin' | 'system' | 'public'
  actor_id: string | null
  action: string
  target_type: 'incident' | 'subject' | 'evidence' | 'reporter' | 'objection' | 'subscription'
  target_id: string
  ip_address: string | null
  user_agent: string | null
  metadata: Record<string, unknown>
  created_at: string
}

export type AuditLogInsert = {
  id?: string
  actor_type: 'reporter' | 'admin' | 'system' | 'public'
  actor_id?: string | null
  action: string
  target_type: 'incident' | 'subject' | 'evidence' | 'reporter' | 'objection' | 'subscription'
  target_id: string
  ip_address?: string | null
  user_agent?: string | null
  metadata?: Record<string, unknown>
  created_at?: string
}


// ── Database wrapper ──────────────────────────────────

export type DatabazeDatabase = {
  public: {
    Tables: {
      reporters: {
        Row: ReporterRow
        Insert: ReporterInsert
        Update: Partial<ReporterInsert>
        Relationships: []
      }
      subjects: {
        Row: SubjectRow
        Insert: SubjectInsert
        Update: Partial<SubjectInsert>
        Relationships: []
      }
      subject_identifiers: {
        Row: SubjectIdentifierRow
        Insert: SubjectIdentifierInsert
        Update: Partial<SubjectIdentifierInsert>
        Relationships: []
      }
      incidents: {
        Row: IncidentRow
        Insert: IncidentInsert
        Update: Partial<IncidentInsert>
        Relationships: []
      }
      evidence: {
        Row: EvidenceRow
        Insert: EvidenceInsert
        Update: Partial<EvidenceInsert>
        Relationships: []
      }
      audit_log: {
        Row: AuditLogRow
        Insert: AuditLogInsert
        Update: Partial<AuditLogInsert>
        Relationships: []
      }
    }
    Views: { [_ in never]: never }
    Functions: { [_ in never]: never }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}
