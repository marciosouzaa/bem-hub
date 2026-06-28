export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type TableDefinition<Row, Insert = Row, Update = Partial<Insert>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: never[];
};

export type Database = {
  public: {
    Tables: {
      profiles: TableDefinition<
        {
          id: string;
          name: string | null;
          email: string | null;
          avatar_url: string | null;
          created_at: string;
        },
        {
          id: string;
          name?: string | null;
          email?: string | null;
          avatar_url?: string | null;
          created_at?: string;
        }
      >;
      organizations: TableDefinition<
        {
          id: string;
          name: string;
          slug: string;
          owner_id: string;
          created_at: string;
        },
        {
          id?: string;
          name: string;
          slug: string;
          owner_id: string;
          created_at?: string;
        }
      >;
      organization_members: TableDefinition<
        {
          id: string;
          organization_id: string;
          user_id: string;
          role: Database["public"]["Enums"]["organization_role"];
          status: Database["public"]["Enums"]["member_status"];
          created_at: string;
        },
        {
          id?: string;
          organization_id: string;
          user_id: string;
          role?: Database["public"]["Enums"]["organization_role"];
          status?: Database["public"]["Enums"]["member_status"];
          created_at?: string;
        }
      >;
      plans: TableDefinition<
        {
          id: string;
          key: string;
          name: string;
          price_monthly: number;
          limits: Json;
          created_at: string;
        },
        {
          id?: string;
          key: string;
          name: string;
          price_monthly?: number;
          limits?: Json;
          created_at?: string;
        }
      >;
      subscriptions: TableDefinition<
        {
          id: string;
          organization_id: string;
          plan_id: string;
          status: Database["public"]["Enums"]["subscription_status"];
          current_period_start: string | null;
          current_period_end: string | null;
          gateway: string | null;
          gateway_customer_id: string | null;
          gateway_subscription_id: string | null;
          created_at: string;
        },
        {
          id?: string;
          organization_id: string;
          plan_id: string;
          status?: Database["public"]["Enums"]["subscription_status"];
          current_period_start?: string | null;
          current_period_end?: string | null;
          gateway?: string | null;
          gateway_customer_id?: string | null;
          gateway_subscription_id?: string | null;
          created_at?: string;
        }
      >;
      assistants: TableDefinition<
        {
          id: string;
          organization_id: string;
          name: string;
          description: string | null;
          area: string | null;
          instructions: string;
          provider: Database["public"]["Enums"]["ai_provider"];
          provider_connection_id: string | null;
          model: string;
          temperature: number;
          is_default: boolean;
          created_by: string;
          created_at: string;
        },
        {
          id?: string;
          organization_id: string;
          name: string;
          description?: string | null;
          area?: string | null;
          instructions: string;
          provider?: Database["public"]["Enums"]["ai_provider"];
          provider_connection_id?: string | null;
          model?: string;
          temperature?: number;
          is_default?: boolean;
          created_by: string;
          created_at?: string;
        }
      >;
      ai_provider_connections: TableDefinition<
        {
          id: string;
          organization_id: string;
          provider: Database["public"]["Enums"]["ai_provider"];
          name: string;
          status: Database["public"]["Enums"]["ai_provider_connection_status"];
          encrypted_api_key: string;
          key_hint: string | null;
          default_model: string | null;
          available_models: Json;
          is_default: boolean;
          created_by: string;
          validated_at: string | null;
          created_at: string;
          updated_at: string;
        },
        {
          id?: string;
          organization_id: string;
          provider: Database["public"]["Enums"]["ai_provider"];
          name: string;
          status?: Database["public"]["Enums"]["ai_provider_connection_status"];
          encrypted_api_key: string;
          key_hint?: string | null;
          default_model?: string | null;
          available_models?: Json;
          is_default?: boolean;
          created_by: string;
          validated_at?: string | null;
          created_at?: string;
          updated_at?: string;
        },
        {
          id?: string;
          organization_id?: string;
          provider?: Database["public"]["Enums"]["ai_provider"];
          name?: string;
          status?: Database["public"]["Enums"]["ai_provider_connection_status"];
          encrypted_api_key?: string;
          key_hint?: string | null;
          default_model?: string | null;
          available_models?: Json;
          is_default?: boolean;
          created_by?: string;
          validated_at?: string | null;
          created_at?: string;
          updated_at?: string;
        }
      >;
      conversations: TableDefinition<
        {
          id: string;
          organization_id: string;
          assistant_id: string | null;
          user_id: string;
          title: string | null;
          created_at: string;
          updated_at: string;
        },
        {
          id?: string;
          organization_id: string;
          assistant_id?: string | null;
          user_id: string;
          title?: string | null;
          created_at?: string;
          updated_at?: string;
        },
        {
          id?: string;
          organization_id?: string;
          assistant_id?: string | null;
          user_id?: string;
          title?: string | null;
          created_at?: string;
          updated_at?: string;
        }
      >;
      messages: TableDefinition<
        {
          id: string;
          organization_id: string;
          conversation_id: string;
          role: "user" | "assistant" | "system";
          content: string;
          tokens_input: number | null;
          tokens_output: number | null;
          model: string | null;
          metadata: Json;
          created_at: string;
        },
        {
          id?: string;
          organization_id: string;
          conversation_id: string;
          role: "user" | "assistant" | "system";
          content: string;
          tokens_input?: number | null;
          tokens_output?: number | null;
          model?: string | null;
          metadata?: Json;
          created_at?: string;
        }
      >;
      usage_events: TableDefinition<
        {
          id: string;
          organization_id: string;
          user_id: string | null;
          event_type: string;
          model: string | null;
          tokens_input: number | null;
          tokens_output: number | null;
          cost_estimate: number | null;
          metadata: Json;
          created_at: string;
        },
        {
          id?: string;
          organization_id: string;
          user_id?: string | null;
          event_type: string;
          model?: string | null;
          tokens_input?: number | null;
          tokens_output?: number | null;
          cost_estimate?: number | null;
          metadata?: Json;
          created_at?: string;
        }
      >;
    };
    Views: Record<string, never>;
    Functions: {
      bootstrap_owned_organization: {
        Args: {
          target_organization_id: string;
        };
        Returns: {
          organization_id: string;
          role: Database["public"]["Enums"]["organization_role"];
        }[];
      };
    };
    Enums: {
      organization_role: "owner" | "admin" | "member";
      member_status: "active" | "invited" | "removed";
      document_status: "uploaded" | "processing" | "ready" | "failed";
      run_status: "queued" | "running" | "succeeded" | "failed";
      subscription_status:
        | "trialing"
        | "active"
        | "past_due"
        | "canceled"
        | "manual";
      ai_provider: "openai" | "anthropic" | "gemini" | "open-source";
      ai_provider_connection_status: "active" | "needs_attention" | "disabled";
    };
    CompositeTypes: Record<string, never>;
  };
};
