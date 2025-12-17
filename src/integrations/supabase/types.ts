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
      clinical_cases: {
        Row: {
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
          management: string | null
          module_id: string | null
          presentation: string
          title: string
          title_ar: string | null
          topic_id: string
        }
        Insert: {
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
          management?: string | null
          module_id?: string | null
          presentation: string
          title: string
          title_ar?: string | null
          topic_id: string
        }
        Update: {
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
          management?: string | null
          module_id?: string | null
          presentation?: string
          title?: string
          title_ar?: string | null
          topic_id?: string
        }
        Relationships: [
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
          contributing_department_id: string | null
          created_at: string | null
          created_by: string | null
          display_order: number | null
          id: string
          keywords: string[] | null
          model_answer: string | null
          model_answer_ar: string | null
          module_id: string | null
          question: string
          question_ar: string | null
          title: string
          title_ar: string | null
          topic_id: string
        }
        Insert: {
          contributing_department_id?: string | null
          created_at?: string | null
          created_by?: string | null
          display_order?: number | null
          id?: string
          keywords?: string[] | null
          model_answer?: string | null
          model_answer_ar?: string | null
          module_id?: string | null
          question: string
          question_ar?: string | null
          title: string
          title_ar?: string | null
          topic_id: string
        }
        Update: {
          contributing_department_id?: string | null
          created_at?: string | null
          created_by?: string | null
          display_order?: number | null
          id?: string
          keywords?: string[] | null
          model_answer?: string | null
          model_answer_ar?: string | null
          module_id?: string | null
          question?: string
          question_ar?: string | null
          title?: string
          title_ar?: string | null
          topic_id?: string
        }
        Relationships: [
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
      lectures: {
        Row: {
          contributing_department_id: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          display_order: number | null
          duration: string | null
          id: string
          module_id: string | null
          title: string
          title_ar: string | null
          topic_id: string
          updated_at: string | null
          video_url: string | null
        }
        Insert: {
          contributing_department_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          display_order?: number | null
          duration?: string | null
          id?: string
          module_id?: string | null
          title: string
          title_ar?: string | null
          topic_id: string
          updated_at?: string | null
          video_url?: string | null
        }
        Update: {
          contributing_department_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          display_order?: number | null
          duration?: string | null
          id?: string
          module_id?: string | null
          title?: string
          title_ar?: string | null
          topic_id?: string
          updated_at?: string | null
          video_url?: string | null
        }
        Relationships: [
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
          contributing_department_id: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          display_order: number | null
          id: string
          module_id: string | null
          time_limit_minutes: number | null
          title: string
          title_ar: string | null
          topic_id: string
        }
        Insert: {
          contributing_department_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          module_id?: string | null
          time_limit_minutes?: number | null
          title: string
          title_ar?: string | null
          topic_id: string
        }
        Update: {
          contributing_department_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          module_id?: string | null
          time_limit_minutes?: number | null
          title?: string
          title_ar?: string | null
          topic_id?: string
        }
        Relationships: [
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
          slug: string
          updated_at: string | null
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
          slug: string
          updated_at?: string | null
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
          slug?: string
          updated_at?: string | null
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
      practicals: {
        Row: {
          contributing_department_id: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          display_order: number | null
          equipment: string[] | null
          id: string
          module_id: string | null
          objectives: string[] | null
          procedure: string | null
          procedure_ar: string | null
          title: string
          title_ar: string | null
          topic_id: string
          video_url: string | null
        }
        Insert: {
          contributing_department_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          display_order?: number | null
          equipment?: string[] | null
          id?: string
          module_id?: string | null
          objectives?: string[] | null
          procedure?: string | null
          procedure_ar?: string | null
          title: string
          title_ar?: string | null
          topic_id: string
          video_url?: string | null
        }
        Update: {
          contributing_department_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          display_order?: number | null
          equipment?: string[] | null
          id?: string
          module_id?: string | null
          objectives?: string[] | null
          procedure?: string | null
          procedure_ar?: string | null
          title?: string
          title_ar?: string | null
          topic_id?: string
          video_url?: string | null
        }
        Relationships: [
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
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email: string
          full_name?: string | null
          id: string
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      resources: {
        Row: {
          contributing_department_id: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          display_order: number | null
          external_url: string | null
          file_url: string | null
          id: string
          module_id: string | null
          resource_type: string | null
          title: string
          title_ar: string | null
          topic_id: string
        }
        Insert: {
          contributing_department_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          display_order?: number | null
          external_url?: string | null
          file_url?: string | null
          id?: string
          module_id?: string | null
          resource_type?: string | null
          title: string
          title_ar?: string | null
          topic_id: string
        }
        Update: {
          contributing_department_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          display_order?: number | null
          external_url?: string | null
          file_url?: string | null
          id?: string
          module_id?: string | null
          resource_type?: string | null
          title?: string
          title_ar?: string | null
          topic_id?: string
        }
        Relationships: [
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
      topics: {
        Row: {
          created_at: string | null
          department_id: string
          description: string | null
          display_order: number | null
          id: string
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
      [_ in never]: never
    }
    Functions: {
      can_manage_module_content: {
        Args: { _module_id: string; _user_id: string }
        Returns: boolean
      }
      get_admin_level: { Args: { _user_id: string }; Returns: number }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
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
    }
    Enums: {
      app_role:
        | "student"
        | "teacher"
        | "admin"
        | "department_admin"
        | "platform_admin"
        | "super_admin"
      content_type: "lecture" | "resource" | "mcq" | "essay" | "practical"
      department_category: "basic" | "clinical"
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
      ],
      content_type: ["lecture", "resource", "mcq", "essay", "practical"],
      department_category: ["basic", "clinical"],
    },
  },
} as const
