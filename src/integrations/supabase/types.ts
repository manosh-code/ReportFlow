export type OrgRole = "owner" | "admin" | "member";
export type Plan = "free" | "agency" | "enterprise";
export type SubscriptionStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "canceled"
  | "incomplete";

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string | null;
          full_name: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email?: string | null;
          full_name?: string | null;
          avatar_url?: string | null;
        };
        Update: {
          email?: string | null;
          full_name?: string | null;
          avatar_url?: string | null;
        };
        Relationships: [];
      };
      organizations: {
        Row: {
          id: string;
          name: string;
          slug: string;
          company_domain: string | null;
          domain_auto_join: boolean;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          name: string;
          slug: string;
          company_domain?: string | null;
          domain_auto_join?: boolean;
          created_by?: string | null;
        };
        Update: {
          name?: string;
          company_domain?: string | null;
          domain_auto_join?: boolean;
        };
        Relationships: [];
      };
      organization_members: {
        Row: {
          id: string;
          organization_id: string;
          user_id: string;
          role: OrgRole;
          created_at: string;
        };
        Insert: {
          organization_id: string;
          user_id: string;
          role: OrgRole;
        };
        Update: {
          role?: OrgRole;
        };
        Relationships: [];
      };
      invites: {
        Row: {
          id: string;
          organization_id: string;
          email: string;
          role: Exclude<OrgRole, "owner">;
          token: string;
          invited_by: string | null;
          expires_at: string;
          accepted_at: string | null;
          created_at: string;
        };
        Insert: {
          organization_id: string;
          email: string;
          role?: Exclude<OrgRole, "owner">;
          invited_by?: string | null;
        };
        Update: {
          accepted_at?: string | null;
        };
        Relationships: [];
      };
      subscriptions: {
        Row: {
          id: string;
          organization_id: string;
          plan: Plan;
          status: SubscriptionStatus;
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
          current_period_end: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          organization_id: string;
          plan?: Plan;
          status?: SubscriptionStatus;
        };
        Update: {
          plan?: Plan;
          status?: SubscriptionStatus;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          current_period_end?: string | null;
        };
        Relationships: [];
      };
      stripe_webhook_events: {
        Row: {
          id: string;
          type: string;
          processed_at: string;
        };
        Insert: {
          id: string;
          type: string;
          processed_at?: string;
        };
        Update: {
          type?: string;
          processed_at?: string;
        };
        Relationships: [];
      };
    };
    Functions: {
      create_organization: {
        Args: { _name: string; _domain?: string | null };
        Returns: string;
      };
      create_invite: {
        Args: { _org_id: string; _email: string; _role?: string };
        Returns: string;
      };
      accept_invite: {
        Args: { _token: string };
        Returns: string;
      };
      get_invite_preview: {
        Args: { _token: string };
        Returns: {
          organization_name: string;
          email: string;
          role: string;
          expired: boolean;
          accepted: boolean;
        }[];
      };
    };
    Views: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
