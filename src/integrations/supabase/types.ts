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
      case_scenarios: {
        Row: {
          case_history: string
          case_questions: string
          chapter_id: string | null
          created_at: string | null
          created_by: string | null
          display_order: number | null
          id: string
          is_deleted: boolean
          model_answer: string
          module_id: string | null
          rating: number | null
          title: string
          updated_by: string | null
        }
        Insert: {
          case_history: string
          case_questions: string
          chapter_id?: string | null
          created_at?: string | null
          created_by?: string | null
          display_order?: number | null
          id?: string
          is_deleted?: boolean
          model_answer: string
          module_id?: string | null
          rating?: number | null
          title: string
          updated_by?: string | null
        }
        Update: {
          case_history?: string
          case_questions?: string
          chapter_id?: string | null
          created_at?: string | null
          created_by?: string | null
          display_order?: number | null
          id?: string
          is_deleted?: boolean
          model_answer?: string
          module_id?: string | null
          rating?: number | null
          title?: string
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
        ]
      }
      clinical_cases: {
        Row: {
          chapter_id: string | null
          contributing_department_id: string | null
          created_at: string | null
          created_by: string | null
          differential_diagnosis: string[] | null
          display_order: number | null
          examination: string | null
          final_diagnosis: string | null
          history: string | null
          id: string
          investigations: string | null
          is_deleted: boolean
          management: string | null
          module_id: string | null
          presentation: string
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
          differential_diagnosis?: string[] | null
          display_order?: number | null
          examination?: string | null
          final_diagnosis?: string | null
          history?: string | null
          id?: string
          investigations?: string | null
          is_deleted?: boolean
          management?: string | null
          module_id?: string | null
          presentation: string
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
          differential_diagnosis?: string[] | null
          display_order?: number | null
          examination?: string | null
          final_diagnosis?: string | null
          history?: string | null
          id?: string
          investigations?: string | null
          is_deleted?: boolean
          management?: string | null
          module_id?: string | null
          presentation?: string
          title?: string
          title_ar?: string | null
          topic_id?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clinical_cases_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "module_chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_cases_contributing_department_id_fkey"
            columns: ["contributing_department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_cases_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_cases_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
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
      essays: {
        Row: {
          chapter_id: string | null
          contributing_department_id: string | null
          created_at: string | null
          created_by: string | null
          display_order: number | null
          id: string
          is_deleted: boolean
          keywords: string[] | null
          model_answer: string | null
          model_answer_ar: string | null
          module_id: string | null
          question: string
          question_ar: string | null
          rating: number | null
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
          display_order?: number | null
          id?: string
          is_deleted?: boolean
          keywords?: string[] | null
          model_answer?: string | null
          model_answer_ar?: string | null
          module_id?: string | null
          question: string
          question_ar?: string | null
          rating?: number | null
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
          display_order?: number | null
          id?: string
          is_deleted?: boolean
          keywords?: string[] | null
          model_answer?: string | null
          model_answer_ar?: string | null
          module_id?: string | null
          question?: string
          question_ar?: string | null
          rating?: number | null
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
            foreignKeyName: "essays_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
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
      flashcards: {
        Row: {
          back: string
          chapter_id: string
          created_at: string | null
          created_by: string | null
          display_order: number | null
          front: string
          id: string
          is_deleted: boolean
          module_id: string
          updated_by: string | null
        }
        Insert: {
          back: string
          chapter_id: string
          created_at?: string | null
          created_by?: string | null
          display_order?: number | null
          front: string
          id?: string
          is_deleted?: boolean
          module_id: string
          updated_by?: string | null
        }
        Update: {
          back?: string
          chapter_id?: string
          created_at?: string | null
          created_by?: string | null
          display_order?: number | null
          front?: string
          id?: string
          is_deleted?: boolean
          module_id?: string
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
            foreignKeyName: "flashcards_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      inquiries: {
        Row: {
          admin_notes: string | null
          category: string
          chapter_id: string | null
          created_at: string
          id: string
          is_anonymous: boolean
          message: string
          module_id: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: string
          subject: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          category: string
          chapter_id?: string | null
          created_at?: string
          id?: string
          is_anonymous?: boolean
          message: string
          module_id?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          subject: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          category?: string
          chapter_id?: string | null
          created_at?: string
          id?: string
          is_anonymous?: boolean
          message?: string
          module_id?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          subject?: string
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
        ]
      }
      item_feedback: {
        Row: {
          admin_notes: string | null
          category: string
          chapter_id: string | null
          created_at: string
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
          status: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          category: string
          chapter_id?: string | null
          created_at?: string
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
          status?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          category?: string
          chapter_id?: string | null
          created_at?: string
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
          status?: string
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
        ]
      }
      lectures: {
        Row: {
          chapter_id: string | null
          contributing_department_id: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          display_order: number | null
          duration: string | null
          id: string
          is_deleted: boolean
          module_id: string | null
          title: string
          title_ar: string | null
          topic_id: string | null
          updated_at: string | null
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
          duration?: string | null
          id?: string
          is_deleted?: boolean
          module_id?: string | null
          title: string
          title_ar?: string | null
          topic_id?: string | null
          updated_at?: string | null
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
          duration?: string | null
          id?: string
          is_deleted?: boolean
          module_id?: string | null
          title?: string
          title_ar?: string | null
          topic_id?: string | null
          updated_at?: string | null
          updated_by?: string | null
          video_url?: string | null
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
          chapter_id: string | null
          column_a_items: Json
          column_b_items: Json
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
          show_explanation: boolean
          topic_id: string | null
          updated_by: string | null
        }
        Insert: {
          chapter_id?: string | null
          column_a_items?: Json
          column_b_items?: Json
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
          show_explanation?: boolean
          topic_id?: string | null
          updated_by?: string | null
        }
        Update: {
          chapter_id?: string | null
          column_a_items?: Json
          column_b_items?: Json
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
            foreignKeyName: "matching_questions_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
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
          chapter_id: string | null
          choices: Json
          correct_key: string
          created_at: string
          created_by: string | null
          difficulty: Database["public"]["Enums"]["mcq_difficulty"] | null
          display_order: number | null
          explanation: string | null
          id: string
          is_deleted: boolean
          module_id: string
          stem: string
          updated_by: string | null
        }
        Insert: {
          chapter_id?: string | null
          choices?: Json
          correct_key: string
          created_at?: string
          created_by?: string | null
          difficulty?: Database["public"]["Enums"]["mcq_difficulty"] | null
          display_order?: number | null
          explanation?: string | null
          id?: string
          is_deleted?: boolean
          module_id: string
          stem: string
          updated_by?: string | null
        }
        Update: {
          chapter_id?: string | null
          choices?: Json
          correct_key?: string
          created_at?: string
          created_by?: string | null
          difficulty?: Database["public"]["Enums"]["mcq_difficulty"] | null
          display_order?: number | null
          explanation?: string | null
          id?: string
          is_deleted?: boolean
          module_id?: string
          stem?: string
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
            foreignKeyName: "mcqs_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
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
          created_at: string
          id: string
          module_id: string
          question_count: number
          seconds_per_question: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          module_id: string
          question_count?: number
          seconds_per_question?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
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
          display_order: number
          id: string
          module_id: string
        }
        Insert: {
          book_label: string
          chapter_prefix?: string
          created_at?: string | null
          display_order?: number
          id?: string
          module_id: string
        }
        Update: {
          book_label?: string
          chapter_prefix?: string
          created_at?: string | null
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
          chapter_number: number
          created_at: string | null
          id: string
          module_id: string
          order_index: number
          title: string
        }
        Insert: {
          book_label?: string | null
          chapter_number: number
          created_at?: string | null
          id?: string
          module_id: string
          order_index: number
          title: string
        }
        Update: {
          book_label?: string | null
          chapter_number?: number
          created_at?: string | null
          id?: string
          module_id?: string
          order_index?: number
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
      modules: {
        Row: {
          created_at: string | null
          description: string | null
          display_order: number | null
          id: string
          is_published: boolean | null
          name: string
          name_ar: string | null
          page_count: number | null
          slug: string
          updated_at: string | null
          workload_level: string | null
          year_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_published?: boolean | null
          name: string
          name_ar?: string | null
          page_count?: number | null
          slug: string
          updated_at?: string | null
          workload_level?: string | null
          year_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_published?: boolean | null
          name?: string
          name_ar?: string | null
          page_count?: number | null
          slug?: string
          updated_at?: string | null
          workload_level?: string | null
          year_id?: string
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
          answer_1: boolean
          answer_2: boolean
          answer_3: boolean
          answer_4: boolean
          answer_5: boolean
          chapter_id: string | null
          created_at: string | null
          created_by: string | null
          display_order: number | null
          explanation_1: string | null
          explanation_2: string | null
          explanation_3: string | null
          explanation_4: string | null
          explanation_5: string | null
          history_text: string
          id: string
          image_url: string
          is_deleted: boolean
          legacy_archived: boolean
          module_id: string
          statement_1: string
          statement_2: string
          statement_3: string
          statement_4: string
          statement_5: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          answer_1: boolean
          answer_2: boolean
          answer_3: boolean
          answer_4: boolean
          answer_5: boolean
          chapter_id?: string | null
          created_at?: string | null
          created_by?: string | null
          display_order?: number | null
          explanation_1?: string | null
          explanation_2?: string | null
          explanation_3?: string | null
          explanation_4?: string | null
          explanation_5?: string | null
          history_text: string
          id?: string
          image_url: string
          is_deleted?: boolean
          legacy_archived?: boolean
          module_id: string
          statement_1: string
          statement_2: string
          statement_3: string
          statement_4: string
          statement_5: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          answer_1?: boolean
          answer_2?: boolean
          answer_3?: boolean
          answer_4?: boolean
          answer_5?: boolean
          chapter_id?: string | null
          created_at?: string | null
          created_by?: string | null
          display_order?: number | null
          explanation_1?: string | null
          explanation_2?: string | null
          explanation_3?: string | null
          explanation_4?: string | null
          explanation_5?: string | null
          history_text?: string
          id?: string
          image_url?: string
          is_deleted?: boolean
          legacy_archived?: boolean
          module_id?: string
          statement_1?: string
          statement_2?: string
          statement_3?: string
          statement_4?: string
          statement_5?: string
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
            foreignKeyName: "osce_questions_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
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
          procedure: string | null
          procedure_ar: string | null
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
          procedure?: string | null
          procedure_ar?: string | null
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
          procedure?: string | null
          procedure_ar?: string | null
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
          avatar_url: string | null
          banned_until: string | null
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          status: string
          status_reason: string | null
          status_updated_at: string | null
          status_updated_by: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          banned_until?: string | null
          created_at?: string | null
          email: string
          full_name?: string | null
          id: string
          status?: string
          status_reason?: string | null
          status_updated_at?: string | null
          status_updated_by?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          banned_until?: string | null
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          status?: string
          status_reason?: string | null
          status_updated_at?: string | null
          status_updated_by?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      resources: {
        Row: {
          chapter_id: string | null
          contributing_department_id: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          display_order: number | null
          external_url: string | null
          file_url: string | null
          id: string
          is_deleted: boolean
          module_id: string | null
          resource_type: string | null
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
          external_url?: string | null
          file_url?: string | null
          id?: string
          is_deleted?: boolean
          module_id?: string | null
          resource_type?: string | null
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
          external_url?: string | null
          file_url?: string | null
          id?: string
          is_deleted?: boolean
          module_id?: string | null
          resource_type?: string | null
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
            foreignKeyName: "resources_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
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
          chapter_id: string
          content: Json
          created_at: string | null
          created_by: string | null
          display_order: number | null
          id: string
          is_deleted: boolean | null
          module_id: string
          resource_type: Database["public"]["Enums"]["study_resource_type"]
          title: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          chapter_id: string
          content?: Json
          created_at?: string | null
          created_by?: string | null
          display_order?: number | null
          id?: string
          is_deleted?: boolean | null
          module_id: string
          resource_type: Database["public"]["Enums"]["study_resource_type"]
          title: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          chapter_id?: string
          content?: Json
          created_at?: string | null
          created_by?: string | null
          display_order?: number | null
          id?: string
          is_deleted?: boolean | null
          module_id?: string
          resource_type?: Database["public"]["Enums"]["study_resource_type"]
          title?: string
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
            foreignKeyName: "study_resources_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
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
      test_items: {
        Row: {
          created_at: string
          id: number
          name: string
        }
        Insert: {
          created_at?: string
          id?: number
          name: string
        }
        Update: {
          created_at?: string
          id?: number
          name?: string
        }
        Relationships: []
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
      topics: {
        Row: {
          created_at: string | null
          department_id: string
          description: string | null
          display_order: number | null
          id: string
          module_id: string | null
          name: string
          name_ar: string | null
          slug: string
        }
        Insert: {
          created_at?: string | null
          department_id: string
          description?: string | null
          display_order?: number | null
          id?: string
          module_id?: string | null
          name: string
          name_ar?: string | null
          slug: string
        }
        Update: {
          created_at?: string | null
          department_id?: string
          description?: string | null
          display_order?: number | null
          id?: string
          module_id?: string | null
          name?: string
          name_ar?: string | null
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
      user_flashcard_stars: {
        Row: {
          card_id: string
          chapter_id: string | null
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          card_id: string
          chapter_id?: string | null
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          card_id?: string
          chapter_id?: string | null
          created_at?: string
          id?: string
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
      years: {
        Row: {
          color: string | null
          created_at: string | null
          description: string | null
          display_order: number | null
          id: string
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_chapter_admin: {
        Args: { _chapter_id: string; _user_id: string }
        Returns: boolean
      }
      is_department_admin: {
        Args: { _department_id: string; _user_id: string }
        Returns: boolean
      }
      is_module_admin: {
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
      study_resource_type:
        | "flashcard"
        | "table"
        | "algorithm"
        | "exam_tip"
        | "key_image"
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
      study_resource_type: [
        "flashcard",
        "table",
        "algorithm",
        "exam_tip",
        "key_image",
      ],
    },
  },
} as const
