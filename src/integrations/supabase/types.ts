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
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          action: string
          created_at: string
          description: string
          entity_id: string | null
          entity_type: string | null
          id: string
          ip_address: unknown | null
          metadata: Json | null
          status: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          description: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: unknown | null
          metadata?: Json | null
          status?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          description?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: unknown | null
          metadata?: Json | null
          status?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      ai_generations: {
        Row: {
          completed_at: string | null
          created_at: string
          error_message: string | null
          external_id: string | null
          id: string
          metadata: Json | null
          parameters: Json | null
          prompt: string
          result_url: string | null
          service: string
          status: string
          track_id: string | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          external_id?: string | null
          id?: string
          metadata?: Json | null
          parameters?: Json | null
          prompt: string
          result_url?: string | null
          service: string
          status?: string
          track_id?: string | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          external_id?: string | null
          id?: string
          metadata?: Json | null
          parameters?: Json | null
          prompt?: string
          result_url?: string | null
          service?: string
          status?: string
          track_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_generations_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      artist_collaborators: {
        Row: {
          accepted_at: string | null
          artist_id: string
          collaborator_user_id: string
          created_at: string
          id: string
          invited_at: string | null
          invited_by: string | null
          permissions: Json | null
          role: string
          status: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          artist_id: string
          collaborator_user_id: string
          created_at?: string
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          permissions?: Json | null
          role?: string
          status?: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          artist_id?: string
          collaborator_user_id?: string
          created_at?: string
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          permissions?: Json | null
          role?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      artists: {
        Row: {
          avatar_url: string | null
          banner_url: string | null
          bio: string | null
          contact_info: Json | null
          created_at: string
          description: string | null
          genre: string | null
          id: string
          is_active: boolean
          metadata: Json | null
          name: string
          social_links: Json | null
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          banner_url?: string | null
          bio?: string | null
          contact_info?: Json | null
          created_at?: string
          description?: string | null
          genre?: string | null
          id?: string
          is_active?: boolean
          metadata?: Json | null
          name: string
          social_links?: Json | null
          type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          banner_url?: string | null
          bio?: string | null
          contact_info?: Json | null
          created_at?: string
          description?: string | null
          genre?: string | null
          id?: string
          is_active?: boolean
          metadata?: Json | null
          name?: string
          social_links?: Json | null
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      auth_analytics: {
        Row: {
          action: string
          created_at: string
          error_message: string | null
          id: string
          ip_address: unknown | null
          metadata: Json | null
          provider: string
          success: boolean
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          error_message?: string | null
          id?: string
          ip_address?: unknown | null
          metadata?: Json | null
          provider: string
          success?: boolean
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          error_message?: string | null
          id?: string
          ip_address?: unknown | null
          metadata?: Json | null
          provider?: string
          success?: boolean
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      logs: {
        Row: {
          action: string | null
          component: string | null
          context: Json | null
          created_at: string | null
          duration_ms: number | null
          error_stack: string | null
          id: string
          ip_address: unknown | null
          level: string
          message: string
          session_id: string | null
          url: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action?: string | null
          component?: string | null
          context?: Json | null
          created_at?: string | null
          duration_ms?: number | null
          error_stack?: string | null
          id?: string
          ip_address?: unknown | null
          level: string
          message: string
          session_id?: string | null
          url?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string | null
          component?: string | null
          context?: Json | null
          created_at?: string | null
          duration_ms?: number | null
          error_stack?: string | null
          id?: string
          ip_address?: unknown | null
          level?: string
          message?: string
          session_id?: string | null
          url?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          action_url: string | null
          category: string | null
          created_at: string
          id: string
          is_read: boolean
          message: string
          metadata: Json | null
          title: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          action_url?: string | null
          category?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          metadata?: Json | null
          title: string
          type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          action_url?: string | null
          category?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          metadata?: Json | null
          title?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      operation_locks: {
        Row: {
          expires_at: string
          key: string
        }
        Insert: {
          expires_at?: string
          key: string
        }
        Update: {
          expires_at?: string
          key?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string | null
          id: string
          metadata: Json | null
          onboarding_completed: boolean | null
          onboarding_step: number | null
          preferences: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          metadata?: Json | null
          onboarding_completed?: boolean | null
          onboarding_step?: number | null
          preferences?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          metadata?: Json | null
          onboarding_completed?: boolean | null
          onboarding_step?: number | null
          preferences?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      project_notes: {
        Row: {
          content: string | null
          created_at: string
          id: string
          metadata: Json | null
          note_type: string
          project_id: string
          title: string
          updated_at: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          note_type?: string
          project_id: string
          title: string
          updated_at?: string
        }
        Update: {
          content?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          note_type?: string
          project_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_project_notes_project_id"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          artist_id: string
          cover_metadata: Json | null
          cover_url: string | null
          created_at: string
          description: string | null
          id: string
          is_inbox: boolean | null
          metadata: Json | null
          status: string
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          artist_id: string
          cover_metadata?: Json | null
          cover_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_inbox?: boolean | null
          metadata?: Json | null
          status?: string
          title: string
          type: string
          updated_at?: string
        }
        Update: {
          artist_id?: string
          cover_metadata?: Json | null
          cover_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_inbox?: boolean | null
          metadata?: Json | null
          status?: string
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
        ]
      }
      promo_materials: {
        Row: {
          category: string
          created_at: string
          description: string | null
          entity_id: string
          entity_type: string
          file_name: string
          file_size: number | null
          file_type: string
          file_url: string
          id: string
          is_primary: boolean
          metadata: Json | null
          mime_type: string | null
          tags: string[] | null
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          entity_id: string
          entity_type: string
          file_name: string
          file_size?: number | null
          file_type: string
          file_url: string
          id?: string
          is_primary?: boolean
          metadata?: Json | null
          mime_type?: string | null
          tags?: string[] | null
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          entity_id?: string
          entity_type?: string
          file_name?: string
          file_size?: number | null
          file_type?: string
          file_url?: string
          id?: string
          is_primary?: boolean
          metadata?: Json | null
          mime_type?: string | null
          tags?: string[] | null
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      reference_research: {
        Row: {
          ai_analysis: string | null
          ai_model: string | null
          ai_provider: string | null
          analysis_data: Json | null
          created_at: string
          id: string
          project_note_id: string
          reference_artist: string
          reference_title: string
        }
        Insert: {
          ai_analysis?: string | null
          ai_model?: string | null
          ai_provider?: string | null
          analysis_data?: Json | null
          created_at?: string
          id?: string
          project_note_id: string
          reference_artist: string
          reference_title: string
        }
        Update: {
          ai_analysis?: string | null
          ai_model?: string | null
          ai_provider?: string | null
          analysis_data?: Json | null
          created_at?: string
          id?: string
          project_note_id?: string
          reference_artist?: string
          reference_title?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_reference_research_note_id"
            columns: ["project_note_id"]
            isOneToOne: false
            referencedRelation: "project_notes"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          created_at: string
          data: Json
          id: string
          is_active: boolean
          last_opened_at: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data?: Json
          id?: string
          is_active?: boolean
          last_opened_at?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          data?: Json
          id?: string
          is_active?: boolean
          last_opened_at?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      track_assets: {
        Row: {
          created_at: string
          id: string
          metadata: Json | null
          track_id: string
          type: string
          url: string
        }
        Insert: {
          created_at?: string
          id?: string
          metadata?: Json | null
          track_id: string
          type: string
          url: string
        }
        Update: {
          created_at?: string
          id?: string
          metadata?: Json | null
          track_id?: string
          type?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "track_assets_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      track_versions: {
        Row: {
          audio_url: string
          change_description: string | null
          created_at: string
          id: string
          metadata: Json | null
          track_id: string
          version_number: number
        }
        Insert: {
          audio_url: string
          change_description?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          track_id: string
          version_number: number
        }
        Update: {
          audio_url?: string
          change_description?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          track_id?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "track_versions_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      tracks: {
        Row: {
          audio_url: string | null
          created_at: string
          current_version: number | null
          description: string | null
          duration: number | null
          genre_tags: string[] | null
          id: string
          lyrics: string | null
          metadata: Json | null
          project_id: string
          style_prompt: string | null
          title: string
          track_number: number
          updated_at: string
          waveform_data: Json | null
        }
        Insert: {
          audio_url?: string | null
          created_at?: string
          current_version?: number | null
          description?: string | null
          duration?: number | null
          genre_tags?: string[] | null
          id?: string
          lyrics?: string | null
          metadata?: Json | null
          project_id: string
          style_prompt?: string | null
          title: string
          track_number: number
          updated_at?: string
          waveform_data?: Json | null
        }
        Update: {
          audio_url?: string | null
          created_at?: string
          current_version?: number | null
          description?: string | null
          duration?: number | null
          genre_tags?: string[] | null
          id?: string
          lyrics?: string | null
          metadata?: Json | null
          project_id?: string
          style_prompt?: string | null
          title?: string
          track_number?: number
          updated_at?: string
          waveform_data?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "tracks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      url_allowlist: {
        Row: {
          created_at: string | null
          description: string | null
          domain: string
          id: string
          is_active: boolean | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          domain: string
          id?: string
          is_active?: boolean | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          domain?: string
          id?: string
          is_active?: boolean | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          category: string
          created_at: string
          id: string
          key: string
          updated_at: string
          user_id: string
          value: Json
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          key: string
          updated_at?: string
          user_id: string
          value: Json
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          key?: string
          updated_at?: string
          user_id?: string
          value?: Json
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      acquire_lock: {
        Args: { p_key: string; p_ttl_seconds?: number }
        Returns: boolean
      }
      acquire_operation_lock: {
        Args: { _key: string; _ttl_seconds?: number }
        Returns: boolean
      }
      create_activity_log: {
        Args: {
          p_action: string
          p_description: string
          p_entity_id?: string
          p_entity_type?: string
          p_metadata?: Json
          p_status?: string
          p_user_id: string
        }
        Returns: string
      }
      create_notification: {
        Args: {
          p_action_url?: string
          p_category?: string
          p_message: string
          p_metadata?: Json
          p_title: string
          p_type?: string
          p_user_id: string
        }
        Returns: string
      }
      create_or_update_track_from_generation: {
        Args:
          | {
              p_artist_id?: string
              p_generation_id: string
              p_project_id?: string
            }
          | { p_generation_id: string; p_project_id?: string }
        Returns: string
      }
      dedupe_track_title: {
        Args: { p_project_id: string; p_title: string }
        Returns: string
      }
      ensure_single_project: {
        Args: { p_description?: string; p_title: string; p_user_id: string }
        Returns: string
      }
      ensure_user_inbox: {
        Args: { p_user_id: string }
        Returns: string
      }
      get_next_track_number: {
        Args: { p_project_id: string }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_url_allowed: {
        Args: { url_to_check: string }
        Returns: boolean
      }
      log_auth_event: {
        Args: {
          p_action: string
          p_error_message?: string
          p_ip_address?: unknown
          p_metadata?: Json
          p_provider: string
          p_success?: boolean
          p_user_agent?: string
          p_user_id: string
        }
        Returns: undefined
      }
      log_critical_operation: {
        Args: {
          details?: Json
          entity_id: string
          entity_type: string
          operation_type: string
        }
        Returns: undefined
      }
      release_lock: {
        Args: { p_key: string }
        Returns: undefined
      }
      release_operation_lock: {
        Args: { _key: string }
        Returns: undefined
      }
      validate_track_metadata: {
        Args: { metadata_json: Json }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
