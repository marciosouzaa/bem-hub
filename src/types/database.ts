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
          model?: string;
          temperature?: number;
          is_default?: boolean;
          created_by: string;
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
    };
    CompositeTypes: Record<string, never>;
  };
};
