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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      ai_provider_connections: {
        Row: {
          available_models: Json
          created_at: string
          created_by: string
          default_model: string | null
          encrypted_api_key: string
          id: string
          is_default: boolean
          key_hint: string | null
          name: string
          organization_id: string
          provider: string
          status: string
          updated_at: string
          validated_at: string | null
        }
        Insert: {
          available_models?: Json
          created_at?: string
          created_by: string
          default_model?: string | null
          encrypted_api_key: string
          id?: string
          is_default?: boolean
          key_hint?: string | null
          name: string
          organization_id: string
          provider: string
          status?: string
          updated_at?: string
          validated_at?: string | null
        }
        Update: {
          available_models?: Json
          created_at?: string
          created_by?: string
          default_model?: string | null
          encrypted_api_key?: string
          id?: string
          is_default?: boolean
          key_hint?: string | null
          name?: string
          organization_id?: string
          provider?: string
          status?: string
          updated_at?: string
          validated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_provider_connections_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      assistants: {
        Row: {
          area: string | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          instructions: string
          is_default: boolean
          model: string
          name: string
          organization_id: string
          provider: string
          provider_connection_id: string | null
          temperature: number
        }
        Insert: {
          area?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          instructions: string
          is_default?: boolean
          model?: string
          name: string
          organization_id: string
          provider?: string
          provider_connection_id?: string | null
          temperature?: number
        }
        Update: {
          area?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          instructions?: string
          is_default?: boolean
          model?: string
          name?: string
          organization_id?: string
          provider?: string
          provider_connection_id?: string | null
          temperature?: number
        }
        Relationships: [
          {
            foreignKeyName: "assistants_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assistants_provider_connection_id_fkey"
            columns: ["provider_connection_id"]
            isOneToOne: false
            referencedRelation: "ai_provider_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_runs: {
        Row: {
          automation_id: string | null
          created_at: string
          created_by: string
          error: string | null
          id: string
          input: Json
          organization_id: string
          output: Json | null
          status: Database["public"]["Enums"]["run_status"]
        }
        Insert: {
          automation_id?: string | null
          created_at?: string
          created_by: string
          error?: string | null
          id?: string
          input?: Json
          organization_id: string
          output?: Json | null
          status?: Database["public"]["Enums"]["run_status"]
        }
        Update: {
          automation_id?: string | null
          created_at?: string
          created_by?: string
          error?: string | null
          id?: string
          input?: Json
          organization_id?: string
          output?: Json | null
          status?: Database["public"]["Enums"]["run_status"]
        }
        Relationships: [
          {
            foreignKeyName: "automation_runs_automation_id_fkey"
            columns: ["automation_id"]
            isOneToOne: false
            referencedRelation: "automations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_runs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      automations: {
        Row: {
          config: Json
          created_at: string
          created_by: string
          id: string
          name: string
          organization_id: string
          template_key: string
          type: string
        }
        Insert: {
          config?: Json
          created_at?: string
          created_by: string
          id?: string
          name: string
          organization_id: string
          template_key: string
          type?: string
        }
        Update: {
          config?: Json
          created_at?: string
          created_by?: string
          id?: string
          name?: string
          organization_id?: string
          template_key?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "automations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          assistant_id: string | null
          created_at: string
          id: string
          organization_id: string
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          assistant_id?: string | null
          created_at?: string
          id?: string
          organization_id: string
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          assistant_id?: string | null
          created_at?: string
          id?: string
          organization_id?: string
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_assistant_id_fkey"
            columns: ["assistant_id"]
            isOneToOne: false
            referencedRelation: "assistants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      document_chunks: {
        Row: {
          chunk_index: number
          content: string
          created_at: string
          document_id: string
          embedding: string | null
          id: string
          organization_id: string
          token_count: number | null
        }
        Insert: {
          chunk_index: number
          content: string
          created_at?: string
          document_id: string
          embedding?: string | null
          id?: string
          organization_id: string
          token_count?: number | null
        }
        Update: {
          chunk_index?: number
          content?: string
          created_at?: string
          document_id?: string
          embedding?: string | null
          id?: string
          organization_id?: string
          token_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "document_chunks_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_chunks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          chunk_count: number
          created_at: string
          created_by: string
          embedding_model: string | null
          error: string | null
          file_path: string
          file_size: number | null
          id: string
          knowledge_base_id: string | null
          mime_type: string
          name: string
          organization_id: string
          processed_at: string | null
          status: Database["public"]["Enums"]["document_status"]
        }
        Insert: {
          chunk_count?: number
          created_at?: string
          created_by: string
          embedding_model?: string | null
          error?: string | null
          file_path: string
          file_size?: number | null
          id?: string
          knowledge_base_id?: string | null
          mime_type: string
          name: string
          organization_id: string
          processed_at?: string | null
          status?: Database["public"]["Enums"]["document_status"]
        }
        Update: {
          chunk_count?: number
          created_at?: string
          created_by?: string
          embedding_model?: string | null
          error?: string | null
          file_path?: string
          file_size?: number | null
          id?: string
          knowledge_base_id?: string | null
          mime_type?: string
          name?: string
          organization_id?: string
          processed_at?: string | null
          status?: Database["public"]["Enums"]["document_status"]
        }
        Relationships: [
          {
            foreignKeyName: "documents_knowledge_base_id_fkey"
            columns: ["knowledge_base_id"]
            isOneToOne: false
            referencedRelation: "knowledge_bases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      integrations: {
        Row: {
          config: Json
          created_at: string
          id: string
          organization_id: string
          provider: string
          status: string
        }
        Insert: {
          config?: Json
          created_at?: string
          id?: string
          organization_id: string
          provider: string
          status?: string
        }
        Update: {
          config?: Json
          created_at?: string
          id?: string
          organization_id?: string
          provider?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "integrations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_bases: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          organization_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          organization_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_bases_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          metadata: Json
          model: string | null
          organization_id: string
          role: string
          tokens_input: number | null
          tokens_output: number | null
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          metadata?: Json
          model?: string | null
          organization_id: string
          role: string
          tokens_input?: number | null
          tokens_output?: number | null
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          metadata?: Json
          model?: string | null
          organization_id?: string
          role?: string
          tokens_input?: number | null
          tokens_output?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          role: Database["public"]["Enums"]["organization_role"]
          status: Database["public"]["Enums"]["member_status"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          role?: Database["public"]["Enums"]["organization_role"]
          status?: Database["public"]["Enums"]["member_status"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          role?: Database["public"]["Enums"]["organization_role"]
          status?: Database["public"]["Enums"]["member_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          id: string
          name: string
          owner_id: string
          slug: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          owner_id: string
          slug: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          owner_id?: string
          slug?: string
        }
        Relationships: []
      }
      plans: {
        Row: {
          created_at: string
          id: string
          key: string
          limits: Json
          name: string
          price_monthly: number
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          limits?: Json
          name: string
          price_monthly?: number
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          limits?: Json
          name?: string
          price_monthly?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          id: string
          name: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          id: string
          name?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string | null
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          gateway: string | null
          gateway_customer_id: string | null
          gateway_subscription_id: string | null
          id: string
          organization_id: string
          plan_id: string
          status: Database["public"]["Enums"]["subscription_status"]
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          gateway?: string | null
          gateway_customer_id?: string | null
          gateway_subscription_id?: string | null
          id?: string
          organization_id: string
          plan_id: string
          status?: Database["public"]["Enums"]["subscription_status"]
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          gateway?: string | null
          gateway_customer_id?: string | null
          gateway_subscription_id?: string | null
          id?: string
          organization_id?: string
          plan_id?: string
          status?: Database["public"]["Enums"]["subscription_status"]
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      usage_events: {
        Row: {
          cost_estimate: number | null
          created_at: string
          event_type: string
          id: string
          metadata: Json
          model: string | null
          organization_id: string
          tokens_input: number | null
          tokens_output: number | null
          user_id: string | null
        }
        Insert: {
          cost_estimate?: number | null
          created_at?: string
          event_type: string
          id?: string
          metadata?: Json
          model?: string | null
          organization_id: string
          tokens_input?: number | null
          tokens_output?: number | null
          user_id?: string | null
        }
        Update: {
          cost_estimate?: number | null
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json
          model?: string | null
          organization_id?: string
          tokens_input?: number | null
          tokens_output?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "usage_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_organization_member_by_email: {
        Args: {
          target_email: string
          target_organization_id: string
          target_role?: Database["public"]["Enums"]["organization_role"]
        }
        Returns: string
      }
      bootstrap_owned_organization: {
        Args: { target_organization_id: string }
        Returns: {
          organization_id: string
          role: Database["public"]["Enums"]["organization_role"]
        }[]
      }
      delete_assistant: {
        Args: { target_assistant_id: string; target_organization_id: string }
        Returns: undefined
      }
      finalize_chat_completion: {
        Args: {
          input_tokens: number | null
          message_content: string
          message_metadata: Json
          model_name: string
          output_tokens: number | null
          target_conversation_id: string
          target_organization_id: string
          usage_metadata: Json
        }
        Returns: string
      }
      is_org_admin: {
        Args: { target_organization_id: string }
        Returns: boolean
      }
      is_org_member: {
        Args: { target_organization_id: string }
        Returns: boolean
      }
      match_document_chunks: {
        Args: {
          match_count?: number
          query_embedding: string
          target_organization_id: string
        }
        Returns: {
          content: string
          document_id: string
          id: string
          similarity: number
        }[]
      }
      manage_organization_member: {
        Args: {
          target_organization_id: string
          target_role: Database["public"]["Enums"]["organization_role"]
          target_status: Database["public"]["Enums"]["member_status"]
          target_user_id: string
        }
        Returns: undefined
      }
      set_default_assistant: {
        Args: { target_assistant_id: string; target_organization_id: string }
        Returns: undefined
      }
    }
    Enums: {
      document_status: "uploaded" | "processing" | "ready" | "failed"
      member_status: "active" | "invited" | "removed"
      organization_role: "owner" | "admin" | "member"
      run_status: "queued" | "running" | "succeeded" | "failed"
      subscription_status:
        | "trialing"
        | "active"
        | "past_due"
        | "canceled"
        | "manual"
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
      document_status: ["uploaded", "processing", "ready", "failed"],
      member_status: ["active", "invited", "removed"],
      organization_role: ["owner", "admin", "member"],
      run_status: ["queued", "running", "succeeded", "failed"],
      subscription_status: [
        "trialing",
        "active",
        "past_due",
        "canceled",
        "manual",
      ],
    },
  },
} as const
