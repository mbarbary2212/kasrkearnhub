export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      access_requests: {
        Row: {
          created_at: string | null
          email: string
          full_name: string
          id: string
          job_title: string | null
          notes: string | null
          request_type: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          full_name: string
          id?: string
          job_title?: string | null
          notes?: string | null
          request_type?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          full_name?: string
          id?: string
          job_title?: string | null
          notes?: string | null
          request_type?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
        }
        Relationships: []
      }
      activity_logs: {
        Row: {
          action: string
          actor_role: string | null
          actor_user_id: string
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          metadata: Json | null
          scope: Json | null
        }
        Insert: {
          action: string
          actor_role?: string | null
          actor_user_id: string
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          metadata?: Json | null
          scope?: Json | null
        }
        Update: {
          action?: string
          actor_role?: string | null
          actor_user_id?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          metadata?: Json | null
          scope?: Json | null
        }
        Relationships: []
      }
      admin_actions: {
        Row: {
          action: string
          admin_user_id: string
          created_at: string
          id: string
          reason: string | null
          target_user_id: string
        }
        Insert: {
          action: string
          admin_user_id: string
          created_at?: string
          id?: string
          reason?: string | null
          target_user_id: string
        }
        Update: {
          action?: string
          admin_user_id?: string
          created_at?: string
          id?: string
          reason?: string | null
          target_user_id?: string
        }
        Relationships: []
      }
      admin_api_keys: {
        Row: {
          api_key_encrypted: string
          created_at: string
          key_hint: string
          provider: string
          revoked_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          api_key_encrypted: string
          created_at?: string
          key_hint: string
          provider?: string
          revoked_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          api_key_encrypted?: string
          created_at?: string
          key_hint?: string
          provider?: string
          revoked_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      admin_documents: {
        Row: {
          chapter_id: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          doc_type: string | null
          file_name: string
          file_size: number | null
          id: string
          is_deleted: boolean | null
          mime_type: string
          module_id: string | null
          storage_bucket: string
          storage_path: string
          tags: string[] | null
          title: string
          topic_id: string | null
        }
        Insert: {
          chapter_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          doc_type?: string | null
          file_name: string
          file_size?: number | null
          id?: string
          is_deleted?: boolean | null
          mime_type: string
          module_id?: string | null
          storage_bucket?: string
          storage_path: string
          tags?: string[] | null
          title: string
          topic_id?: string | null
        }
        Update: {
          chapter_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          doc_type?: string | null
          file_name?: string
          file_size?: number | null
          id?: string
          is_deleted?: boolean | null
          mime_type?: string
          module_id?: string | null
          storage_bucket?: string
          storage_path?: string
          tags?: string[] | null
          title?: string
          topic_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_documents_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "module_chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_documents_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_documents_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_email_preferences: {
        Row: {
          created_at: string
          id: string
          notify_access_requests: boolean
          notify_new_content: boolean
          notify_new_feedback: boolean
          notify_new_inquiries: boolean
          notify_ticket_assigned: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          notify_access_requests?: boolean
          notify_new_content?: boolean
          notify_new_feedback?: boolean
          notify_new_inquiries?: boolean
          notify_ticket_assigned?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          notify_access_requests?: boolean
          notify_new_content?: boolean
          notify_new_feedback?: boolean
          notify_new_inquiries?: boolean
          notify_ticket_assigned?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      admin_help_files: {
        Row: {
          category: string
          created_at: string
          created_by: string | null
          description: string | null
          display_order: number | null
          file_name: string
          file_url: string
          id: string
          template_type: string | null
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          category: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_order?: number | null
          file_name: string
          file_url: string
          id?: string
          template_type?: string | null
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_order?: number | null
          file_name?: string
          file_url?: string
          id?: string
          template_type?: string | null
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      admin_notifications: {
        Row: {
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          is_read: boolean
          message: string
          metadata: Json | null
          read_at: string | null
          recipient_id: string
          title: string
          type: string
        }
        Insert: {
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          is_read?: boolean
          message: string
          metadata?: Json | null
          read_at?: string | null
          recipient_id: string
          title: string
          type: string
        }
        Update: {
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          is_read?: boolean
          message?: string
          metadata?: Json | null
          read_at?: string | null
          recipient_id?: string
          title?: string
          type?: string
        }
        Relationships: []
      }
      admin_replies: {
        Row: {
          admin_id: string
          created_at: string
          id: string
          is_read: boolean
          message: string
          thread_id: string
          thread_type: string
        }
        Insert: {
          admin_id: string
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          thread_id: string
          thread_type: string
        }
        Update: {
          admin_id?: string
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          thread_id?: string
          thread_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_replies_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_batch_jobs: {
        Row: {
          additional_instructions: string | null
          admin_id: string
          auto_approve: boolean
          chapter_id: string | null
          completed_at: string | null
          content_types: Json
          created_at: string | null
          current_step: number
          document_id: string | null
          duplicate_stats: Json | null
          error_message: string | null
          id: string
          job_ids: Json | null
          module_id: string
          per_section: boolean | null
          quantities: Json
          started_at: string | null
          status: string
          step_results: Json | null
          stop_on_failure: boolean | null
          total_steps: number
        }
        Insert: {
          additional_instructions?: string | null
          admin_id: string
          auto_approve?: boolean
          chapter_id?: string | null
          completed_at?: string | null
          content_types?: Json
          created_at?: string | null
          current_step?: number
          document_id?: string | null
          duplicate_stats?: Json | null
          error_message?: string | null
          id?: string
          job_ids?: Json | null
          module_id: string
          per_section?: boolean | null
          quantities?: Json
          started_at?: string | null
          status?: string
          step_results?: Json | null
          stop_on_failure?: boolean | null
          total_steps?: number
        }
        Update: {
          additional_instructions?: string | null
          admin_id?: string
          auto_approve?: boolean
          chapter_id?: string | null
          completed_at?: string | null
          content_types?: Json
          created_at?: string | null
          current_step?: number
          document_id?: string | null
          duplicate_stats?: Json | null
          error_message?: string | null
          id?: string
          job_ids?: Json | null
          module_id?: string
          per_section?: boolean | null
          quantities?: Json
          started_at?: string | null
          status?: string
          step_results?: Json | null
          stop_on_failure?: boolean | null
          total_steps?: number
        }
        Relationships: [
          {
            foreignKeyName: "ai_batch_jobs_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "module_chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_batch_jobs_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "admin_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_batch_jobs_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_case_insights: {
        Row: {
          avg_score: number | null
          case_id: string
          common_gaps: Json | null
          common_strengths: Json | null
          id: string
          total_attempts: number | null
          updated_at: string | null
        }
        Insert: {
          avg_score?: number | null
          case_id: string
          common_gaps?: Json | null
          common_strengths?: Json | null
          id?: string
          total_attempts?: number | null
          updated_at?: string | null
        }
        Update: {
          avg_score?: number | null
          case_id?: string
          common_gaps?: Json | null
          common_strengths?: Json | null
          id?: string
          total_attempts?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_case_insights_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: true
            referencedRelation: "virtual_patient_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_case_messages: {
        Row: {
          attempt_id: string
          content: string
          created_at: string
          id: string
          role: string
          structured_data: Json | null
          turn_number: number
        }
        Insert: {
          attempt_id: string
          content: string
          created_at?: string
          id?: string
          role: string
          structured_data?: Json | null
          turn_number?: number
        }
        Update: {
          attempt_id?: string
          content?: string
          created_at?: string
          id?: string
          role?: string
          structured_data?: Json | null
          turn_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "ai_case_messages_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "ai_case_attempt_summary"
            referencedColumns: ["attempt_id"]
          },
          {
            foreignKeyName: "ai_case_messages_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "virtual_patient_attempts"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_generation_jobs: {
        Row: {
          admin_id: string | null
          approved_at: string | null
          approved_by: string | null
          completed_at: string | null
          created_at: string | null
          document_id: string | null
          error_message: string | null
          id: string
          input_metadata: Json | null
          job_type: string
          output_data: Json | null
          status: string
        }
        Insert: {
          admin_id?: string | null
          approved_at?: string | null
          approved_by?: string | null
          completed_at?: string | null
          created_at?: string | null
          document_id?: string | null
          error_message?: string | null
          id?: string
          input_metadata?: Json | null
          job_type: string
          output_data?: Json | null
          status?: string
        }
        Update: {
          admin_id?: string | null
          approved_at?: string | null
          approved_by?: string | null
          completed_at?: string | null
          created_at?: string | null
          document_id?: string | null
          error_message?: string | null
          id?: string
          input_metadata?: Json | null
          job_type?: string
          output_data?: Json | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_generation_jobs_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "admin_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_platform_settings: {
        Row: {
          allow_admin_fallback_to_global_key: boolean
          allow_superadmin_global_ai: boolean
          global_key_disabled_message: string
          id: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          allow_admin_fallback_to_global_key?: boolean
          allow_superadmin_global_ai?: boolean
          global_key_disabled_message?: string
          id?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          allow_admin_fallback_to_global_key?: boolean
          allow_superadmin_global_ai?: boolean
          global_key_disabled_message?: string
          id?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      ai_rules: {
        Row: {
          chapter_id: string | null
          content_type: string
          created_at: string
          created_by: string | null
          id: string
          instructions: string
          is_active: boolean
          module_id: string | null
          notes: string | null
          scope: string
          version: number
        }
        Insert: {
          chapter_id?: string | null
          content_type: string
          created_at?: string
          created_by?: string | null
          id?: string
          instructions: string
          is_active?: boolean
          module_id?: string | null
          notes?: string | null
          scope: string
          version?: number
        }
        Update: {
          chapter_id?: string | null
          content_type?: string
          created_at?: string
          created_by?: string | null
          id?: string
          instructions?: string
          is_active?: boolean
          module_id?: string | null
          notes?: string | null
          scope?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "ai_rules_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "module_chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_rules_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_settings: {
        Row: {
          description: string | null
          id: string
          key: string
          updated_at: string | null
          updated_by: string | null
          value: Json
        }
        Insert: {
          description?: string | null
          id?: string
          key: string
          updated_at?: string | null
          updated_by?: string | null
          value?: Json
        }
        Update: {
          description?: string | null
          id?: string
          key?: string
          updated_at?: string | null
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      ai_usage_events: {
        Row: {
          content_type: string
          cost_estimate: number | null
          created_at: string
          id: string
          key_source: string
          provider: string
          tokens_input: number | null
          tokens_output: number | null
          user_id: string
        }
        Insert: {
          content_type: string
          cost_estimate?: number | null
          created_at?: string
          id?: string
          key_source: string
          provider: string
          tokens_input?: number | null
          tokens_output?: number | null
          user_id: string
        }
        Update: {
          content_type?: string
          cost_estimate?: number | null
          created_at?: string
          id?: string
          key_source?: string
          provider?: string
          tokens_input?: number | null
          tokens_output?: number | null
          user_id?: string
        }
        Relationships: []
      }
      announcement_reads: {
        Row: {
          announcement_id: string
          id: string
          read_at: string
          user_id: string
        }
        Insert: {
          announcement_id: string
          id?: string
          read_at?: string
          user_id: string
        }
        Update: {
          announcement_id?: string
          id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcement_reads_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "announcements"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          content: string
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          is_active: boolean
          module_id: string | null
          pending_approval: boolean
          priority: string
          rejected_at: string | null
          rejected_by: string | null
          rejection_reason: string | null
          target_type: string
          title: string
          updated_at: string
          year_id: string | null
        }
        Insert: {
          content: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          module_id?: string | null
          pending_approval?: boolean
          priority?: string
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          target_type?: string
          title: string
          updated_at?: string
          year_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          module_id?: string | null
          pending_approval?: boolean
          priority?: string
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          target_type?: string
          title?: string
          updated_at?: string
          year_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "announcements_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcements_year_id_fkey"
            columns: ["year_id"]
            isOneToOne: false
            referencedRelation: "years"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_chapter_eligibility: {
        Row: {
          allow_case: boolean
          allow_mcq: boolean
          allow_recall: boolean
          assessment_id: string
          chapter_id: string
          created_at: string
          id: string
          included_in_exam: boolean
          updated_at: string
        }
        Insert: {
          allow_case?: boolean
          allow_mcq?: boolean
          allow_recall?: boolean
          assessment_id: string
          chapter_id: string
          created_at?: string
          id?: string
          included_in_exam?: boolean
          updated_at?: string
        }
        Update: {
          allow_case?: boolean
          allow_mcq?: boolean
          allow_recall?: boolean
          assessment_id?: string
          chapter_id?: string
          created_at?: string
          id?: string
          included_in_exam?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessment_chapter_eligibility_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessment_structures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_chapter_eligibility_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "module_chapters"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_components: {
        Row: {
          assessment_id: string
          component_type: Database["public"]["Enums"]["exam_component_type"]
          created_at: string
          display_order: number
          duration_minutes: number | null
          id: string
          marks_per_question: number
          question_count: number
          total_marks: number | null
        }
        Insert: {
          assessment_id: string
          component_type: Database["public"]["Enums"]["exam_component_type"]
          created_at?: string
          display_order?: number
          duration_minutes?: number | null
          id?: string
          marks_per_question?: number
          question_count?: number
          total_marks?: number | null
        }
        Update: {
          assessment_id?: string
          component_type?: Database["public"]["Enums"]["exam_component_type"]
          created_at?: string
          display_order?: number
          duration_minutes?: number | null
          id?: string
          marks_per_question?: number
          question_count?: number
          total_marks?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "assessment_components_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessment_structures"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_rules: {
        Row: {
          assessment_id: string
          created_at: string
          description: string | null
          id: string
          rule_key: string
          rule_value: Json
          updated_at: string
        }
        Insert: {
          assessment_id: string
          created_at?: string
          description?: string | null
          id?: string
          rule_key: string
          rule_value?: Json
          updated_at?: string
        }
        Update: {
          assessment_id?: string
          created_at?: string
          description?: string | null
          id?: string
          rule_key?: string
          rule_value?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessment_rules_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessment_structures"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_structures: {
        Row: {
          assessment_type: Database["public"]["Enums"]["assessment_type"]
          created_at: string
          created_by: string | null
          duration_minutes: number | null
          exam_type: string
          id: string
          is_active: boolean
          module_id: string
          name: string
          notes: string | null
          total_marks: number
          updated_at: string
          weight_mode: string
          year_id: string
        }
        Insert: {
          assessment_type: Database["public"]["Enums"]["assessment_type"]
          created_at?: string
          created_by?: string | null
          duration_minutes?: number | null
          exam_type?: string
          id?: string
          is_active?: boolean
          module_id: string
          name: string
          notes?: string | null
          total_marks?: number
          updated_at?: string
          weight_mode?: string
          year_id: string
        }
        Update: {
          assessment_type?: Database["public"]["Enums"]["assessment_type"]
          created_at?: string
          created_by?: string | null
          duration_minutes?: number | null
          exam_type?: string
          id?: string
          is_active?: boolean
          module_id?: string
          name?: string
          notes?: string | null
          total_marks?: number
          updated_at?: string
          weight_mode?: string
          year_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessment_structures_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_structures_year_id_fkey"
            columns: ["year_id"]
            isOneToOne: false
            referencedRelation: "years"
            referencedColumns: ["id"]
          },
        ]
      }
      audio_progress: {
        Row: {
          completed: boolean
          duration_seconds: number | null
          id: string
          last_position_seconds: number
          percent_listened: number
          play_count: number
          progress_seconds: number
          resource_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          duration_seconds?: number | null
          id?: string
          last_position_seconds?: number
          percent_listened?: number
          play_count?: number
          progress_seconds?: number
          resource_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed?: boolean
          duration_seconds?: number | null
          id?: string
          last_position_seconds?: number
          percent_listened?: number
          play_count?: number
          progress_seconds?: number
          resource_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audio_progress_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "resources"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          actor_id: string
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          metadata: Json | null
        }
        Insert: {
          action: string
          actor_id: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          metadata?: Json | null
        }
        Update: {
          action?: string
          actor_id?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          metadata?: Json | null
        }
        Relationships: []
      }
      badges: {
        Row: {
          category: string
          code: string
          created_at: string | null
          description: string
          icon_name: string
          id: string
          name: string
          threshold: number | null
          tier: number
        }
        Insert: {
          category: string
          code: string
          created_at?: string | null
          description: string
          icon_name?: string
          id?: string
          name: string
          threshold?: number | null
          tier?: number
        }
        Update: {
          category?: string
          code?: string
          created_at?: string | null
          description?: string
          icon_name?: string
          id?: string
          name?: string
          threshold?: number | null
          tier?: number
        }
        Relationships: []
      }
      card_ratings: {
        Row: {
          card_id: string
          created_at: string | null
          id: string
          rating: Database["public"]["Enums"]["card_rating_type"]
          updated_at: string | null
          user_id: string
        }
        Insert: {
          card_id: string
          created_at?: string | null
          id?: string
          rating: Database["public"]["Enums"]["card_rating_type"]
          updated_at?: string | null
          user_id: string
        }
        Update: {
          card_id?: string
          created_at?: string | null
          id?: string
          rating?: Database["public"]["Enums"]["card_rating_type"]
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      case_attempt_details: {
        Row: {
          case_id: string
          chapter_id: string | null
          completed_at: string
          confidence_score: number | null
          created_at: string
          id: string
          max_score: number
          missing_critical_points: Json | null
          module_id: string | null
          percentage: number
          question_id: string
          reasoning_domain: string | null
          score: number
          topic_id: string | null
          user_id: string
        }
        Insert: {
          case_id: string
          chapter_id?: string | null
          completed_at?: string
          confidence_score?: number | null
          created_at?: string
          id?: string
          max_score?: number
          missing_critical_points?: Json | null
          module_id?: string | null
          percentage?: number
          question_id: string
          reasoning_domain?: string | null
          score?: number
          topic_id?: string | null
          user_id: string
        }
        Update: {
          case_id?: string
          chapter_id?: string | null
          completed_at?: string
          confidence_score?: number | null
          created_at?: string
          id?: string
          max_score?: number
          missing_critical_points?: Json | null
          module_id?: string | null
          percentage?: number
          question_id?: string
          reasoning_domain?: string | null
          score?: number
          topic_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "case_attempt_details_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "case_scenarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_attempt_details_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "case_scenario_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      case_reference_documents: {
        Row: {
          case_id: string | null
          chapter_id: string | null
          created_at: string | null
          doc_category: string
          extracted_text: string | null
          file_type: string
          file_url: string
          id: string
          title: string
          uploaded_by: string | null
        }
        Insert: {
          case_id?: string | null
          chapter_id?: string | null
          created_at?: string | null
          doc_category?: string
          extracted_text?: string | null
          file_type: string
          file_url: string
          id?: string
          title: string
          uploaded_by?: string | null
        }
        Update: {
          case_id?: string | null
          chapter_id?: string | null
          created_at?: string | null
          doc_category?: string
          extracted_text?: string | null
          file_type?: string
          file_url?: string
          id?: string
          title?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "case_reference_documents_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "virtual_patient_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_reference_documents_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "module_chapters"
            referencedColumns: ["id"]
          },
        ]
      }
      case_scenario_questions: {
        Row: {
          case_id: string
          created_at: string
          display_order: number
          explanation: string | null
          id: string
          max_marks: number
          model_answer: string | null
          question_text: string
          question_type: Database["public"]["Enums"]["case_question_type"]
          reasoning_domain: string | null
          rubric_json: Json | null
        }
        Insert: {
          case_id: string
          created_at?: string
          display_order?: number
          explanation?: string | null
          id?: string
          max_marks?: number
          model_answer?: string | null
          question_text: string
          question_type?: Database["public"]["Enums"]["case_question_type"]
          reasoning_domain?: string | null
          rubric_json?: Json | null
        }
        Update: {
          case_id?: string
          created_at?: string
          display_order?: number
          explanation?: string | null
          id?: string
          max_marks?: number
          model_answer?: string | null
          question_text?: string
          question_type?: Database["public"]["Enums"]["case_question_type"]
          reasoning_domain?: string | null
          rubric_json?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "case_scenario_questions_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "case_scenarios"
            referencedColumns: ["id"]
          },
        ]
      }
      case_scenarios: {
        Row: {
          chapter_id: string | null
          created_at: string
          created_by: string | null
          difficulty: Database["public"]["Enums"]["case_difficulty"]
          display_order: number
          id: string
          is_deleted: boolean
          module_id: string | null
          section_id: string | null
          stem: string
          tags: string[] | null
          topic_id: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          chapter_id?: string | null
          created_at?: string
          created_by?: string | null
          difficulty?: Database["public"]["Enums"]["case_difficulty"]
          display_order?: number
          id?: string
          is_deleted?: boolean
          module_id?: string | null
          section_id?: string | null
          stem: string
          tags?: string[] | null
          topic_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          chapter_id?: string | null
          created_at?: string
          created_by?: string | null
          difficulty?: Database["public"]["Enums"]["case_difficulty"]
          display_order?: number
          id?: string
          is_deleted?: boolean
          module_id?: string | null
          section_id?: string | null
          stem?: string
          tags?: string[] | null
          topic_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "case_scenarios_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "module_chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_scenarios_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_scenarios_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_scenarios_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      case_section_answers: {
        Row: {
          ai_feedback: string | null
          attempt_id: string
          created_at: string | null
          id: string
          is_scored: boolean | null
          max_score: number | null
          score: number | null
          section_type: string
          student_answer: Json | null
        }
        Insert: {
          ai_feedback?: string | null
          attempt_id: string
          created_at?: string | null
          id?: string
          is_scored?: boolean | null
          max_score?: number | null
          score?: number | null
          section_type: string
          student_answer?: Json | null
        }
        Update: {
          ai_feedback?: string | null
          attempt_id?: string
          created_at?: string | null
          id?: string
          is_scored?: boolean | null
          max_score?: number | null
          score?: number | null
          section_type?: string
          student_answer?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "case_section_answers_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "ai_case_attempt_summary"
            referencedColumns: ["attempt_id"]
          },
          {
            foreignKeyName: "case_section_answers_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "virtual_patient_attempts"
            referencedColumns: ["id"]
          },
        ]
      }
      chapter_attempts: {
        Row: {
          attempt_number: number
          chapter_id: string
          completed_at: string | null
          correct_count: number
          created_at: string
          id: string
          is_completed: boolean
          module_id: string
          question_type: Database["public"]["Enums"]["practice_question_type"]
          score: number
          started_at: string
          time_spent_seconds: number
          total_questions: number
          updated_at: string
          user_id: string
        }
        Insert: {
          attempt_number?: number
          chapter_id: string
          completed_at?: string | null
          correct_count?: number
          created_at?: string
          id?: string
          is_completed?: boolean
          module_id: string
          question_type: Database["public"]["Enums"]["practice_question_type"]
          score?: number
          started_at?: string
          time_spent_seconds?: number
          total_questions?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          attempt_number?: number
          chapter_id?: string
          completed_at?: string | null
          correct_count?: number
          created_at?: string
          id?: string
          is_completed?: boolean
          module_id?: string
          question_type?: Database["public"]["Enums"]["practice_question_type"]
          score?: number
          started_at?: string
          time_spent_seconds?: number
          total_questions?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chapter_attempts_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "module_chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chapter_attempts_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      chapter_blueprint_config: {
        Row: {
          chapter_id: string
          component_type: string
          created_at: string
          exam_type: string
          id: string
          inclusion_level: string
          module_id: string
          question_types: string[] | null
          section_id: string | null
          updated_at: string
        }
        Insert: {
          chapter_id: string
          component_type: string
          created_at?: string
          exam_type: string
          id?: string
          inclusion_level?: string
          module_id: string
          question_types?: string[] | null
          section_id?: string | null
          updated_at?: string
        }
        Update: {
          chapter_id?: string
          component_type?: string
          created_at?: string
          exam_type?: string
          id?: string
          inclusion_level?: string
          module_id?: string
          question_types?: string[] | null
          section_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chapter_blueprint_config_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "module_chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chapter_blueprint_config_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chapter_blueprint_config_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
        ]
      }
      chapter_component_weights: {
        Row: {
          assessment_id: string
          chapter_id: string
          component_id: string
          created_at: string
          id: string
          updated_at: string
          weight: number
        }
        Insert: {
          assessment_id: string
          chapter_id: string
          component_id: string
          created_at?: string
          id?: string
          updated_at?: string
          weight?: number
        }
        Update: {
          assessment_id?: string
          chapter_id?: string
          component_id?: string
          created_at?: string
          id?: string
          updated_at?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "chapter_component_weights_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessment_structures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chapter_component_weights_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "module_chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chapter_component_weights_component_id_fkey"
            columns: ["component_id"]
            isOneToOne: false
            referencedRelation: "assessment_components"
            referencedColumns: ["id"]
          },
        ]
      }
      chapter_question_upvotes: {
        Row: {
          created_at: string
          id: string
          question_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          question_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          question_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chapter_question_upvotes_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "chapter_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      chapter_questions: {
        Row: {
          answer_text: string | null
          answered_at: string | null
          answered_by: string | null
          chapter_id: string
          created_at: string
          id: string
          is_answered: boolean
          is_hidden: boolean
          is_pinned: boolean
          module_id: string
          question_text: string
          upvote_count: number
          user_id: string
        }
        Insert: {
          answer_text?: string | null
          answered_at?: string | null
          answered_by?: string | null
          chapter_id: string
          created_at?: string
          id?: string
          is_answered?: boolean
          is_hidden?: boolean
          is_pinned?: boolean
          module_id: string
          question_text: string
          upvote_count?: number
          user_id: string
        }
        Update: {
          answer_text?: string | null
          answered_at?: string | null
          answered_by?: string | null
          chapter_id?: string
          created_at?: string
          id?: string
          is_answered?: boolean
          is_hidden?: boolean
          is_pinned?: boolean
          module_id?: string
          question_text?: string
          upvote_count?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chapter_questions_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "module_chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chapter_questions_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_perf_logs: {
        Row: {
          audio_download_ms: number | null
          audio_play_ms: number | null
          case_id: string | null
          chat_ai_ms: number | null
          chat_api_ms: number | null
          chat_db_ms: number | null
          created_at: string
          id: string
          metadata: Json | null
          stt_ms: number | null
          total_ms: number | null
          tts_api_ms: number | null
          tts_generation_ms: number | null
          tts_provider: string | null
          user_id: string
        }
        Insert: {
          audio_download_ms?: number | null
          audio_play_ms?: number | null
          case_id?: string | null
          chat_ai_ms?: number | null
          chat_api_ms?: number | null
          chat_db_ms?: number | null
          created_at?: string
          id?: string
          metadata?: Json | null
          stt_ms?: number | null
          total_ms?: number | null
          tts_api_ms?: number | null
          tts_generation_ms?: number | null
          tts_provider?: string | null
          user_id: string
        }
        Update: {
          audio_download_ms?: number | null
          audio_play_ms?: number | null
          case_id?: string | null
          chat_ai_ms?: number | null
          chat_api_ms?: number | null
          chat_db_ms?: number | null
          created_at?: string
          id?: string
          metadata?: Json | null
          stt_ms?: number | null
          total_ms?: number | null
          tts_api_ms?: number | null
          tts_generation_ms?: number | null
          tts_provider?: string | null
          user_id?: string
        }
        Relationships: []
      }
      coach_usage: {
        Row: {
          created_at: string
          feature: string
          id: string
          question_count: number
          question_date: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          feature?: string
          id?: string
          question_count?: number
          question_date?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          feature?: string
          id?: string
          question_count?: number
          question_date?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      concepts: {
        Row: {
          chapter_id: string | null
          concept_key: string
          created_at: string | null
          created_by: string | null
          display_order: number | null
          id: string
          module_id: string
          section_id: string | null
          title: string
        }
        Insert: {
          chapter_id?: string | null
          concept_key: string
          created_at?: string | null
          created_by?: string | null
          display_order?: number | null
          id?: string
          module_id: string
          section_id?: string | null
          title: string
        }
        Update: {
          chapter_id?: string | null
          concept_key?: string
          created_at?: string | null
          created_by?: string | null
          display_order?: number | null
          id?: string
          module_id?: string
          section_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "concepts_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "module_chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "concepts_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "concepts_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
        ]
      }
      content_review_notes: {
        Row: {
          admin_note: string | null
          chapter_id: string | null
          created_at: string
          id: string
          material_id: string
          material_type: string
          review_status: string
          reviewed_by: string | null
          updated_at: string
        }
        Insert: {
          admin_note?: string | null
          chapter_id?: string | null
          created_at?: string
          id?: string
          material_id: string
          material_type: string
          review_status?: string
          reviewed_by?: string | null
          updated_at?: string
        }
        Update: {
          admin_note?: string | null
          chapter_id?: string | null
          created_at?: string
          id?: string
          material_id?: string
          material_type?: string
          review_status?: string
          reviewed_by?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_review_notes_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "module_chapters"
            referencedColumns: ["id"]
          },
        ]
      }
      content_views: {
        Row: {
          chapter_id: string | null
          content_id: string
          content_type: string
          first_viewed_at: string
          id: string
          topic_id: string | null
          user_id: string
        }
        Insert: {
          chapter_id?: string | null
          content_id: string
          content_type: string
          first_viewed_at?: string
          id?: string
          topic_id?: string | null
          user_id: string
        }
        Update: {
          chapter_id?: string | null
          content_id?: string
          content_type?: string
          first_viewed_at?: string
          id?: string
          topic_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      daily_study_plan_tasks: {
        Row: {
          carry_count: number
          chapter_id: string | null
          completion_percent: number | null
          created_at: string
          estimated_minutes: number | null
          id: string
          is_carried_over: boolean
          plan_id: string
          prescribed_study_mode: string | null
          priority: number
          reason: string | null
          status: string
          task_type: string
          title: string
          updated_at: string
        }
        Insert: {
          carry_count?: number
          chapter_id?: string | null
          completion_percent?: number | null
          created_at?: string
          estimated_minutes?: number | null
          id?: string
          is_carried_over?: boolean
          plan_id: string
          prescribed_study_mode?: string | null
          priority?: number
          reason?: string | null
          status?: string
          task_type: string
          title: string
          updated_at?: string
        }
        Update: {
          carry_count?: number
          chapter_id?: string | null
          completion_percent?: number | null
          created_at?: string
          estimated_minutes?: number | null
          id?: string
          is_carried_over?: boolean
          plan_id?: string
          prescribed_study_mode?: string | null
          priority?: number
          reason?: string | null
          status?: string
          task_type?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_study_plan_tasks_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "module_chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_study_plan_tasks_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "daily_study_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_study_plans: {
        Row: {
          created_at: string
          exam_mode: string | null
          id: string
          module_id: string | null
          plan_date: string
          plan_label: string | null
          tasks_completed: number | null
          tasks_total: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          exam_mode?: string | null
          id?: string
          module_id?: string | null
          plan_date?: string
          plan_label?: string | null
          tasks_completed?: number | null
          tasks_total?: number | null
          user_id: string
        }
        Update: {
          created_at?: string
          exam_mode?: string | null
          id?: string
          module_id?: string | null
          plan_date?: string
          plan_label?: string | null
          tasks_completed?: number | null
          tasks_total?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_study_plans_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      department_admins: {
        Row: {
          assigned_by: string | null
          created_at: string | null
          department_id: string
          id: string
          user_id: string
        }
        Insert: {
          assigned_by?: string | null
          created_at?: string | null
          department_id: string
          id?: string
          user_id: string
        }
        Update: {
          assigned_by?: string | null
          created_at?: string | null
          department_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "department_admins_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          category: Database["public"]["Enums"]["department_category"]
          created_at: string | null
          description: string | null
          display_order: number | null
          icon: string | null
          id: string
          name: string
          name_ar: string | null
          slug: string
          years: number[]
        }
        Insert: {
          category: Database["public"]["Enums"]["department_category"]
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          name: string
          name_ar?: string | null
          slug: string
          years: number[]
        }
        Update: {
          category?: Database["public"]["Enums"]["department_category"]
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          name?: string
          name_ar?: string | null
          slug?: string
          years?: number[]
        }
        Relationships: []
      }
      discussion_messages: {
        Row: {
          content: string
          created_at: string | null
          id: string
          is_edited: boolean | null
          moderation_reason: string | null
          moderation_scores: Json | null
          moderation_status: string | null
          parent_id: string | null
          thread_id: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          is_edited?: boolean | null
          moderation_reason?: string | null
          moderation_scores?: Json | null
          moderation_status?: string | null
          parent_id?: string | null
          thread_id: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          is_edited?: boolean | null
          moderation_reason?: string | null
          moderation_scores?: Json | null
          moderation_status?: string | null
          parent_id?: string | null
          thread_id?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "discussion_messages_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "discussion_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discussion_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "discussion_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      discussion_reports: {
        Row: {
          admin_notes: string | null
          created_at: string | null
          id: string
          message_id: string
          reason: string
          reported_by: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string | null
          id?: string
          message_id: string
          reason: string
          reported_by?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
        }
        Update: {
          admin_notes?: string | null
          created_at?: string | null
          id?: string
          message_id?: string
          reason?: string
          reported_by?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "discussion_reports_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "discussion_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      discussion_threads: {
        Row: {
          chapter_id: string | null
          created_at: string | null
          created_by: string | null
          id: string
          is_locked: boolean | null
          is_pinned: boolean | null
          last_activity_at: string | null
          module_id: string | null
          reply_count: number | null
          title: string
        }
        Insert: {
          chapter_id?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_locked?: boolean | null
          is_pinned?: boolean | null
          last_activity_at?: string | null
          module_id?: string | null
          reply_count?: number | null
          title: string
        }
        Update: {
          chapter_id?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_locked?: boolean | null
          is_pinned?: boolean | null
          last_activity_at?: string | null
          module_id?: string | null
          reply_count?: number | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "discussion_threads_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "module_chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discussion_threads_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      discussion_warnings: {
        Row: {
          created_at: string | null
          id: string
          issued_by: string | null
          message_id: string | null
          reason: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          issued_by?: string | null
          message_id?: string | null
          reason: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          issued_by?: string | null
          message_id?: string | null
          reason?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "discussion_warnings_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "discussion_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      email_events: {
        Row: {
          created_at: string | null
          event_type: string
          id: string
          metadata: Json | null
          reason: string | null
          resend_email_id: string | null
          status: string | null
          to_email: string
        }
        Insert: {
          created_at?: string | null
          event_type: string
          id?: string
          metadata?: Json | null
          reason?: string | null
          resend_email_id?: string | null
          status?: string | null
          to_email: string
        }
        Update: {
          created_at?: string | null
          event_type?: string
          id?: string
          metadata?: Json | null
          reason?: string | null
          resend_email_id?: string | null
          status?: string | null
          to_email?: string
        }
        Relationships: []
      }
      essays: {
        Row: {
          ai_confidence: number | null
          chapter_id: string | null
          concept_ai_confidence: number | null
          concept_auto_assigned: boolean | null
          concept_id: string | null
          contributing_department_id: string | null
          created_at: string | null
          created_by: string | null
          difficulty_level: string | null
          display_order: number | null
          id: string
          is_deleted: boolean
          keywords: string[] | null
          max_points: number | null
          model_answer: string | null
          model_answer_ar: string | null
          module_id: string | null
          original_section_name: string | null
          original_section_number: string | null
          question: string
          question_ar: string | null
          question_type: string | null
          rating: number | null
          rubric_json: Json | null
          section_id: string | null
          title: string
          title_ar: string | null
          topic_id: string | null
          updated_by: string | null
        }
        Insert: {
          ai_confidence?: number | null
          chapter_id?: string | null
          concept_ai_confidence?: number | null
          concept_auto_assigned?: boolean | null
          concept_id?: string | null
          contributing_department_id?: string | null
          created_at?: string | null
          created_by?: string | null
          difficulty_level?: string | null
          display_order?: number | null
          id?: string
          is_deleted?: boolean
          keywords?: string[] | null
          max_points?: number | null
          model_answer?: string | null
          model_answer_ar?: string | null
          module_id?: string | null
          original_section_name?: string | null
          original_section_number?: string | null
          question: string
          question_ar?: string | null
          question_type?: string | null
          rating?: number | null
          rubric_json?: Json | null
          section_id?: string | null
          title: string
          title_ar?: string | null
          topic_id?: string | null
          updated_by?: string | null
        }
        Update: {
          ai_confidence?: number | null
          chapter_id?: string | null
          concept_ai_confidence?: number | null
          concept_auto_assigned?: boolean | null
          concept_id?: string | null
          contributing_department_id?: string | null
          created_at?: string | null
          created_by?: string | null
          difficulty_level?: string | null
          display_order?: number | null
          id?: string
          is_deleted?: boolean
          keywords?: string[] | null
          max_points?: number | null
          model_answer?: string | null
          model_answer_ar?: string | null
          module_id?: string | null
          original_section_name?: string | null
          original_section_number?: string | null
          question?: string
          question_ar?: string | null
          question_type?: string | null
          rating?: number | null
          rubric_json?: Json | null
          section_id?: string | null
          title?: string
          title_ar?: string | null
          topic_id?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "essays_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "module_chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "essays_concept_id_fkey"
            columns: ["concept_id"]
            isOneToOne: false
            referencedRelation: "concepts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "essays_contributing_department_id_fkey"
            columns: ["contributing_department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "essays_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "essays_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "essays_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_attempt_answers: {
        Row: {
          answer_mode: string | null
          attempt_id: string
          created_at: string
          finalized_at: string | null
          handwriting_data: string | null
          id: string
          is_finalized: boolean
          last_autosave_at: string | null
          marked_at: string | null
          marking_feedback: Json | null
          max_score: number | null
          question_id: string
          question_type: string
          revision_count: number
          score: number | null
          selected_key: string | null
          typed_summary: string | null
          typed_text: string | null
          updated_at: string
        }
        Insert: {
          answer_mode?: string | null
          attempt_id: string
          created_at?: string
          finalized_at?: string | null
          handwriting_data?: string | null
          id?: string
          is_finalized?: boolean
          last_autosave_at?: string | null
          marked_at?: string | null
          marking_feedback?: Json | null
          max_score?: number | null
          question_id: string
          question_type?: string
          revision_count?: number
          score?: number | null
          selected_key?: string | null
          typed_summary?: string | null
          typed_text?: string | null
          updated_at?: string
        }
        Update: {
          answer_mode?: string | null
          attempt_id?: string
          created_at?: string
          finalized_at?: string | null
          handwriting_data?: string | null
          id?: string
          is_finalized?: boolean
          last_autosave_at?: string | null
          marked_at?: string | null
          marking_feedback?: Json | null
          max_score?: number | null
          question_id?: string
          question_type?: string
          revision_count?: number
          score?: number | null
          selected_key?: string | null
          typed_summary?: string | null
          typed_text?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "exam_attempt_answers_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "mock_exam_attempts"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_instance_questions: {
        Row: {
          chapter_id: string | null
          component_id: string
          component_type: string
          created_at: string
          difficulty: string | null
          display_order: number
          id: string
          instance_id: string
          marks: number
          question_id: string
          topic_id: string | null
        }
        Insert: {
          chapter_id?: string | null
          component_id: string
          component_type: string
          created_at?: string
          difficulty?: string | null
          display_order?: number
          id?: string
          instance_id: string
          marks?: number
          question_id: string
          topic_id?: string | null
        }
        Update: {
          chapter_id?: string | null
          component_id?: string
          component_type?: string
          created_at?: string
          difficulty?: string | null
          display_order?: number
          id?: string
          instance_id?: string
          marks?: number
          question_id?: string
          topic_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exam_instance_questions_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "module_chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_instance_questions_component_id_fkey"
            columns: ["component_id"]
            isOneToOne: false
            referencedRelation: "assessment_components"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_instance_questions_instance_id_fkey"
            columns: ["instance_id"]
            isOneToOne: false
            referencedRelation: "exam_instances"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_instances: {
        Row: {
          assessment_id: string
          created_at: string
          created_by: string | null
          generation_rules: Json | null
          id: string
          label: string | null
          metadata: Json | null
          status: string
          total_marks: number
        }
        Insert: {
          assessment_id: string
          created_at?: string
          created_by?: string | null
          generation_rules?: Json | null
          id?: string
          label?: string | null
          metadata?: Json | null
          status?: string
          total_marks?: number
        }
        Update: {
          assessment_id?: string
          created_at?: string
          created_by?: string | null
          generation_rules?: Json | null
          id?: string
          label?: string | null
          metadata?: Json | null
          status?: string
          total_marks?: number
        }
        Relationships: [
          {
            foreignKeyName: "exam_instances_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessment_structures"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_recheck_requests: {
        Row: {
          admin_response: string | null
          answer_id: string
          attempt_id: string
          created_at: string
          id: string
          reason: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          user_id: string
        }
        Insert: {
          admin_response?: string | null
          answer_id: string
          attempt_id: string
          created_at?: string
          id?: string
          reason: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id: string
        }
        Update: {
          admin_response?: string | null
          answer_id?: string
          attempt_id?: string
          created_at?: string
          id?: string
          reason?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exam_recheck_requests_answer_id_fkey"
            columns: ["answer_id"]
            isOneToOne: false
            referencedRelation: "exam_attempt_answers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_recheck_requests_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "mock_exam_attempts"
            referencedColumns: ["id"]
          },
        ]
      }
      examiner_avatars: {
        Row: {
          created_at: string
          display_order: number
          id: number
          image_url: string
          is_active: boolean
          name: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: number
          image_url: string
          is_active?: boolean
          name: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: number
          image_url?: string
          is_active?: boolean
          name?: string
          uploaded_by?: string | null
        }
        Relationships: []
      }
      feedback: {
        Row: {
          admin_notes: string | null
          category: Database["public"]["Enums"]["feedback_category"]
          chapter_id: string | null
          created_at: string
          created_by: string | null
          id: string
          message: string
          module_id: string | null
          role: string
          screenshot_url: string | null
          severity: Database["public"]["Enums"]["feedback_severity"]
          status: Database["public"]["Enums"]["feedback_status"]
          tab: string | null
          topic_id: string | null
          year_id: string | null
        }
        Insert: {
          admin_notes?: string | null
          category: Database["public"]["Enums"]["feedback_category"]
          chapter_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          message: string
          module_id?: string | null
          role: string
          screenshot_url?: string | null
          severity?: Database["public"]["Enums"]["feedback_severity"]
          status?: Database["public"]["Enums"]["feedback_status"]
          tab?: string | null
          topic_id?: string | null
          year_id?: string | null
        }
        Update: {
          admin_notes?: string | null
          category?: Database["public"]["Enums"]["feedback_category"]
          chapter_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          message?: string
          module_id?: string | null
          role?: string
          screenshot_url?: string | null
          severity?: Database["public"]["Enums"]["feedback_severity"]
          status?: Database["public"]["Enums"]["feedback_status"]
          tab?: string | null
          topic_id?: string | null
          year_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feedback_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "module_chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_year_id_fkey"
            columns: ["year_id"]
            isOneToOne: false
            referencedRelation: "years"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback_topics: {
        Row: {
          created_at: string | null
          department_id: string | null
          description: string | null
          id: string
          is_active: boolean | null
          module_id: string | null
          name: string
          name_ar: string | null
          topic_id: string | null
        }
        Insert: {
          created_at?: string | null
          department_id?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          module_id?: string | null
          name: string
          name_ar?: string | null
          topic_id?: string | null
        }
        Update: {
          created_at?: string | null
          department_id?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          module_id?: string | null
          name?: string
          name_ar?: string | null
          topic_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feedback_topics_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_topics_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_topics_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback_unmask_requests: {
        Row: {
          approved: boolean
          approved_at: string | null
          approved_by: string | null
          feedback_id: string
          id: string
          reason: string
          requested_at: string
          requested_by: string
          revealed_user_id: string | null
        }
        Insert: {
          approved?: boolean
          approved_at?: string | null
          approved_by?: string | null
          feedback_id: string
          id?: string
          reason: string
          requested_at?: string
          requested_by: string
          revealed_user_id?: string | null
        }
        Update: {
          approved?: boolean
          approved_at?: string | null
          approved_by?: string | null
          feedback_id?: string
          id?: string
          reason?: string
          requested_at?: string
          requested_by?: string
          revealed_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feedback_unmask_requests_feedback_id_fkey"
            columns: ["feedback_id"]
            isOneToOne: false
            referencedRelation: "feedback"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_unmask_requests_feedback_id_fkey"
            columns: ["feedback_id"]
            isOneToOne: false
            referencedRelation: "feedback_admin_view"
            referencedColumns: ["id"]
          },
        ]
      }
      flashcard_review_logs: {
        Row: {
          card_id: string
          elapsed_days: number
          id: string
          rating: string
          reviewed_at: string
          scheduled_days: number
          user_id: string
        }
        Insert: {
          card_id: string
          elapsed_days: number
          id?: string
          rating: string
          reviewed_at?: string
          scheduled_days: number
          user_id: string
        }
        Update: {
          card_id?: string
          elapsed_days?: number
          id?: string
          rating?: string
          reviewed_at?: string
          scheduled_days?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "flashcard_review_logs_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "study_resources"
            referencedColumns: ["id"]
          },
        ]
      }
      flashcard_settings: {
        Row: {
          id: string
          key: string
          updated_at: string | null
          updated_by: string | null
          value: string
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string | null
          updated_by?: string | null
          value: string
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string | null
          updated_by?: string | null
          value?: string
        }
        Relationships: []
      }
      flashcard_states: {
        Row: {
          card_id: string
          created_at: string
          difficulty: number
          due: string
          elapsed_days: number
          id: string
          lapses: number
          last_review: string | null
          learning_steps: number
          reps: number
          scheduled_days: number
          stability: number
          state: string
          user_id: string
        }
        Insert: {
          card_id: string
          created_at?: string
          difficulty?: number
          due?: string
          elapsed_days?: number
          id?: string
          lapses?: number
          last_review?: string | null
          learning_steps?: number
          reps?: number
          scheduled_days?: number
          stability?: number
          state?: string
          user_id: string
        }
        Update: {
          card_id?: string
          created_at?: string
          difficulty?: number
          due?: string
          elapsed_days?: number
          id?: string
          lapses?: number
          last_review?: string | null
          learning_steps?: number
          reps?: number
          scheduled_days?: number
          stability?: number
          state?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "flashcard_states_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "study_resources"
            referencedColumns: ["id"]
          },
        ]
      }
      flashcards: {
        Row: {
          back: string
          chapter_id: string | null
          concept_auto_assigned: boolean | null
          concept_id: string | null
          created_at: string | null
          created_by: string | null
          display_order: number | null
          front: string
          id: string
          is_deleted: boolean
          module_id: string
          topic_id: string | null
          updated_by: string | null
        }
        Insert: {
          back: string
          chapter_id?: string | null
          concept_auto_assigned?: boolean | null
          concept_id?: string | null
          created_at?: string | null
          created_by?: string | null
          display_order?: number | null
          front: string
          id?: string
          is_deleted?: boolean
          module_id: string
          topic_id?: string | null
          updated_by?: string | null
        }
        Update: {
          back?: string
          chapter_id?: string | null
          concept_auto_assigned?: boolean | null
          concept_id?: string | null
          created_at?: string | null
          created_by?: string | null
          display_order?: number | null
          front?: string
          id?: string
          is_deleted?: boolean
          module_id?: string
          topic_id?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "flashcards_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "module_chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flashcards_concept_id_fkey"
            columns: ["concept_id"]
            isOneToOne: false
            referencedRelation: "concepts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flashcards_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flashcards_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      impersonation_sessions: {
        Row: {
          actor_id: string
          created_at: string
          effective_user_id: string
          end_reason: string | null
          ended_at: string | null
          expires_at: string
          id: string
        }
        Insert: {
          actor_id: string
          created_at?: string
          effective_user_id: string
          end_reason?: string | null
          ended_at?: string | null
          expires_at?: string
          id?: string
        }
        Update: {
          actor_id?: string
          created_at?: string
          effective_user_id?: string
          end_reason?: string | null
          ended_at?: string | null
          expires_at?: string
          id?: string
        }
        Relationships: []
      }
      inquiries: {
        Row: {
          admin_notes: string | null
          assigned_team: string | null
          assigned_to_user_id: string | null
          category: string
          chapter_id: string | null
          created_at: string
          first_viewed_at: string | null
          first_viewed_by: string | null
          id: string
          is_anonymous: boolean
          message: string
          module_id: string | null
          resolved_at: string | null
          resolved_by: string | null
          seen_by_admin: boolean | null
          status: string
          subject: string
          topic_id: string | null
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          assigned_team?: string | null
          assigned_to_user_id?: string | null
          category: string
          chapter_id?: string | null
          created_at?: string
          first_viewed_at?: string | null
          first_viewed_by?: string | null
          id?: string
          is_anonymous?: boolean
          message: string
          module_id?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          seen_by_admin?: boolean | null
          status?: string
          subject: string
          topic_id?: string | null
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          assigned_team?: string | null
          assigned_to_user_id?: string | null
          category?: string
          chapter_id?: string | null
          created_at?: string
          first_viewed_at?: string | null
          first_viewed_by?: string | null
          id?: string
          is_anonymous?: boolean
          message?: string
          module_id?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          seen_by_admin?: boolean | null
          status?: string
          subject?: string
          topic_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inquiries_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "module_chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inquiries_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inquiries_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      interactive_algorithms: {
        Row: {
          algorithm_json: Json
          chapter_id: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          display_order: number | null
          id: string
          include_consequences: boolean
          initial_state_json: Json | null
          is_deleted: boolean
          module_id: string
          reveal_mode: string
          section_id: string | null
          title: string
          topic_id: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          algorithm_json?: Json
          chapter_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          include_consequences?: boolean
          initial_state_json?: Json | null
          is_deleted?: boolean
          module_id: string
          reveal_mode?: string
          section_id?: string | null
          title: string
          topic_id?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          algorithm_json?: Json
          chapter_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          include_consequences?: boolean
          initial_state_json?: Json | null
          is_deleted?: boolean
          module_id?: string
          reveal_mode?: string
          section_id?: string | null
          title?: string
          topic_id?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "interactive_algorithms_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "module_chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interactive_algorithms_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interactive_algorithms_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interactive_algorithms_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      item_feedback: {
        Row: {
          admin_notes: string | null
          assigned_team: string | null
          assigned_to_user_id: string | null
          category: string
          chapter_id: string | null
          created_at: string
          first_viewed_at: string | null
          first_viewed_by: string | null
          id: string
          is_anonymous: boolean
          is_flagged: boolean
          item_id: string | null
          item_type: string
          message: string
          module_id: string | null
          rating: number | null
          resolved_at: string | null
          resolved_by: string | null
          seen_by_admin: boolean | null
          status: string
          topic_id: string | null
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          assigned_team?: string | null
          assigned_to_user_id?: string | null
          category: string
          chapter_id?: string | null
          created_at?: string
          first_viewed_at?: string | null
          first_viewed_by?: string | null
          id?: string
          is_anonymous?: boolean
          is_flagged?: boolean
          item_id?: string | null
          item_type: string
          message: string
          module_id?: string | null
          rating?: number | null
          resolved_at?: string | null
          resolved_by?: string | null
          seen_by_admin?: boolean | null
          status?: string
          topic_id?: string | null
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          assigned_team?: string | null
          assigned_to_user_id?: string | null
          category?: string
          chapter_id?: string | null
          created_at?: string
          first_viewed_at?: string | null
          first_viewed_by?: string | null
          id?: string
          is_anonymous?: boolean
          is_flagged?: boolean
          item_id?: string | null
          item_type?: string
          message?: string
          module_id?: string | null
          rating?: number | null
          resolved_at?: string | null
          resolved_by?: string | null
          seen_by_admin?: boolean | null
          status?: string
          topic_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "item_feedback_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "module_chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_feedback_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_feedback_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      lecture_sections: {
        Row: {
          id: string
          lecture_id: string
          section_id: string
        }
        Insert: {
          id?: string
          lecture_id: string
          section_id: string
        }
        Update: {
          id?: string
          lecture_id?: string
          section_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lecture_sections_lecture_id_fkey"
            columns: ["lecture_id"]
            isOneToOne: false
            referencedRelation: "lectures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lecture_sections_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
        ]
      }
      lectures: {
        Row: {
          chapter_id: string | null
          concept_ai_confidence: number | null
          concept_auto_assigned: boolean | null
          concept_id: string | null
          contributing_department_id: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          display_order: number | null
          duration: string | null
          id: string
          is_deleted: boolean
          module_id: string | null
          original_section_name: string | null
          original_section_number: string | null
          section_id: string | null
          title: string
          title_ar: string | null
          topic_id: string | null
          updated_at: string | null
          updated_by: string | null
          video_url: string | null
          youtube_video_id: string | null
        }
        Insert: {
          chapter_id?: string | null
          concept_ai_confidence?: number | null
          concept_auto_assigned?: boolean | null
          concept_id?: string | null
          contributing_department_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          display_order?: number | null
          duration?: string | null
          id?: string
          is_deleted?: boolean
          module_id?: string | null
          original_section_name?: string | null
          original_section_number?: string | null
          section_id?: string | null
          title: string
          title_ar?: string | null
          topic_id?: string | null
          updated_at?: string | null
          updated_by?: string | null
          video_url?: string | null
          youtube_video_id?: string | null
        }
        Update: {
          chapter_id?: string | null
          concept_ai_confidence?: number | null
          concept_auto_assigned?: boolean | null
          concept_id?: string | null
          contributing_department_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          display_order?: number | null
          duration?: string | null
          id?: string
          is_deleted?: boolean
          module_id?: string | null
          original_section_name?: string | null
          original_section_number?: string | null
          section_id?: string | null
          title?: string
          title_ar?: string | null
          topic_id?: string | null
          updated_at?: string | null
          updated_by?: string | null
          video_url?: string | null
          youtube_video_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lectures_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "module_chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lectures_concept_id_fkey"
            columns: ["concept_id"]
            isOneToOne: false
            referencedRelation: "concepts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lectures_contributing_department_id_fkey"
            columns: ["contributing_department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lectures_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lectures_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lectures_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      matching_questions: {
        Row: {
          ai_confidence: number | null
          chapter_id: string | null
          column_a_items: Json
          column_b_items: Json
          concept_ai_confidence: number | null
          concept_auto_assigned: boolean | null
          concept_id: string | null
          contributing_department_id: string | null
          correct_matches: Json
          created_at: string | null
          created_by: string | null
          difficulty: string | null
          display_order: number | null
          explanation: string | null
          id: string
          instruction: string
          is_deleted: boolean
          module_id: string
          original_section_name: string | null
          original_section_number: string | null
          section_id: string | null
          show_explanation: boolean
          topic_id: string | null
          updated_by: string | null
        }
        Insert: {
          ai_confidence?: number | null
          chapter_id?: string | null
          column_a_items?: Json
          column_b_items?: Json
          concept_ai_confidence?: number | null
          concept_auto_assigned?: boolean | null
          concept_id?: string | null
          contributing_department_id?: string | null
          correct_matches?: Json
          created_at?: string | null
          created_by?: string | null
          difficulty?: string | null
          display_order?: number | null
          explanation?: string | null
          id?: string
          instruction?: string
          is_deleted?: boolean
          module_id: string
          original_section_name?: string | null
          original_section_number?: string | null
          section_id?: string | null
          show_explanation?: boolean
          topic_id?: string | null
          updated_by?: string | null
        }
        Update: {
          ai_confidence?: number | null
          chapter_id?: string | null
          column_a_items?: Json
          column_b_items?: Json
          concept_ai_confidence?: number | null
          concept_auto_assigned?: boolean | null
          concept_id?: string | null
          contributing_department_id?: string | null
          correct_matches?: Json
          created_at?: string | null
          created_by?: string | null
          difficulty?: string | null
          display_order?: number | null
          explanation?: string | null
          id?: string
          instruction?: string
          is_deleted?: boolean
          module_id?: string
          original_section_name?: string | null
          original_section_number?: string | null
          section_id?: string | null
          show_explanation?: boolean
          topic_id?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "matching_questions_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "module_chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matching_questions_concept_id_fkey"
            columns: ["concept_id"]
            isOneToOne: false
            referencedRelation: "concepts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matching_questions_contributing_department_id_fkey"
            columns: ["contributing_department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matching_questions_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matching_questions_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matching_questions_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      material_feedback: {
        Row: {
          chapter_id: string | null
          created_at: string
          feedback_type: string
          id: string
          material_id: string
          material_type: string
          message: string | null
          status: string
          user_id: string
        }
        Insert: {
          chapter_id?: string | null
          created_at?: string
          feedback_type: string
          id?: string
          material_id: string
          material_type: string
          message?: string | null
          status?: string
          user_id: string
        }
        Update: {
          chapter_id?: string | null
          created_at?: string
          feedback_type?: string
          id?: string
          material_id?: string
          material_type?: string
          message?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "material_feedback_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "module_chapters"
            referencedColumns: ["id"]
          },
        ]
      }
      material_reactions: {
        Row: {
          chapter_id: string | null
          id: string
          material_id: string
          material_type: string
          reaction_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          chapter_id?: string | null
          id?: string
          material_id: string
          material_type: string
          reaction_type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          chapter_id?: string | null
          id?: string
          material_id?: string
          material_type?: string
          reaction_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "material_reactions_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "module_chapters"
            referencedColumns: ["id"]
          },
        ]
      }
      mcq_analytics: {
        Row: {
          avg_time_seconds: number | null
          chapter_id: string | null
          correct_count: number
          created_at: string
          discrimination_index: number | null
          distractor_analysis: Json
          facility_index: number | null
          flag_reasons: string[] | null
          flag_severity: string | null
          id: string
          is_flagged: boolean
          last_calculated_at: string
          max_time_seconds: number | null
          mcq_id: string
          min_time_seconds: number | null
          module_id: string
          total_attempts: number
          updated_at: string
        }
        Insert: {
          avg_time_seconds?: number | null
          chapter_id?: string | null
          correct_count?: number
          created_at?: string
          discrimination_index?: number | null
          distractor_analysis?: Json
          facility_index?: number | null
          flag_reasons?: string[] | null
          flag_severity?: string | null
          id?: string
          is_flagged?: boolean
          last_calculated_at?: string
          max_time_seconds?: number | null
          mcq_id: string
          min_time_seconds?: number | null
          module_id: string
          total_attempts?: number
          updated_at?: string
        }
        Update: {
          avg_time_seconds?: number | null
          chapter_id?: string | null
          correct_count?: number
          created_at?: string
          discrimination_index?: number | null
          distractor_analysis?: Json
          facility_index?: number | null
          flag_reasons?: string[] | null
          flag_severity?: string | null
          id?: string
          is_flagged?: boolean
          last_calculated_at?: string
          max_time_seconds?: number | null
          mcq_id?: string
          min_time_seconds?: number | null
          module_id?: string
          total_attempts?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mcq_analytics_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "module_chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mcq_analytics_mcq_id_fkey"
            columns: ["mcq_id"]
            isOneToOne: true
            referencedRelation: "mcqs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mcq_analytics_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      mcq_analytics_reports: {
        Row: {
          avg_facility_index: number | null
          flagged_count: number
          generated_at: string
          generated_for: string
          health_score: number | null
          id: string
          is_read: boolean
          module_id: string
          read_at: string | null
          report_data: Json
          report_type: string
          total_mcqs: number
        }
        Insert: {
          avg_facility_index?: number | null
          flagged_count?: number
          generated_at?: string
          generated_for: string
          health_score?: number | null
          id?: string
          is_read?: boolean
          module_id: string
          read_at?: string | null
          report_data?: Json
          report_type?: string
          total_mcqs?: number
        }
        Update: {
          avg_facility_index?: number | null
          flagged_count?: number
          generated_at?: string
          generated_for?: string
          health_score?: number | null
          id?: string
          is_read?: boolean
          module_id?: string
          read_at?: string | null
          report_data?: Json
          report_type?: string
          total_mcqs?: number
        }
        Relationships: [
          {
            foreignKeyName: "mcq_analytics_reports_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      mcq_attempts: {
        Row: {
          answers: Json | null
          completed_at: string | null
          id: string
          mcq_set_id: string
          score: number
          total_questions: number
          user_id: string
        }
        Insert: {
          answers?: Json | null
          completed_at?: string | null
          id?: string
          mcq_set_id: string
          score: number
          total_questions: number
          user_id: string
        }
        Update: {
          answers?: Json | null
          completed_at?: string | null
          id?: string
          mcq_set_id?: string
          score?: number
          total_questions?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mcq_attempts_mcq_set_id_fkey"
            columns: ["mcq_set_id"]
            isOneToOne: false
            referencedRelation: "mcq_sets"
            referencedColumns: ["id"]
          },
        ]
      }
      mcq_questions: {
        Row: {
          correct_answer: number
          created_at: string | null
          display_order: number | null
          explanation: string | null
          explanation_ar: string | null
          id: string
          mcq_set_id: string
          options: Json
          question: string
          question_ar: string | null
        }
        Insert: {
          correct_answer: number
          created_at?: string | null
          display_order?: number | null
          explanation?: string | null
          explanation_ar?: string | null
          id?: string
          mcq_set_id: string
          options: Json
          question: string
          question_ar?: string | null
        }
        Update: {
          correct_answer?: number
          created_at?: string | null
          display_order?: number | null
          explanation?: string | null
          explanation_ar?: string | null
          id?: string
          mcq_set_id?: string
          options?: Json
          question?: string
          question_ar?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mcq_questions_mcq_set_id_fkey"
            columns: ["mcq_set_id"]
            isOneToOne: false
            referencedRelation: "mcq_sets"
            referencedColumns: ["id"]
          },
        ]
      }
      mcq_sets: {
        Row: {
          chapter_id: string | null
          contributing_department_id: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          display_order: number | null
          id: string
          is_deleted: boolean
          module_id: string | null
          original_section_name: string | null
          original_section_number: string | null
          section_id: string | null
          time_limit_minutes: number | null
          title: string
          title_ar: string | null
          topic_id: string | null
          updated_by: string | null
        }
        Insert: {
          chapter_id?: string | null
          contributing_department_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_deleted?: boolean
          module_id?: string | null
          original_section_name?: string | null
          original_section_number?: string | null
          section_id?: string | null
          time_limit_minutes?: number | null
          title: string
          title_ar?: string | null
          topic_id?: string | null
          updated_by?: string | null
        }
        Update: {
          chapter_id?: string | null
          contributing_department_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_deleted?: boolean
          module_id?: string | null
          original_section_name?: string | null
          original_section_number?: string | null
          section_id?: string | null
          time_limit_minutes?: number | null
          title?: string
          title_ar?: string | null
          topic_id?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mcq_sets_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "module_chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mcq_sets_contributing_department_id_fkey"
            columns: ["contributing_department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mcq_sets_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mcq_sets_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mcq_sets_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      mcqs: {
        Row: {
          ai_confidence: number | null
          chapter_id: string | null
          choices: Json
          concept_ai_confidence: number | null
          concept_auto_assigned: boolean | null
          concept_id: string | null
          correct_key: string
          created_at: string
          created_by: string | null
          difficulty: Database["public"]["Enums"]["mcq_difficulty"] | null
          display_order: number | null
          explanation: string | null
          id: string
          is_deleted: boolean
          module_id: string
          original_section_name: string | null
          original_section_number: string | null
          question_format: string
          section_id: string | null
          stem: string
          topic_id: string | null
          updated_by: string | null
        }
        Insert: {
          ai_confidence?: number | null
          chapter_id?: string | null
          choices?: Json
          concept_ai_confidence?: number | null
          concept_auto_assigned?: boolean | null
          concept_id?: string | null
          correct_key: string
          created_at?: string
          created_by?: string | null
          difficulty?: Database["public"]["Enums"]["mcq_difficulty"] | null
          display_order?: number | null
          explanation?: string | null
          id?: string
          is_deleted?: boolean
          module_id: string
          original_section_name?: string | null
          original_section_number?: string | null
          question_format?: string
          section_id?: string | null
          stem: string
          topic_id?: string | null
          updated_by?: string | null
        }
        Update: {
          ai_confidence?: number | null
          chapter_id?: string | null
          choices?: Json
          concept_ai_confidence?: number | null
          concept_auto_assigned?: boolean | null
          concept_id?: string | null
          correct_key?: string
          created_at?: string
          created_by?: string | null
          difficulty?: Database["public"]["Enums"]["mcq_difficulty"] | null
          display_order?: number | null
          explanation?: string | null
          id?: string
          is_deleted?: boolean
          module_id?: string
          original_section_name?: string | null
          original_section_number?: string | null
          question_format?: string
          section_id?: string | null
          stem?: string
          topic_id?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mcqs_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "module_chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mcqs_concept_id_fkey"
            columns: ["concept_id"]
            isOneToOne: false
            referencedRelation: "concepts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mcqs_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mcqs_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mcqs_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      mind_map_prompts: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_default: boolean
          name: string
          prompt_type: string
          system_prompt: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_default?: boolean
          name: string
          prompt_type?: string
          system_prompt: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_default?: boolean
          name?: string
          prompt_type?: string
          system_prompt?: string
          updated_at?: string
        }
        Relationships: []
      }
      mind_maps: {
        Row: {
          chapter_id: string | null
          created_at: string
          created_by: string | null
          html_content: string | null
          html_file_url: string | null
          id: string
          map_type: Database["public"]["Enums"]["mind_map_type"]
          markdown_content: string | null
          prompt_version: string | null
          section_id: string | null
          section_key: string | null
          section_number: string | null
          section_title: string | null
          source_detection_metadata: Json | null
          source_pdf_url: string | null
          source_type: Database["public"]["Enums"]["mind_map_source_type"]
          status: Database["public"]["Enums"]["mind_map_status"]
          title: string
          topic_id: string | null
          updated_at: string
        }
        Insert: {
          chapter_id?: string | null
          created_at?: string
          created_by?: string | null
          html_content?: string | null
          html_file_url?: string | null
          id?: string
          map_type?: Database["public"]["Enums"]["mind_map_type"]
          markdown_content?: string | null
          prompt_version?: string | null
          section_id?: string | null
          section_key?: string | null
          section_number?: string | null
          section_title?: string | null
          source_detection_metadata?: Json | null
          source_pdf_url?: string | null
          source_type?: Database["public"]["Enums"]["mind_map_source_type"]
          status?: Database["public"]["Enums"]["mind_map_status"]
          title: string
          topic_id?: string | null
          updated_at?: string
        }
        Update: {
          chapter_id?: string | null
          created_at?: string
          created_by?: string | null
          html_content?: string | null
          html_file_url?: string | null
          id?: string
          map_type?: Database["public"]["Enums"]["mind_map_type"]
          markdown_content?: string | null
          prompt_version?: string | null
          section_id?: string | null
          section_key?: string | null
          section_number?: string | null
          section_title?: string | null
          source_detection_metadata?: Json | null
          source_pdf_url?: string | null
          source_type?: Database["public"]["Enums"]["mind_map_source_type"]
          status?: Database["public"]["Enums"]["mind_map_status"]
          title?: string
          topic_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mind_maps_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "module_chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mind_maps_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mind_maps_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      mock_exam_attempts: {
        Row: {
          created_at: string
          duration_seconds: number | null
          id: string
          is_completed: boolean
          module_id: string
          paper_index: number | null
          question_ids: string[]
          score: number
          started_at: string
          submitted_at: string | null
          test_mode: string
          total_questions: number
          user_answers: Json
          user_id: string
        }
        Insert: {
          created_at?: string
          duration_seconds?: number | null
          id?: string
          is_completed?: boolean
          module_id: string
          paper_index?: number | null
          question_ids?: string[]
          score?: number
          started_at?: string
          submitted_at?: string | null
          test_mode?: string
          total_questions?: number
          user_answers?: Json
          user_id: string
        }
        Update: {
          created_at?: string
          duration_seconds?: number | null
          id?: string
          is_completed?: boolean
          module_id?: string
          paper_index?: number | null
          question_ids?: string[]
          score?: number
          started_at?: string
          submitted_at?: string | null
          test_mode?: string
          total_questions?: number
          user_answers?: Json
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mock_exam_attempts_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      mock_exam_global_settings: {
        Row: {
          default_question_count: number
          default_seconds_per_question: number
          id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          default_question_count?: number
          default_seconds_per_question?: number
          id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          default_question_count?: number
          default_seconds_per_question?: number
          id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      mock_exam_settings: {
        Row: {
          blueprint_config: Json | null
          created_at: string
          id: string
          module_id: string
          question_count: number
          seconds_per_question: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          blueprint_config?: Json | null
          created_at?: string
          id?: string
          module_id: string
          question_count?: number
          seconds_per_question?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          blueprint_config?: Json | null
          created_at?: string
          id?: string
          module_id?: string
          question_count?: number
          seconds_per_question?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mock_exam_settings_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: true
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      module_admins: {
        Row: {
          assigned_by: string | null
          created_at: string | null
          id: string
          module_id: string
          user_id: string
        }
        Insert: {
          assigned_by?: string | null
          created_at?: string | null
          id?: string
          module_id: string
          user_id: string
        }
        Update: {
          assigned_by?: string | null
          created_at?: string | null
          id?: string
          module_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "module_admins_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      module_books: {
        Row: {
          book_label: string
          chapter_prefix: string
          created_at: string | null
          description: string | null
          display_order: number
          id: string
          module_id: string
        }
        Insert: {
          book_label: string
          chapter_prefix?: string
          created_at?: string | null
          description?: string | null
          display_order?: number
          id?: string
          module_id: string
        }
        Update: {
          book_label?: string
          chapter_prefix?: string
          created_at?: string | null
          description?: string | null
          display_order?: number
          id?: string
          module_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "module_books_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      module_chapters: {
        Row: {
          book_label: string | null
          case_count: number | null
          chapter_number: number
          created_at: string | null
          created_by: string | null
          enable_sections: boolean
          icon_url: string | null
          id: string
          module_id: string
          order_index: number
          pdf_pages: number | null
          pdf_text: string | null
          pdf_uploaded_at: string | null
          pdf_url: string | null
          title: string
        }
        Insert: {
          book_label?: string | null
          case_count?: number | null
          chapter_number: number
          created_at?: string | null
          created_by?: string | null
          enable_sections?: boolean
          icon_url?: string | null
          id?: string
          module_id: string
          order_index: number
          pdf_pages?: number | null
          pdf_text?: string | null
          pdf_uploaded_at?: string | null
          pdf_url?: string | null
          title: string
        }
        Update: {
          book_label?: string | null
          case_count?: number | null
          chapter_number?: number
          created_at?: string | null
          created_by?: string | null
          enable_sections?: boolean
          icon_url?: string | null
          id?: string
          module_id?: string
          order_index?: number
          pdf_pages?: number | null
          pdf_text?: string | null
          pdf_uploaded_at?: string | null
          pdf_url?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "module_chapters_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      module_departments: {
        Row: {
          created_at: string | null
          department_id: string
          id: string
          is_primary: boolean | null
          module_id: string
        }
        Insert: {
          created_at?: string | null
          department_id: string
          id?: string
          is_primary?: boolean | null
          module_id: string
        }
        Update: {
          created_at?: string | null
          department_id?: string
          id?: string
          is_primary?: boolean | null
          module_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "module_departments_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "module_departments_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      module_pin_settings: {
        Row: {
          id: string
          is_pinned: boolean
          module_key: string
          pinned_by: string | null
          updated_at: string
        }
        Insert: {
          id?: string
          is_pinned?: boolean
          module_key: string
          pinned_by?: string | null
          updated_at?: string
        }
        Update: {
          id?: string
          is_pinned?: boolean
          module_key?: string
          pinned_by?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      modules: {
        Row: {
          created_at: string | null
          description: string | null
          display_order: number | null
          id: string
          image_url: string | null
          is_published: boolean | null
          name: string
          name_ar: string | null
          page_count: number | null
          slug: string
          updated_at: string | null
          workload_level: string | null
          year_id: string
          youtube_playlist_id: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          image_url?: string | null
          is_published?: boolean | null
          name: string
          name_ar?: string | null
          page_count?: number | null
          slug: string
          updated_at?: string | null
          workload_level?: string | null
          year_id: string
          youtube_playlist_id?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          image_url?: string | null
          is_published?: boolean | null
          name?: string
          name_ar?: string | null
          page_count?: number | null
          slug?: string
          updated_at?: string | null
          workload_level?: string | null
          year_id?: string
          youtube_playlist_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "modules_year_id_fkey"
            columns: ["year_id"]
            isOneToOne: false
            referencedRelation: "years"
            referencedColumns: ["id"]
          },
        ]
      }
      osce_questions: {
        Row: {
          ai_confidence: number | null
          answer_1: boolean
          answer_2: boolean
          answer_3: boolean
          answer_4: boolean
          answer_5: boolean
          chapter_id: string | null
          concept_ai_confidence: number | null
          concept_auto_assigned: boolean | null
          concept_id: string | null
          created_at: string | null
          created_by: string | null
          difficulty: string | null
          display_order: number | null
          explanation_1: string | null
          explanation_2: string | null
          explanation_3: string | null
          explanation_4: string | null
          explanation_5: string | null
          history_text: string
          id: string
          image_url: string | null
          is_deleted: boolean
          legacy_archived: boolean
          module_id: string
          original_section_name: string | null
          original_section_number: string | null
          section_id: string | null
          statement_1: string
          statement_2: string
          statement_3: string
          statement_4: string
          statement_5: string
          topic_id: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          ai_confidence?: number | null
          answer_1: boolean
          answer_2: boolean
          answer_3: boolean
          answer_4: boolean
          answer_5: boolean
          chapter_id?: string | null
          concept_ai_confidence?: number | null
          concept_auto_assigned?: boolean | null
          concept_id?: string | null
          created_at?: string | null
          created_by?: string | null
          difficulty?: string | null
          display_order?: number | null
          explanation_1?: string | null
          explanation_2?: string | null
          explanation_3?: string | null
          explanation_4?: string | null
          explanation_5?: string | null
          history_text: string
          id?: string
          image_url?: string | null
          is_deleted?: boolean
          legacy_archived?: boolean
          module_id: string
          original_section_name?: string | null
          original_section_number?: string | null
          section_id?: string | null
          statement_1: string
          statement_2: string
          statement_3: string
          statement_4: string
          statement_5: string
          topic_id?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          ai_confidence?: number | null
          answer_1?: boolean
          answer_2?: boolean
          answer_3?: boolean
          answer_4?: boolean
          answer_5?: boolean
          chapter_id?: string | null
          concept_ai_confidence?: number | null
          concept_auto_assigned?: boolean | null
          concept_id?: string | null
          created_at?: string | null
          created_by?: string | null
          difficulty?: string | null
          display_order?: number | null
          explanation_1?: string | null
          explanation_2?: string | null
          explanation_3?: string | null
          explanation_4?: string | null
          explanation_5?: string | null
          history_text?: string
          id?: string
          image_url?: string | null
          is_deleted?: boolean
          legacy_archived?: boolean
          module_id?: string
          original_section_name?: string | null
          original_section_number?: string | null
          section_id?: string | null
          statement_1?: string
          statement_2?: string
          statement_3?: string
          statement_4?: string
          statement_5?: string
          topic_id?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "osce_questions_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "module_chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "osce_questions_concept_id_fkey"
            columns: ["concept_id"]
            isOneToOne: false
            referencedRelation: "concepts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "osce_questions_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "osce_questions_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "osce_questions_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_settings: {
        Row: {
          key: string
          updated_at: string | null
          value: string | null
        }
        Insert: {
          key: string
          updated_at?: string | null
          value?: string | null
        }
        Update: {
          key?: string
          updated_at?: string | null
          value?: string | null
        }
        Relationships: []
      }
      practicals: {
        Row: {
          chapter_id: string | null
          contributing_department_id: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          display_order: number | null
          equipment: string[] | null
          id: string
          is_deleted: boolean
          module_id: string | null
          objectives: string[] | null
          original_section_name: string | null
          original_section_number: string | null
          procedure: string | null
          procedure_ar: string | null
          section_id: string | null
          title: string
          title_ar: string | null
          topic_id: string | null
          updated_by: string | null
          video_url: string | null
        }
        Insert: {
          chapter_id?: string | null
          contributing_department_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          display_order?: number | null
          equipment?: string[] | null
          id?: string
          is_deleted?: boolean
          module_id?: string | null
          objectives?: string[] | null
          original_section_name?: string | null
          original_section_number?: string | null
          procedure?: string | null
          procedure_ar?: string | null
          section_id?: string | null
          title: string
          title_ar?: string | null
          topic_id?: string | null
          updated_by?: string | null
          video_url?: string | null
        }
        Update: {
          chapter_id?: string | null
          contributing_department_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          display_order?: number | null
          equipment?: string[] | null
          id?: string
          is_deleted?: boolean
          module_id?: string | null
          objectives?: string[] | null
          original_section_name?: string | null
          original_section_number?: string | null
          procedure?: string | null
          procedure_ar?: string | null
          section_id?: string | null
          title?: string
          title_ar?: string | null
          topic_id?: string | null
          updated_by?: string | null
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "practicals_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "module_chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "practicals_contributing_department_id_fkey"
            columns: ["contributing_department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "practicals_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "practicals_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "practicals_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          auto_login_to_year: boolean | null
          avatar_url: string | null
          banned_until: string | null
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          preferred_year_id: string | null
          status: string
          status_reason: string | null
          status_updated_at: string | null
          status_updated_by: string | null
          updated_at: string | null
        }
        Insert: {
          auto_login_to_year?: boolean | null
          avatar_url?: string | null
          banned_until?: string | null
          created_at?: string | null
          email: string
          full_name?: string | null
          id: string
          preferred_year_id?: string | null
          status?: string
          status_reason?: string | null
          status_updated_at?: string | null
          status_updated_by?: string | null
          updated_at?: string | null
        }
        Update: {
          auto_login_to_year?: boolean | null
          avatar_url?: string | null
          banned_until?: string | null
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          preferred_year_id?: string | null
          status?: string
          status_reason?: string | null
          status_updated_at?: string | null
          status_updated_by?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_preferred_year_id_fkey"
            columns: ["preferred_year_id"]
            isOneToOne: false
            referencedRelation: "years"
            referencedColumns: ["id"]
          },
        ]
      }
      question_attempts: {
        Row: {
          attempt_number: number
          chapter_id: string | null
          confidence_level: number | null
          created_at: string
          id: string
          is_correct: boolean | null
          module_id: string | null
          question_id: string
          question_type: Database["public"]["Enums"]["practice_question_type"]
          score: number | null
          selected_answer: Json | null
          status: Database["public"]["Enums"]["question_attempt_status"]
          time_spent_seconds: number | null
          topic_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          attempt_number?: number
          chapter_id?: string | null
          confidence_level?: number | null
          created_at?: string
          id?: string
          is_correct?: boolean | null
          module_id?: string | null
          question_id: string
          question_type: Database["public"]["Enums"]["practice_question_type"]
          score?: number | null
          selected_answer?: Json | null
          status?: Database["public"]["Enums"]["question_attempt_status"]
          time_spent_seconds?: number | null
          topic_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          attempt_number?: number
          chapter_id?: string | null
          confidence_level?: number | null
          created_at?: string
          id?: string
          is_correct?: boolean | null
          module_id?: string | null
          question_id?: string
          question_type?: Database["public"]["Enums"]["practice_question_type"]
          score?: number | null
          selected_answer?: Json | null
          status?: Database["public"]["Enums"]["question_attempt_status"]
          time_spent_seconds?: number | null
          topic_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "question_attempts_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "module_chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "question_attempts_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "question_attempts_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      resources: {
        Row: {
          audio_storage_path: string | null
          chapter_id: string | null
          contributing_department_id: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          display_order: number | null
          document_subtype: string | null
          duration_seconds: number | null
          external_url: string | null
          file_url: string | null
          id: string
          is_deleted: boolean
          module_id: string | null
          original_section_name: string | null
          original_section_number: string | null
          resource_type: string | null
          rich_content: string | null
          section_id: string | null
          title: string
          title_ar: string | null
          topic_id: string | null
          updated_by: string | null
        }
        Insert: {
          audio_storage_path?: string | null
          chapter_id?: string | null
          contributing_department_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          display_order?: number | null
          document_subtype?: string | null
          duration_seconds?: number | null
          external_url?: string | null
          file_url?: string | null
          id?: string
          is_deleted?: boolean
          module_id?: string | null
          original_section_name?: string | null
          original_section_number?: string | null
          resource_type?: string | null
          rich_content?: string | null
          section_id?: string | null
          title: string
          title_ar?: string | null
          topic_id?: string | null
          updated_by?: string | null
        }
        Update: {
          audio_storage_path?: string | null
          chapter_id?: string | null
          contributing_department_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          display_order?: number | null
          document_subtype?: string | null
          duration_seconds?: number | null
          external_url?: string | null
          file_url?: string | null
          id?: string
          is_deleted?: boolean
          module_id?: string | null
          original_section_name?: string | null
          original_section_number?: string | null
          resource_type?: string | null
          rich_content?: string | null
          section_id?: string | null
          title?: string
          title_ar?: string | null
          topic_id?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "resources_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "module_chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resources_contributing_department_id_fkey"
            columns: ["contributing_department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resources_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resources_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resources_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      sections: {
        Row: {
          chapter_id: string | null
          created_at: string
          display_order: number
          id: string
          name: string
          section_number: string | null
          topic_id: string | null
        }
        Insert: {
          chapter_id?: string | null
          created_at?: string
          display_order?: number
          id?: string
          name: string
          section_number?: string | null
          topic_id?: string | null
        }
        Update: {
          chapter_id?: string | null
          created_at?: string
          display_order?: number
          id?: string
          name?: string
          section_number?: string | null
          topic_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sections_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "module_chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sections_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      student_chapter_metrics: {
        Row: {
          chapter_id: string
          confidence_avg: number
          confidence_mismatch_rate: number
          coverage_percent: number
          created_at: string
          flashcards_due: number
          flashcards_overdue: number
          id: string
          last_activity_at: string | null
          last_flashcard_review_at: string | null
          last_mcq_attempt_at: string | null
          last_review_interval: number
          last_video_at: string | null
          mcq_accuracy: number
          mcq_attempts: number
          mcq_correct: number
          mcq_wrong: number
          minutes_practicing: number
          minutes_reading: number
          minutes_total: number
          minutes_watching: number
          module_id: string
          next_review_at: string | null
          overconfident_error_rate: number
          readiness_score: number
          recent_mcq_accuracy: number
          resources_viewed: number
          review_strength: number
          student_id: string
          underconfident_correct_rate: number
          updated_at: string
          videos_completed: number
          videos_total: number
        }
        Insert: {
          chapter_id: string
          confidence_avg?: number
          confidence_mismatch_rate?: number
          coverage_percent?: number
          created_at?: string
          flashcards_due?: number
          flashcards_overdue?: number
          id?: string
          last_activity_at?: string | null
          last_flashcard_review_at?: string | null
          last_mcq_attempt_at?: string | null
          last_review_interval?: number
          last_video_at?: string | null
          mcq_accuracy?: number
          mcq_attempts?: number
          mcq_correct?: number
          mcq_wrong?: number
          minutes_practicing?: number
          minutes_reading?: number
          minutes_total?: number
          minutes_watching?: number
          module_id: string
          next_review_at?: string | null
          overconfident_error_rate?: number
          readiness_score?: number
          recent_mcq_accuracy?: number
          resources_viewed?: number
          review_strength?: number
          student_id: string
          underconfident_correct_rate?: number
          updated_at?: string
          videos_completed?: number
          videos_total?: number
        }
        Update: {
          chapter_id?: string
          confidence_avg?: number
          confidence_mismatch_rate?: number
          coverage_percent?: number
          created_at?: string
          flashcards_due?: number
          flashcards_overdue?: number
          id?: string
          last_activity_at?: string | null
          last_flashcard_review_at?: string | null
          last_mcq_attempt_at?: string | null
          last_review_interval?: number
          last_video_at?: string | null
          mcq_accuracy?: number
          mcq_attempts?: number
          mcq_correct?: number
          mcq_wrong?: number
          minutes_practicing?: number
          minutes_reading?: number
          minutes_total?: number
          minutes_watching?: number
          module_id?: string
          next_review_at?: string | null
          overconfident_error_rate?: number
          readiness_score?: number
          recent_mcq_accuracy?: number
          resources_viewed?: number
          review_strength?: number
          student_id?: string
          underconfident_correct_rate?: number
          updated_at?: string
          videos_completed?: number
          videos_total?: number
        }
        Relationships: []
      }
      student_feedback: {
        Row: {
          academic_year: number | null
          comments: string | null
          content_quality: number | null
          created_at: string | null
          department_id: string
          feedback_topic_id: string
          id: string
          module_id: string | null
          overall_satisfaction: number | null
          resource_availability: number | null
          suggestions: string | null
          teaching_effectiveness: number | null
          topic_id: string | null
        }
        Insert: {
          academic_year?: number | null
          comments?: string | null
          content_quality?: number | null
          created_at?: string | null
          department_id: string
          feedback_topic_id: string
          id?: string
          module_id?: string | null
          overall_satisfaction?: number | null
          resource_availability?: number | null
          suggestions?: string | null
          teaching_effectiveness?: number | null
          topic_id?: string | null
        }
        Update: {
          academic_year?: number | null
          comments?: string | null
          content_quality?: number | null
          created_at?: string | null
          department_id?: string
          feedback_topic_id?: string
          id?: string
          module_id?: string | null
          overall_satisfaction?: number | null
          resource_availability?: number | null
          suggestions?: string | null
          teaching_effectiveness?: number | null
          topic_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_feedback_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_feedback_feedback_topic_id_fkey"
            columns: ["feedback_topic_id"]
            isOneToOne: false
            referencedRelation: "feedback_topics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_feedback_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_feedback_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      student_goals: {
        Row: {
          ambition_level: string | null
          created_at: string
          exam_schedule: Json | null
          goals_onboarding_shown: boolean | null
          id: string
          rotation_schedule: Json | null
          updated_at: string
          user_id: string
          weekday_hours: number | null
          weekend_hours: number | null
        }
        Insert: {
          ambition_level?: string | null
          created_at?: string
          exam_schedule?: Json | null
          goals_onboarding_shown?: boolean | null
          id?: string
          rotation_schedule?: Json | null
          updated_at?: string
          user_id: string
          weekday_hours?: number | null
          weekend_hours?: number | null
        }
        Update: {
          ambition_level?: string | null
          created_at?: string
          exam_schedule?: Json | null
          goals_onboarding_shown?: boolean | null
          id?: string
          rotation_schedule?: Json | null
          updated_at?: string
          user_id?: string
          weekday_hours?: number | null
          weekend_hours?: number | null
        }
        Relationships: []
      }
      student_last_position: {
        Row: {
          activity_position: Json | null
          book_label: string | null
          chapter_id: string | null
          chapter_title: string | null
          id: string
          module_id: string | null
          module_name: string | null
          module_slug: string | null
          tab: string | null
          updated_at: string
          user_id: string
          year_number: number | null
        }
        Insert: {
          activity_position?: Json | null
          book_label?: string | null
          chapter_id?: string | null
          chapter_title?: string | null
          id?: string
          module_id?: string | null
          module_name?: string | null
          module_slug?: string | null
          tab?: string | null
          updated_at?: string
          user_id: string
          year_number?: number | null
        }
        Update: {
          activity_position?: Json | null
          book_label?: string | null
          chapter_id?: string | null
          chapter_title?: string | null
          id?: string
          module_id?: string | null
          module_name?: string | null
          module_slug?: string | null
          tab?: string | null
          updated_at?: string
          user_id?: string
          year_number?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "student_last_position_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "module_chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_last_position_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      student_module_preferences: {
        Row: {
          id: string
          is_hidden: boolean
          module_key: string
          updated_at: string
          user_id: string
        }
        Insert: {
          id?: string
          is_hidden?: boolean
          module_key: string
          updated_at?: string
          user_id: string
        }
        Update: {
          id?: string
          is_hidden?: boolean
          module_key?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      student_readiness_cache: {
        Row: {
          calculation_version: string
          cap_type: string | null
          chapter_id: string | null
          chapter_status: string
          component_scores: Json
          consistency_score: number
          coverage_score: number
          created_at: string
          evidence_level: string
          exam_readiness: number
          id: string
          improvement_score: number
          insight_message: string
          is_stale: boolean
          last_calculated_at: string
          module_id: string
          next_best_action: string
          performance_score: number
          raw_score: number
          readiness_score: number
          review_reason: string
          review_urgency: string
          risk_flags: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          calculation_version?: string
          cap_type?: string | null
          chapter_id?: string | null
          chapter_status?: string
          component_scores?: Json
          consistency_score?: number
          coverage_score?: number
          created_at?: string
          evidence_level?: string
          exam_readiness?: number
          id?: string
          improvement_score?: number
          insight_message?: string
          is_stale?: boolean
          last_calculated_at?: string
          module_id: string
          next_best_action?: string
          performance_score?: number
          raw_score?: number
          readiness_score?: number
          review_reason?: string
          review_urgency?: string
          risk_flags?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          calculation_version?: string
          cap_type?: string | null
          chapter_id?: string | null
          chapter_status?: string
          component_scores?: Json
          consistency_score?: number
          coverage_score?: number
          created_at?: string
          evidence_level?: string
          exam_readiness?: number
          id?: string
          improvement_score?: number
          insight_message?: string
          is_stale?: boolean
          last_calculated_at?: string
          module_id?: string
          next_best_action?: string
          performance_score?: number
          raw_score?: number
          readiness_score?: number
          review_reason?: string
          review_urgency?: string
          risk_flags?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_readiness_cache_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "module_chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_readiness_cache_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      study_group_invites: {
        Row: {
          created_at: string
          group_id: string
          id: string
          invited_by: string
          invited_user_id: string
          message: string | null
          responded_at: string | null
          status: string
        }
        Insert: {
          created_at?: string
          group_id: string
          id?: string
          invited_by: string
          invited_user_id: string
          message?: string | null
          responded_at?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          group_id?: string
          id?: string
          invited_by?: string
          invited_user_id?: string
          message?: string | null
          responded_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_group_invites_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "study_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      study_group_members: {
        Row: {
          created_at: string
          group_id: string
          id: string
          invited_by: string | null
          joined_at: string | null
          role: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          group_id: string
          id?: string
          invited_by?: string | null
          joined_at?: string | null
          role?: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          group_id?: string
          id?: string
          invited_by?: string | null
          joined_at?: string | null
          role?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "study_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      study_group_messages: {
        Row: {
          content: string
          created_at: string | null
          id: string
          is_edited: boolean | null
          moderation_reason: string | null
          moderation_scores: Json | null
          moderation_status: string | null
          parent_id: string | null
          thread_id: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          is_edited?: boolean | null
          moderation_reason?: string | null
          moderation_scores?: Json | null
          moderation_status?: string | null
          parent_id?: string | null
          thread_id: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          is_edited?: boolean | null
          moderation_reason?: string | null
          moderation_scores?: Json | null
          moderation_status?: string | null
          parent_id?: string | null
          thread_id?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "study_group_messages_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "study_group_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_group_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "study_group_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      study_group_threads: {
        Row: {
          created_at: string | null
          created_by: string | null
          group_id: string
          id: string
          is_locked: boolean | null
          is_pinned: boolean | null
          last_activity_at: string | null
          reply_count: number | null
          title: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          group_id: string
          id?: string
          is_locked?: boolean | null
          is_pinned?: boolean | null
          last_activity_at?: string | null
          reply_count?: number | null
          title: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          group_id?: string
          id?: string
          is_locked?: boolean | null
          is_pinned?: boolean | null
          last_activity_at?: string | null
          reply_count?: number | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_group_threads_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "study_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      study_groups: {
        Row: {
          cover_image_url: string | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_active: boolean
          module_id: string | null
          name: string
          privacy_type: string
          updated_at: string
        }
        Insert: {
          cover_image_url?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_active?: boolean
          module_id?: string | null
          name: string
          privacy_type?: string
          updated_at?: string
        }
        Update: {
          cover_image_url?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_active?: boolean
          module_id?: string | null
          name?: string
          privacy_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_groups_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      study_plan_baseline: {
        Row: {
          baseline_completed_percent: number
          created_at: string
          id: string
          module_id: string
          plan_id: string
        }
        Insert: {
          baseline_completed_percent?: number
          created_at?: string
          id?: string
          module_id: string
          plan_id: string
        }
        Update: {
          baseline_completed_percent?: number
          created_at?: string
          id?: string
          module_id?: string
          plan_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_plan_baseline_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_plan_baseline_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "study_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      study_plan_baseline_items: {
        Row: {
          chapter_id: string
          created_at: string
          id: string
          is_completed: boolean
          module_id: string
          plan_id: string
        }
        Insert: {
          chapter_id: string
          created_at?: string
          id?: string
          is_completed?: boolean
          module_id: string
          plan_id: string
        }
        Update: {
          chapter_id?: string
          created_at?: string
          id?: string
          is_completed?: boolean
          module_id?: string
          plan_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_plan_baseline_items_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "module_chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_plan_baseline_items_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_plan_baseline_items_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "study_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      study_plan_items: {
        Row: {
          chapter_id: string | null
          completed_at: string | null
          created_at: string
          display_order: number
          id: string
          item_title: string
          item_type: string
          module_id: string
          plan_id: string
          planned_date_from: string
          planned_date_to: string
          status: string
          updated_at: string
          week_index: number
          year_id: string
        }
        Insert: {
          chapter_id?: string | null
          completed_at?: string | null
          created_at?: string
          display_order?: number
          id?: string
          item_title: string
          item_type?: string
          module_id: string
          plan_id: string
          planned_date_from: string
          planned_date_to: string
          status?: string
          updated_at?: string
          week_index: number
          year_id: string
        }
        Update: {
          chapter_id?: string | null
          completed_at?: string | null
          created_at?: string
          display_order?: number
          id?: string
          item_title?: string
          item_type?: string
          module_id?: string
          plan_id?: string
          planned_date_from?: string
          planned_date_to?: string
          status?: string
          updated_at?: string
          week_index?: number
          year_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_plan_items_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "module_chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_plan_items_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_plan_items_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "study_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_plan_items_year_id_fkey"
            columns: ["year_id"]
            isOneToOne: false
            referencedRelation: "years"
            referencedColumns: ["id"]
          },
        ]
      }
      study_plans: {
        Row: {
          created_at: string
          days_per_week: number
          end_date: string
          exam_date: string | null
          hours_per_day: number
          id: string
          revision_rounds: number
          start_date: string
          updated_at: string
          user_id: string
          year_id: string
        }
        Insert: {
          created_at?: string
          days_per_week: number
          end_date: string
          exam_date?: string | null
          hours_per_day: number
          id?: string
          revision_rounds?: number
          start_date: string
          updated_at?: string
          user_id: string
          year_id: string
        }
        Update: {
          created_at?: string
          days_per_week?: number
          end_date?: string
          exam_date?: string | null
          hours_per_day?: number
          id?: string
          revision_rounds?: number
          start_date?: string
          updated_at?: string
          user_id?: string
          year_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_plans_year_id_fkey"
            columns: ["year_id"]
            isOneToOne: false
            referencedRelation: "years"
            referencedColumns: ["id"]
          },
        ]
      }
      study_resources: {
        Row: {
          chapter_id: string | null
          concept_ai_confidence: number | null
          concept_auto_assigned: boolean | null
          concept_id: string | null
          content: Json
          created_at: string | null
          created_by: string | null
          display_order: number | null
          folder: string | null
          id: string
          is_deleted: boolean | null
          module_id: string
          original_section_name: string | null
          original_section_number: string | null
          resource_type: Database["public"]["Enums"]["study_resource_type"]
          section_id: string | null
          title: string
          topic_id: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          chapter_id?: string | null
          concept_ai_confidence?: number | null
          concept_auto_assigned?: boolean | null
          concept_id?: string | null
          content?: Json
          created_at?: string | null
          created_by?: string | null
          display_order?: number | null
          folder?: string | null
          id?: string
          is_deleted?: boolean | null
          module_id: string
          original_section_name?: string | null
          original_section_number?: string | null
          resource_type: Database["public"]["Enums"]["study_resource_type"]
          section_id?: string | null
          title: string
          topic_id?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          chapter_id?: string | null
          concept_ai_confidence?: number | null
          concept_auto_assigned?: boolean | null
          concept_id?: string | null
          content?: Json
          created_at?: string | null
          created_by?: string | null
          display_order?: number | null
          folder?: string | null
          id?: string
          is_deleted?: boolean | null
          module_id?: string
          original_section_name?: string | null
          original_section_number?: string | null
          resource_type?: Database["public"]["Enums"]["study_resource_type"]
          section_id?: string | null
          title?: string
          topic_id?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "study_resources_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "module_chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_resources_concept_id_fkey"
            columns: ["concept_id"]
            isOneToOne: false
            referencedRelation: "concepts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_resources_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_resources_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_resources_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      study_settings: {
        Row: {
          id: string
          key: string
          updated_at: string | null
          updated_by: string | null
          value: string
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string | null
          updated_by?: string | null
          value: string
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string | null
          updated_by?: string | null
          value?: string
        }
        Relationships: []
      }
      study_time_events: {
        Row: {
          activity_type: string
          chapter_id: string
          created_at: string
          duration_seconds: number
          first_active_at: string | null
          id: string
          module_id: string
          session_date: string
          user_id: string
        }
        Insert: {
          activity_type: string
          chapter_id: string
          created_at?: string
          duration_seconds?: number
          first_active_at?: string | null
          id?: string
          module_id: string
          session_date?: string
          user_id: string
        }
        Update: {
          activity_type?: string
          chapter_id?: string
          created_at?: string
          duration_seconds?: number
          first_active_at?: string | null
          id?: string
          module_id?: string
          session_date?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_time_events_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "module_chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_time_events_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      tf_analytics: {
        Row: {
          chapter_id: string | null
          correct_count: number | null
          created_at: string | null
          facility_index: number | null
          flag_reasons: string[] | null
          flag_severity: string | null
          id: string
          is_flagged: boolean | null
          last_calculated_at: string | null
          module_id: string
          tf_id: string
          total_attempts: number | null
          updated_at: string | null
        }
        Insert: {
          chapter_id?: string | null
          correct_count?: number | null
          created_at?: string | null
          facility_index?: number | null
          flag_reasons?: string[] | null
          flag_severity?: string | null
          id?: string
          is_flagged?: boolean | null
          last_calculated_at?: string | null
          module_id: string
          tf_id: string
          total_attempts?: number | null
          updated_at?: string | null
        }
        Update: {
          chapter_id?: string | null
          correct_count?: number | null
          created_at?: string | null
          facility_index?: number | null
          flag_reasons?: string[] | null
          flag_severity?: string | null
          id?: string
          is_flagged?: boolean | null
          last_calculated_at?: string | null
          module_id?: string
          tf_id?: string
          total_attempts?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tf_analytics_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "module_chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tf_analytics_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tf_analytics_tf_id_fkey"
            columns: ["tf_id"]
            isOneToOne: false
            referencedRelation: "true_false_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      topic_admins: {
        Row: {
          assigned_by: string | null
          chapter_id: string | null
          created_at: string | null
          id: string
          module_id: string
          topic_id: string | null
          user_id: string
        }
        Insert: {
          assigned_by?: string | null
          chapter_id?: string | null
          created_at?: string | null
          id?: string
          module_id: string
          topic_id?: string | null
          user_id: string
        }
        Update: {
          assigned_by?: string | null
          chapter_id?: string | null
          created_at?: string | null
          id?: string
          module_id?: string
          topic_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "topic_admins_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "module_chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "topic_admins_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "topic_admins_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      topic_exam_weights: {
        Row: {
          assessment_id: string
          chapter_id: string | null
          component_id: string | null
          created_at: string
          id: string
          module_id: string
          notes: string | null
          topic_id: string | null
          updated_at: string
          weight_marks: number | null
          weight_percent: number
        }
        Insert: {
          assessment_id: string
          chapter_id?: string | null
          component_id?: string | null
          created_at?: string
          id?: string
          module_id: string
          notes?: string | null
          topic_id?: string | null
          updated_at?: string
          weight_marks?: number | null
          weight_percent?: number
        }
        Update: {
          assessment_id?: string
          chapter_id?: string | null
          component_id?: string | null
          created_at?: string
          id?: string
          module_id?: string
          notes?: string | null
          topic_id?: string | null
          updated_at?: string
          weight_marks?: number | null
          weight_percent?: number
        }
        Relationships: [
          {
            foreignKeyName: "topic_exam_weights_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessment_structures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "topic_exam_weights_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "module_chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "topic_exam_weights_component_id_fkey"
            columns: ["component_id"]
            isOneToOne: false
            referencedRelation: "assessment_components"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "topic_exam_weights_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "topic_exam_weights_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      topics: {
        Row: {
          created_at: string | null
          department_id: string
          description: string | null
          display_order: number | null
          enable_sections: boolean
          id: string
          module_id: string | null
          name: string
          name_ar: string | null
          pdf_text: string | null
          slug: string
        }
        Insert: {
          created_at?: string | null
          department_id: string
          description?: string | null
          display_order?: number | null
          enable_sections?: boolean
          id?: string
          module_id?: string | null
          name: string
          name_ar?: string | null
          pdf_text?: string | null
          slug: string
        }
        Update: {
          created_at?: string | null
          department_id?: string
          description?: string | null
          display_order?: number | null
          enable_sections?: boolean
          id?: string
          module_id?: string | null
          name?: string
          name_ar?: string | null
          pdf_text?: string | null
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "topics_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "topics_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      true_false_questions: {
        Row: {
          chapter_id: string | null
          concept_ai_confidence: number | null
          concept_auto_assigned: boolean | null
          concept_id: string | null
          contributing_department_id: string | null
          correct_answer: boolean
          created_at: string | null
          created_by: string | null
          difficulty: string | null
          display_order: number | null
          explanation: string | null
          id: string
          is_deleted: boolean | null
          module_id: string
          original_section_name: string | null
          original_section_number: string | null
          section_id: string | null
          statement: string
          topic_id: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          chapter_id?: string | null
          concept_ai_confidence?: number | null
          concept_auto_assigned?: boolean | null
          concept_id?: string | null
          contributing_department_id?: string | null
          correct_answer: boolean
          created_at?: string | null
          created_by?: string | null
          difficulty?: string | null
          display_order?: number | null
          explanation?: string | null
          id?: string
          is_deleted?: boolean | null
          module_id: string
          original_section_name?: string | null
          original_section_number?: string | null
          section_id?: string | null
          statement: string
          topic_id?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          chapter_id?: string | null
          concept_ai_confidence?: number | null
          concept_auto_assigned?: boolean | null
          concept_id?: string | null
          contributing_department_id?: string | null
          correct_answer?: boolean
          created_at?: string | null
          created_by?: string | null
          difficulty?: string | null
          display_order?: number | null
          explanation?: string | null
          id?: string
          is_deleted?: boolean | null
          module_id?: string
          original_section_name?: string | null
          original_section_number?: string | null
          section_id?: string | null
          statement?: string
          topic_id?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "true_false_questions_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "module_chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "true_false_questions_concept_id_fkey"
            columns: ["concept_id"]
            isOneToOne: false
            referencedRelation: "concepts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "true_false_questions_contributing_department_id_fkey"
            columns: ["contributing_department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "true_false_questions_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "true_false_questions_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "true_false_questions_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      tts_voices: {
        Row: {
          created_at: string | null
          display_order: number | null
          elevenlabs_voice_id: string | null
          gender: string
          id: number
          is_active: boolean | null
          label: string | null
          name: string
          provider: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string | null
          display_order?: number | null
          elevenlabs_voice_id?: string | null
          gender: string
          id?: number
          is_active?: boolean | null
          label?: string | null
          name: string
          provider?: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string | null
          display_order?: number | null
          elevenlabs_voice_id?: string | null
          gender?: string
          id?: number
          is_active?: boolean | null
          label?: string | null
          name?: string
          provider?: string
          uploaded_by?: string | null
        }
        Relationships: []
      }
      user_badges: {
        Row: {
          badge_id: string
          earned_at: string | null
          id: string
          metadata: Json | null
          user_id: string
        }
        Insert: {
          badge_id: string
          earned_at?: string | null
          id?: string
          metadata?: Json | null
          user_id: string
        }
        Update: {
          badge_id?: string
          earned_at?: string | null
          id?: string
          metadata?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["id"]
          },
        ]
      }
      user_bookmarks: {
        Row: {
          created_at: string | null
          id: string
          item_id: string
          item_type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          item_id: string
          item_type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          item_id?: string
          item_type?: string
          user_id?: string
        }
        Relationships: []
      }
      user_flashcard_stars: {
        Row: {
          card_id: string
          chapter_id: string | null
          created_at: string
          id: string
          topic_id: string | null
          user_id: string
        }
        Insert: {
          card_id: string
          chapter_id?: string | null
          created_at?: string
          id?: string
          topic_id?: string | null
          user_id: string
        }
        Update: {
          card_id?: string
          chapter_id?: string | null
          created_at?: string
          id?: string
          topic_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_flashcard_stars_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "study_resources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_flashcard_stars_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "module_chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_flashcard_stars_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      user_progress: {
        Row: {
          completed: boolean | null
          completed_at: string | null
          content_id: string
          content_type: Database["public"]["Enums"]["content_type"]
          created_at: string | null
          id: string
          score: number | null
          user_id: string
        }
        Insert: {
          completed?: boolean | null
          completed_at?: string | null
          content_id: string
          content_type: Database["public"]["Enums"]["content_type"]
          created_at?: string | null
          id?: string
          score?: number | null
          user_id: string
        }
        Update: {
          completed?: boolean | null
          completed_at?: string | null
          content_id?: string
          content_type?: Database["public"]["Enums"]["content_type"]
          created_at?: string | null
          id?: string
          score?: number | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_sessions: {
        Row: {
          client_id: string | null
          created_at: string
          duration_seconds: number | null
          id: string
          last_seen_at: string
          session_end: string | null
          session_start: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          duration_seconds?: number | null
          id?: string
          last_seen_at?: string
          session_end?: string | null
          session_start?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          client_id?: string | null
          created_at?: string
          duration_seconds?: number | null
          id?: string
          last_seen_at?: string
          session_end?: string | null
          session_start?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      video_notes: {
        Row: {
          created_at: string | null
          id: string
          note_text: string
          timestamp_seconds: number
          updated_at: string | null
          user_id: string
          video_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          note_text: string
          timestamp_seconds?: number
          updated_at?: string | null
          user_id: string
          video_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          note_text?: string
          timestamp_seconds?: number
          updated_at?: string | null
          user_id?: string
          video_id?: string
        }
        Relationships: []
      }
      video_progress: {
        Row: {
          duration_seconds: number | null
          id: string
          last_time_seconds: number
          percent_watched: number
          updated_at: string
          user_id: string
          video_id: string
        }
        Insert: {
          duration_seconds?: number | null
          id?: string
          last_time_seconds?: number
          percent_watched?: number
          updated_at?: string
          user_id: string
          video_id: string
        }
        Update: {
          duration_seconds?: number | null
          id?: string
          last_time_seconds?: number
          percent_watched?: number
          updated_at?: string
          user_id?: string
          video_id?: string
        }
        Relationships: []
      }
      video_ratings: {
        Row: {
          created_at: string | null
          id: string
          rating: number
          user_id: string
          video_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          rating: number
          user_id: string
          video_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          rating?: number
          user_id?: string
          video_id?: string
        }
        Relationships: []
      }
      virtual_patient_attempts: {
        Row: {
          case_id: string
          completed_at: string | null
          correct_count: number
          created_at: string
          flag_for_review: boolean | null
          flag_reason: string | null
          id: string
          is_completed: boolean
          score: number
          stage_answers: Json
          started_at: string
          time_taken_seconds: number | null
          tokens_used: number | null
          total_stages: number
          user_id: string
        }
        Insert: {
          case_id: string
          completed_at?: string | null
          correct_count?: number
          created_at?: string
          flag_for_review?: boolean | null
          flag_reason?: string | null
          id?: string
          is_completed?: boolean
          score?: number
          stage_answers?: Json
          started_at?: string
          time_taken_seconds?: number | null
          tokens_used?: number | null
          total_stages: number
          user_id: string
        }
        Update: {
          case_id?: string
          completed_at?: string | null
          correct_count?: number
          created_at?: string
          flag_for_review?: boolean | null
          flag_reason?: string | null
          id?: string
          is_completed?: boolean
          score?: number
          stage_answers?: Json
          started_at?: string
          time_taken_seconds?: number | null
          tokens_used?: number | null
          total_stages?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "virtual_patient_attempts_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "virtual_patient_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      virtual_patient_cases: {
        Row: {
          active_sections: string[] | null
          additional_instructions: string | null
          ai_confidence: number | null
          avatar_id: number | null
          case_mode: string | null
          case_type: string
          chapter_id: string | null
          chief_complaint: string | null
          concept_id: string | null
          created_at: string
          created_by: string | null
          delivery_mode: string | null
          estimated_minutes: number
          feedback_timing: string
          generated_case_data: Json | null
          history_interaction_mode: string
          history_mode: string | null
          id: string
          initial_state_json: Json | null
          intro_text: string
          is_ai_driven: boolean | null
          is_deleted: boolean
          is_published: boolean
          learning_objectives: string | null
          legacy_case_scenario_id: string | null
          level: string
          max_turns: number | null
          module_id: string | null
          original_section_name: string | null
          original_section_number: string | null
          patient_age: number | null
          patient_gender: string | null
          patient_image_url: string | null
          patient_language: string | null
          patient_name: string | null
          section_id: string | null
          section_question_counts: Json | null
          status_panel_enabled: boolean
          tags: string[] | null
          title: string
          topic_id: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          active_sections?: string[] | null
          additional_instructions?: string | null
          ai_confidence?: number | null
          avatar_id?: number | null
          case_mode?: string | null
          case_type?: string
          chapter_id?: string | null
          chief_complaint?: string | null
          concept_id?: string | null
          created_at?: string
          created_by?: string | null
          delivery_mode?: string | null
          estimated_minutes?: number
          feedback_timing?: string
          generated_case_data?: Json | null
          history_interaction_mode?: string
          history_mode?: string | null
          id?: string
          initial_state_json?: Json | null
          intro_text: string
          is_ai_driven?: boolean | null
          is_deleted?: boolean
          is_published?: boolean
          learning_objectives?: string | null
          legacy_case_scenario_id?: string | null
          level?: string
          max_turns?: number | null
          module_id?: string | null
          original_section_name?: string | null
          original_section_number?: string | null
          patient_age?: number | null
          patient_gender?: string | null
          patient_image_url?: string | null
          patient_language?: string | null
          patient_name?: string | null
          section_id?: string | null
          section_question_counts?: Json | null
          status_panel_enabled?: boolean
          tags?: string[] | null
          title: string
          topic_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          active_sections?: string[] | null
          additional_instructions?: string | null
          ai_confidence?: number | null
          avatar_id?: number | null
          case_mode?: string | null
          case_type?: string
          chapter_id?: string | null
          chief_complaint?: string | null
          concept_id?: string | null
          created_at?: string
          created_by?: string | null
          delivery_mode?: string | null
          estimated_minutes?: number
          feedback_timing?: string
          generated_case_data?: Json | null
          history_interaction_mode?: string
          history_mode?: string | null
          id?: string
          initial_state_json?: Json | null
          intro_text?: string
          is_ai_driven?: boolean | null
          is_deleted?: boolean
          is_published?: boolean
          learning_objectives?: string | null
          legacy_case_scenario_id?: string | null
          level?: string
          max_turns?: number | null
          module_id?: string | null
          original_section_name?: string | null
          original_section_number?: string | null
          patient_age?: number | null
          patient_gender?: string | null
          patient_image_url?: string | null
          patient_language?: string | null
          patient_name?: string | null
          section_id?: string | null
          section_question_counts?: Json | null
          status_panel_enabled?: boolean
          tags?: string[] | null
          title?: string
          topic_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_cases_chapter_id"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "module_chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_cases_module_id"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "virtual_patient_cases_concept_id_fkey"
            columns: ["concept_id"]
            isOneToOne: false
            referencedRelation: "concepts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "virtual_patient_cases_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "virtual_patient_cases_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      years: {
        Row: {
          color: string | null
          created_at: string | null
          description: string | null
          display_order: number | null
          id: string
          image_url: string | null
          is_active: boolean | null
          name: string
          name_ar: string | null
          number: number
          subtitle: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name: string
          name_ar?: string | null
          number: number
          subtitle?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name?: string
          name_ar?: string | null
          number?: number
          subtitle?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      ai_case_attempt_summary: {
        Row: {
          attempt_id: string | null
          case_difficulty: string | null
          case_id: string | null
          case_title: string | null
          completed_at: string | null
          debrief_summary: string | null
          duration_seconds: number | null
          estimated_cost_usd: number | null
          flag_for_review: boolean | null
          flag_reason: string | null
          is_completed: boolean | null
          max_turns: number | null
          message_count: number | null
          module_id: string | null
          score: number | null
          started_at: string | null
          student_email: string | null
          student_name: string | null
          tokens_used: number | null
          topic_id: string | null
          total_stages: number | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_cases_module_id"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "virtual_patient_attempts_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "virtual_patient_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "virtual_patient_cases_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback_admin_view: {
        Row: {
          admin_notes: string | null
          category: Database["public"]["Enums"]["feedback_category"] | null
          chapter_id: string | null
          created_at: string | null
          id: string | null
          message: string | null
          module_id: string | null
          role: string | null
          screenshot_url: string | null
          severity: Database["public"]["Enums"]["feedback_severity"] | null
          status: Database["public"]["Enums"]["feedback_status"] | null
          tab: string | null
          topic_id: string | null
          year_id: string | null
        }
        Insert: {
          admin_notes?: string | null
          category?: Database["public"]["Enums"]["feedback_category"] | null
          chapter_id?: string | null
          created_at?: string | null
          id?: string | null
          message?: string | null
          module_id?: string | null
          role?: string | null
          screenshot_url?: string | null
          severity?: Database["public"]["Enums"]["feedback_severity"] | null
          status?: Database["public"]["Enums"]["feedback_status"] | null
          tab?: string | null
          topic_id?: string | null
          year_id?: string | null
        }
        Update: {
          admin_notes?: string | null
          category?: Database["public"]["Enums"]["feedback_category"] | null
          chapter_id?: string | null
          created_at?: string | null
          id?: string | null
          message?: string | null
          module_id?: string | null
          role?: string | null
          screenshot_url?: string | null
          severity?: Database["public"]["Enums"]["feedback_severity"] | null
          status?: Database["public"]["Enums"]["feedback_status"] | null
          tab?: string | null
          topic_id?: string | null
          year_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feedback_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "module_chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_year_id_fkey"
            columns: ["year_id"]
            isOneToOne: false
            referencedRelation: "years"
            referencedColumns: ["id"]
          },
        ]
      }
      item_feedback_admin_view: {
        Row: {
          admin_notes: string | null
          category: string | null
          chapter_id: string | null
          created_at: string | null
          id: string | null
          is_anonymous: boolean | null
          is_flagged: boolean | null
          item_id: string | null
          item_type: string | null
          message: string | null
          module_id: string | null
          rating: number | null
          resolved_at: string | null
          resolved_by: string | null
          status: string | null
        }
        Insert: {
          admin_notes?: string | null
          category?: string | null
          chapter_id?: string | null
          created_at?: string | null
          id?: string | null
          is_anonymous?: boolean | null
          is_flagged?: boolean | null
          item_id?: string | null
          item_type?: string | null
          message?: string | null
          module_id?: string | null
          rating?: number | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string | null
        }
        Update: {
          admin_notes?: string | null
          category?: string | null
          chapter_id?: string | null
          created_at?: string | null
          id?: string | null
          is_anonymous?: boolean | null
          is_flagged?: boolean | null
          item_id?: string | null
          item_type?: string | null
          message?: string | null
          module_id?: string | null
          rating?: number | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "item_feedback_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "module_chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_feedback_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      video_view_counts: {
        Row: {
          unique_viewers: number | null
          video_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      admin_ban_user: {
        Args: {
          _banned_until?: string
          _reason: string
          _target_user_id: string
        }
        Returns: undefined
      }
      admin_remove_user: {
        Args: { _reason: string; _target_user_id: string }
        Returns: undefined
      }
      admin_restore_user: {
        Args: { _reason?: string; _target_user_id: string }
        Returns: undefined
      }
      admin_unban_user: {
        Args: { _reason?: string; _target_user_id: string }
        Returns: undefined
      }
      archive_legacy_osce_questions: { Args: never; Returns: number }
      can_manage_chapter_content: {
        Args: { _chapter_id: string; _user_id: string }
        Returns: boolean
      }
      can_manage_module_content: {
        Args: { _module_id: string; _user_id: string }
        Returns: boolean
      }
      can_manage_topic_content: {
        Args: { _topic_id: string; _user_id: string }
        Returns: boolean
      }
      get_admin_level: { Args: { _user_id: string }; Returns: number }
      get_case_leaderboard: {
        Args: { p_case_id: string }
        Returns: {
          best_score: number
          display_name: string
          rank: number
          user_id: string
        }[]
      }
      get_chapter_leads: {
        Args: { _chapter_id: string }
        Returns: {
          avatar_url: string
          email: string
          full_name: string
          id: string
        }[]
      }
      get_chapter_percentile: {
        Args: {
          p_chapter_id: string
          p_question_type: Database["public"]["Enums"]["practice_question_type"]
          p_user_score: number
        }
        Returns: number
      }
      get_content_progress: {
        Args: { p_chapter_id?: string; p_topic_id?: string; p_user_id?: string }
        Returns: Json
      }
      get_module_feedback_for_admin: {
        Args: { _module_id?: string }
        Returns: {
          admin_notes: string
          category: string
          chapter_id: string
          created_at: string
          id: string
          is_anonymous: boolean
          is_flagged: boolean
          item_id: string
          item_type: string
          message: string
          module_id: string
          rating: number
          resolved_at: string
          resolved_by: string
          status: string
        }[]
      }
      get_module_leads: {
        Args: { _module_id: string }
        Returns: {
          avatar_url: string
          email: string
          full_name: string
          id: string
        }[]
      }
      get_user_analytics: {
        Args: { _user_id: string }
        Returns: {
          last_seen: string
          sessions_30d: number
          total_time_30d: number
          total_time_7d: number
          total_time_all: number
        }[]
      }
      get_user_feedback_count_today: {
        Args: { _user_id: string }
        Returns: number
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      get_user_status: {
        Args: { _user_id: string }
        Returns: {
          banned_until: string
          status: string
        }[]
      }
      get_user_warning_count: { Args: { _user_id: string }; Returns: number }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_any_module_admin: { Args: { _user_id: string }; Returns: boolean }
      is_chapter_admin: {
        Args: { _chapter_id: string; _user_id: string }
        Returns: boolean
      }
      is_chapter_admin_for: {
        Args: { _chapter_id: string; _user_id: string }
        Returns: boolean
      }
      is_department_admin: {
        Args: { _department_id: string; _user_id: string }
        Returns: boolean
      }
      is_group_admin: {
        Args: { check_group_id: string; check_user_id: string }
        Returns: boolean
      }
      is_group_member: {
        Args: { check_group_id: string; check_user_id: string }
        Returns: boolean
      }
      is_module_admin: {
        Args: { _module_id: string; _user_id: string }
        Returns: boolean
      }
      is_module_admin_for: {
        Args: { _module_id: string; _user_id: string }
        Returns: boolean
      }
      is_platform_admin_or_higher: {
        Args: { _user_id: string }
        Returns: boolean
      }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
      is_topic_admin: {
        Args: { _topic_id: string; _user_id: string }
        Returns: boolean
      }
      is_topic_admin_for: {
        Args: { _topic_id: string; _user_id: string }
        Returns: boolean
      }
      is_user_banned: { Args: { _user_id: string }; Returns: boolean }
      is_user_removed: { Args: { _user_id: string }; Returns: boolean }
      log_audit_event: {
        Args: {
          _action: string
          _entity_id: string
          _entity_type: string
          _metadata?: Json
        }
        Returns: string
      }
      reveal_feedback_identity: {
        Args: { _feedback_id: string; _reason: string }
        Returns: string
      }
      save_question_attempt:
        | {
            Args: {
              p_chapter_id?: string
              p_is_correct?: boolean
              p_module_id?: string
              p_question_id: string
              p_question_type: Database["public"]["Enums"]["practice_question_type"]
              p_score?: number
              p_selected_answer?: Json
              p_topic_id?: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_chapter_id?: string
              p_confidence_level?: number
              p_is_correct?: boolean
              p_module_id?: string
              p_question_id: string
              p_question_type: Database["public"]["Enums"]["practice_question_type"]
              p_score?: number
              p_selected_answer?: Json
              p_topic_id?: string
            }
            Returns: Json
          }
      upsert_student_chapter_metrics: {
        Args: {
          p_chapter_id: string
          p_coverage_percent?: number
          p_flashcards_due?: number
          p_flashcards_overdue?: number
          p_last_activity_at?: string
          p_last_flashcard_review_at?: string
          p_last_mcq_attempt_at?: string
          p_last_video_at?: string
          p_mcq_accuracy?: number
          p_mcq_attempts?: number
          p_mcq_correct?: number
          p_mcq_wrong?: number
          p_minutes_practicing?: number
          p_minutes_reading?: number
          p_minutes_total?: number
          p_minutes_watching?: number
          p_module_id: string
          p_readiness_score?: number
          p_recent_mcq_accuracy?: number
          p_resources_viewed?: number
          p_student_id: string
          p_videos_completed?: number
          p_videos_total?: number
        }
        Returns: undefined
      }
    }
    Enums: {
      app_role:
        | "student"
        | "teacher"
        | "admin"
        | "department_admin"
        | "platform_admin"
        | "super_admin"
        | "topic_admin"
      assessment_type:
        | "formative"
        | "final_written"
        | "final_practical"
        | "module_exam"
      card_rating_type: "easy" | "hard" | "revise"
      case_difficulty: "easy" | "moderate" | "difficult"
      case_question_type: "short_answer" | "single_best_answer"
      content_type:
        | "lecture"
        | "resource"
        | "mcq"
        | "essay"
        | "practical"
        | "osce"
        | "case_scenario"
        | "matching"
      department_category: "basic" | "clinical"
      exam_component_type:
        | "mcq"
        | "short_answer_recall"
        | "short_answer_case"
        | "osce"
        | "long_case"
        | "short_case"
        | "paraclinical"
      feedback_category:
        | "bug"
        | "content_error"
        | "suggestion"
        | "complaint"
        | "academic_integrity"
        | "other"
      feedback_severity: "normal" | "urgent" | "extreme"
      feedback_status: "new" | "in_review" | "closed"
      mcq_difficulty: "easy" | "medium" | "hard"
      mind_map_source_type: "generated_markdown" | "legacy_html"
      mind_map_status: "draft" | "published"
      mind_map_type: "full" | "section" | "ultra"
      practice_question_type: "mcq" | "osce" | "guided_explanation"
      question_attempt_status: "unseen" | "attempted" | "correct" | "incorrect"
      study_resource_type:
        | "flashcard"
        | "table"
        | "algorithm"
        | "exam_tip"
        | "key_image"
        | "mind_map"
        | "clinical_case_worked"
        | "guided_explanation"
        | "infographic"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "student",
        "teacher",
        "admin",
        "department_admin",
        "platform_admin",
        "super_admin",
        "topic_admin",
      ],
      assessment_type: [
        "formative",
        "final_written",
        "final_practical",
        "module_exam",
      ],
      card_rating_type: ["easy", "hard", "revise"],
      case_difficulty: ["easy", "moderate", "difficult"],
      case_question_type: ["short_answer", "single_best_answer"],
      content_type: [
        "lecture",
        "resource",
        "mcq",
        "essay",
        "practical",
        "osce",
        "case_scenario",
        "matching",
      ],
      department_category: ["basic", "clinical"],
      exam_component_type: [
        "mcq",
        "short_answer_recall",
        "short_answer_case",
        "osce",
        "long_case",
        "short_case",
        "paraclinical",
      ],
      feedback_category: [
        "bug",
        "content_error",
        "suggestion",
        "complaint",
        "academic_integrity",
        "other",
      ],
      feedback_severity: ["normal", "urgent", "extreme"],
      feedback_status: ["new", "in_review", "closed"],
      mcq_difficulty: ["easy", "medium", "hard"],
      mind_map_source_type: ["generated_markdown", "legacy_html"],
      mind_map_status: ["draft", "published"],
      mind_map_type: ["full", "section", "ultra"],
      practice_question_type: ["mcq", "osce", "guided_explanation"],
      question_attempt_status: ["unseen", "attempted", "correct", "incorrect"],
      study_resource_type: [
        "flashcard",
        "table",
        "algorithm",
        "exam_tip",
        "key_image",
        "mind_map",
        "clinical_case_worked",
        "guided_explanation",
        "infographic",
      ],
    },
  },
} as const
