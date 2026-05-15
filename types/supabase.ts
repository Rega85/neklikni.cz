/**
 * Supabase generated TypeScript types
 *
 * Generated from schema based on:
 * - supabase/migrations/20260225_referral_system.sql
 * - supabase/migrations/20260226_processed_events.sql
 * - supabase/migrations/20260504_*.sql
 * - supabase/migrations/20260505_leads_table.sql
 * - supabase/migrations/20260514_120000_create_reports_database.sql
 *
 * Project ID: vmmarcpljeabbykkfszz
 *
 * Note: Toto je ručně vygenerované podle migrací. V budoucnu lze
 * regenerovat přes `npx supabase gen types typescript --project-id vmmarcpljeabbykkfszz`
 * pokud se rozhodneš spustit CLI login.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      // ============================================================
      // EXISTING TABLES (z předchozích migrací)
      // ============================================================

      user_profiles: {
        Row: {
          id: string
          email: string | null
          credits_remaining: number
          referral_code: string | null
          referred_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email?: string | null
          credits_remaining?: number
          referral_code?: string | null
          referred_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string | null
          credits_remaining?: number
          referral_code?: string | null
          referred_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }

      usage_log: {
        Row: {
          id: string
          user_id: string
          action: string
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          action: string
          metadata?: Json
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          action?: string
          metadata?: Json
          created_at?: string
        }
      }

      shared_results: {
        Row: {
          id: string
          user_id: string | null
          payload: Json
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          payload: Json
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          payload?: Json
          created_at?: string
        }
      }

      processed_events: {
        Row: {
          event_id: string
          processed_at: string
        }
        Insert: {
          event_id: string
          processed_at?: string
        }
        Update: {
          event_id?: string
          processed_at?: string
        }
      }

      anonymous_usage: {
        Row: {
          ip_hash: string
          date: string
          count: number
        }
        Insert: {
          ip_hash: string
          date: string
          count?: number
        }
        Update: {
          ip_hash?: string
          date?: string
          count?: number
        }
      }

      usage_daily: {
        Row: {
          identifier: string
          date: string
          count: number
        }
        Insert: {
          identifier: string
          date: string
          count?: number
        }
        Update: {
          identifier?: string
          date?: string
          count?: number
        }
      }

      stats: {
        Row: {
          key: string
          value: number
          updated_at: string
        }
        Insert: {
          key: string
          value?: number
          updated_at?: string
        }
        Update: {
          key?: string
          value?: number
          updated_at?: string
        }
      }

      site_stats: {
        Row: {
          key: string
          value: number
          updated_at: string
        }
        Insert: {
          key: string
          value?: number
          updated_at?: string
        }
        Update: {
          key?: string
          value?: number
          updated_at?: string
        }
      }

      leads: {
        Row: {
          id: string
          email: string
          source: string
          created_at: string
        }
        Insert: {
          id?: string
          email: string
          source?: string
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          source?: string
          created_at?: string
        }
      }

      // ============================================================
      // DATABÁZE NAHLÁŠENÍ TABLES (migrace 20260514_120000)
      // ============================================================

      reporters: {
        Row: {
          id: string
          email: string
          phone: string | null
          phone_verified: boolean
          bank_id_verified: boolean
          trust_level: Database['public']['Enums']['reporter_trust_level']
          reports_count: number
          false_reports_count: number
          banned: boolean
          banned_reason: string | null
          banned_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          phone?: string | null
          phone_verified?: boolean
          bank_id_verified?: boolean
          trust_level?: Database['public']['Enums']['reporter_trust_level']
          reports_count?: number
          false_reports_count?: number
          banned?: boolean
          banned_reason?: string | null
          banned_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          phone?: string | null
          phone_verified?: boolean
          bank_id_verified?: boolean
          trust_level?: Database['public']['Enums']['reporter_trust_level']
          reports_count?: number
          false_reports_count?: number
          banned?: boolean
          banned_reason?: string | null
          banned_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }

      subjects: {
        Row: {
          id: string
          display_name_masked: string | null
          claimed_by: string | null
          claim_paid_until: string | null
          trust_score: number
          visibility_status: Database['public']['Enums']['subject_visibility']
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          display_name_masked?: string | null
          claimed_by?: string | null
          claim_paid_until?: string | null
          trust_score?: number
          visibility_status?: Database['public']['Enums']['subject_visibility']
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          display_name_masked?: string | null
          claimed_by?: string | null
          claim_paid_until?: string | null
          trust_score?: number
          visibility_status?: Database['public']['Enums']['subject_visibility']
          created_at?: string
          updated_at?: string
        }
      }

      subject_identifiers: {
        Row: {
          id: string
          subject_id: string
          type: Database['public']['Enums']['identifier_type']
          value: string
          value_hash: string
          value_masked: string
          verified: boolean
          created_at: string
        }
        Insert: {
          id?: string
          subject_id: string
          type: Database['public']['Enums']['identifier_type']
          value: string
          value_hash: string
          value_masked: string
          verified?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          subject_id?: string
          type?: Database['public']['Enums']['identifier_type']
          value?: string
          value_hash?: string
          value_masked?: string
          verified?: boolean
          created_at?: string
        }
      }

      incidents: {
        Row: {
          id: string
          reporter_id: string
          subject_id: string
          incident_date: string
          platform: Database['public']['Enums']['incident_platform']
          platform_other: string | null
          category: Database['public']['Enums']['incident_category']
          category_other: string | null
          severity: Database['public']['Enums']['incident_severity']
          amount_czk: number
          description: string
          contact_for_subject_email: string | null
          ai_confidence_score: number | null
          ai_summary: string | null
          ai_red_flags: Json
          status: Database['public']['Enums']['incident_status']
          notification_sent_at: string | null
          notification_email: string | null
          public_at: string | null
          objection_at: string | null
          removed_at: string | null
          removed_reason: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          reporter_id: string
          subject_id: string
          incident_date: string
          platform: Database['public']['Enums']['incident_platform']
          platform_other?: string | null
          category: Database['public']['Enums']['incident_category']
          category_other?: string | null
          severity: Database['public']['Enums']['incident_severity']
          amount_czk?: number
          description: string
          contact_for_subject_email?: string | null
          ai_confidence_score?: number | null
          ai_summary?: string | null
          ai_red_flags?: Json
          status?: Database['public']['Enums']['incident_status']
          notification_sent_at?: string | null
          notification_email?: string | null
          public_at?: string | null
          objection_at?: string | null
          removed_at?: string | null
          removed_reason?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          reporter_id?: string
          subject_id?: string
          incident_date?: string
          platform?: Database['public']['Enums']['incident_platform']
          platform_other?: string | null
          category?: Database['public']['Enums']['incident_category']
          category_other?: string | null
          severity?: Database['public']['Enums']['incident_severity']
          amount_czk?: number
          description?: string
          contact_for_subject_email?: string | null
          ai_confidence_score?: number | null
          ai_summary?: string | null
          ai_red_flags?: Json
          status?: Database['public']['Enums']['incident_status']
          notification_sent_at?: string | null
          notification_email?: string | null
          public_at?: string | null
          objection_at?: string | null
          removed_at?: string | null
          removed_reason?: string | null
          created_at?: string
          updated_at?: string
        }
      }

      evidence: {
        Row: {
          id: string
          incident_id: string
          type: Database['public']['Enums']['evidence_type']
          file_path: string
          file_hash: string
          file_size_bytes: number
          mime_type: string
          uploaded_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          incident_id: string
          type: Database['public']['Enums']['evidence_type']
          file_path: string
          file_hash: string
          file_size_bytes: number
          mime_type: string
          uploaded_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          incident_id?: string
          type?: Database['public']['Enums']['evidence_type']
          file_path?: string
          file_hash?: string
          file_size_bytes?: number
          mime_type?: string
          uploaded_at?: string
          deleted_at?: string | null
        }
      }

      objections: {
        Row: {
          id: string
          incident_id: string
          access_token: string
          raised_by_email: string
          raised_by_phone: string | null
          identity_verified: boolean
          reason: string
          evidence_path: string | null
          status: Database['public']['Enums']['objection_status']
          admin_note: string | null
          resolved_by: string | null
          resolved_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          incident_id: string
          access_token: string
          raised_by_email: string
          raised_by_phone?: string | null
          identity_verified?: boolean
          reason: string
          evidence_path?: string | null
          status?: Database['public']['Enums']['objection_status']
          admin_note?: string | null
          resolved_by?: string | null
          resolved_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          incident_id?: string
          access_token?: string
          raised_by_email?: string
          raised_by_phone?: string | null
          identity_verified?: boolean
          reason?: string
          evidence_path?: string | null
          status?: Database['public']['Enums']['objection_status']
          admin_note?: string | null
          resolved_by?: string | null
          resolved_at?: string | null
          created_at?: string
        }
      }

      audit_log: {
        Row: {
          id: string
          actor_type: Database['public']['Enums']['audit_actor_type']
          actor_id: string | null
          action: Database['public']['Enums']['audit_action']
          target_type: Database['public']['Enums']['audit_target_type']
          target_id: string
          ip_address: string | null
          user_agent: string | null
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          actor_type: Database['public']['Enums']['audit_actor_type']
          actor_id?: string | null
          action: Database['public']['Enums']['audit_action']
          target_type: Database['public']['Enums']['audit_target_type']
          target_id: string
          ip_address?: string | null
          user_agent?: string | null
          metadata?: Json
          created_at?: string
        }
        Update: {
          id?: string
          actor_type?: Database['public']['Enums']['audit_actor_type']
          actor_id?: string | null
          action?: Database['public']['Enums']['audit_action']
          target_type?: Database['public']['Enums']['audit_target_type']
          target_id?: string
          ip_address?: string | null
          user_agent?: string | null
          metadata?: Json
          created_at?: string
        }
      }

      claim_subscriptions: {
        Row: {
          id: string
          subject_id: string
          reporter_id: string
          stripe_customer_id: string
          stripe_subscription_id: string
          status: Database['public']['Enums']['claim_subscription_status']
          current_period_end: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          subject_id: string
          reporter_id: string
          stripe_customer_id: string
          stripe_subscription_id: string
          status: Database['public']['Enums']['claim_subscription_status']
          current_period_end: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          subject_id?: string
          reporter_id?: string
          stripe_customer_id?: string
          stripe_subscription_id?: string
          status?: Database['public']['Enums']['claim_subscription_status']
          current_period_end?: string
          created_at?: string
          updated_at?: string
        }
      }

      claim_responses: {
        Row: {
          id: string
          incident_id: string
          responder_id: string
          response_text: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          incident_id: string
          responder_id: string
          response_text: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          incident_id?: string
          responder_id?: string
          response_text?: string
          created_at?: string
          updated_at?: string
        }
      }

      app_admins: {
        Row: {
          user_id: string
          created_at: string
        }
        Insert: {
          user_id: string
          created_at?: string
        }
        Update: {
          user_id?: string
          created_at?: string
        }
      }
    }

    Views: {
      subject_identifiers_public: {
        Row: {
          id: string
          subject_id: string
          type: Database['public']['Enums']['identifier_type']
          value_masked: string
          verified: boolean
          created_at: string
        }
      }
    }

    Functions: {
      // ============================================================
      // EXISTING FUNCTIONS (z předchozích migrací)
      // ============================================================

      apply_referral: {
        Args: {
          p_new_user_id: string
          p_ref_code: string
        }
        Returns: boolean
      }

      generate_referral_code: {
        Args: Record<PropertyKey, never>
        Returns: string
      }

      // ============================================================
      // DATABAZE FUNCTIONS (migrace 20260514_120000)
      // ============================================================

      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }

      calculate_trust_score: {
        Args: {
          p_subject_id: string
        }
        Returns: number
      }

      get_objection_by_token: {
        Args: {
          p_token: string
        }
        Returns: Database['public']['Tables']['objections']['Row']
      }
    }

    Enums: {
      // Databáze nahlášení enumy (migrace 20260514_120000)
      reporter_trust_level: 'anonymous' | 'verified' | 'premium'

      subject_visibility:
        | 'active'
        | 'hidden_objection'
        | 'removed'
        | 'pending'

      identifier_type:
        | 'phone'
        | 'account'
        | 'email'
        | 'facebook_url'
        | 'var_symbol'
        | 'other'

      incident_platform:
        | 'fb_marketplace'
        | 'fb_groups'
        | 'sbazar'
        | 'bazos'
        | 'vinted'
        | 'aukro'
        | 'email'
        | 'sms'
        | 'phone'
        | 'other'

      incident_category:
        | 'non_delivery'
        | 'misrepresentation'
        | 'fake_courier'
        | 'disappeared_listing'
        | 'fake_profile'
        | 'romance'
        | 'investment'
        | 'rental'
        | 'tickets'
        | 'employment'
        | 'other'

      incident_severity:
        | 'attempt'
        | 'minor'
        | 'medium'
        | 'major'
        | 'severe'

      incident_status:
        | 'pending'
        | 'pending_merge_review'
        | 'ai_reviewed'
        | 'notified'
        | 'published'
        | 'objected'
        | 'removed'

      evidence_type:
        | 'screenshot'
        | 'payment_proof'
        | 'communication'
        | 'other'

      objection_status: 'pending' | 'upheld' | 'rejected' | 'partial'

      audit_actor_type: 'reporter' | 'admin' | 'system' | 'public'

      audit_action:
        | 'view_evidence'
        | 'view_full_identifier'
        | 'create_incident'
        | 'update_incident'
        | 'remove_incident'
        | 'create_objection'
        | 'resolve_objection'
        | 'grant_claim'
        | 'revoke_claim'
        | 'process_payment'
        | 'merge_subjects'
        | 'export_data'

      audit_target_type:
        | 'incident'
        | 'subject'
        | 'evidence'
        | 'reporter'
        | 'objection'
        | 'subscription'

      claim_subscription_status:
        | 'active'
        | 'past_due'
        | 'canceled'
        | 'incomplete'
    }

    CompositeTypes: Record<string, never>
  }
}

// ============================================================
// HELPER TYPES — convenience aliasy
// ============================================================

/**
 * Convenience helper: typovaný řádek konkrétní tabulky.
 *
 * Příklad:
 *   const incident: Tables<'incidents'> = await supabase
 *     .from('incidents')
 *     .select('*')
 *     .single()
 */
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']

/**
 * Convenience helper: insert payload pro konkrétní tabulku.
 *
 * Příklad:
 *   const newIncident: TablesInsert<'incidents'> = { ... }
 *   await supabase.from('incidents').insert(newIncident)
 */
export type TablesInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert']

/**
 * Convenience helper: update payload pro konkrétní tabulku.
 */
export type TablesUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update']

/**
 * Convenience helper: enum hodnoty.
 *
 * Příklad:
 *   const severity: Enums<'incident_severity'> = 'major'
 */
export type Enums<T extends keyof Database['public']['Enums']> =
  Database['public']['Enums'][T]
