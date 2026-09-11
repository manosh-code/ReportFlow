import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database, OrgRole } from "@/integrations/supabase/types";
import { useAuth } from "@/hooks/useAuth";

type Organization = Database["public"]["Tables"]["organizations"]["Row"];
type Subscription = Database["public"]["Tables"]["subscriptions"]["Row"];

type Membership = {
  organization: Organization;
  role: OrgRole;
  subscription: Subscription | null;
};

type OrgContextValue = {
  memberships: Membership[];
  current: Membership | null;
  loading: boolean;
  switchOrg: (orgId: string) => void;
  refresh: () => Promise<void>;
  createOrg: (name: string, domain?: string) => Promise<string>;
};

const STORAGE_KEY = "reportflow.activeOrg";
const OrgContext = createContext<OrgContextValue | null>(null);

export function OrgProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [activeId, setActiveId] = useState<string | null>(
    () => localStorage.getItem(STORAGE_KEY),
  );
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) {
      setMemberships([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data: members, error: memberError } = await supabase
      .from("organization_members")
      .select("role, organization_id")
      .eq("user_id", user.id);

    if (memberError) {
      setLoading(false);
      throw memberError;
    }

    const orgIds = (members ?? []).map((m) => m.organization_id);
    if (orgIds.length === 0) {
      setMemberships([]);
      setLoading(false);
      return;
    }

    const [{ data: orgs, error: orgError }, { data: subs, error: subError }] =
      await Promise.all([
        supabase.from("organizations").select("*").in("id", orgIds),
        supabase.from("subscriptions").select("*").in("organization_id", orgIds),
      ]);

    if (orgError) {
      setLoading(false);
      throw orgError;
    }
    if (subError) {
      setLoading(false);
      throw subError;
    }

    const next: Membership[] = (members ?? []).flatMap((m) => {
      const organization = (orgs ?? []).find((o) => o.id === m.organization_id);
      if (!organization) return [];
      return [
        {
          organization,
          role: m.role,
          subscription:
            (subs ?? []).find((s) => s.organization_id === m.organization_id) ??
            null,
        },
      ];
    });
    setMemberships(next);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    refresh().catch(() => setLoading(false));
  }, [refresh]);

  const current = useMemo(() => {
    if (memberships.length === 0) return null;
    return memberships.find((m) => m.organization.id === activeId) ?? memberships[0];
  }, [memberships, activeId]);

  useEffect(() => {
    if (current) localStorage.setItem(STORAGE_KEY, current.organization.id);
  }, [current]);

  const switchOrg = useCallback((orgId: string) => {
    setActiveId(orgId);
  }, []);

  const createOrg = useCallback(
    async (name: string, domain?: string) => {
      const { data, error } = await supabase.rpc("create_organization", {
        _name: name,
        _domain: domain || undefined,
      });
      if (error) throw error;
      const id = data as string;
      setActiveId(id);
      await refresh();
      return id;
    },
    [refresh],
  );

  const value = useMemo(
    () => ({
      memberships,
      current,
      loading,
      switchOrg,
      refresh,
      createOrg,
    }),
    [memberships, current, loading, switchOrg, refresh, createOrg],
  );

  return <OrgContext.Provider value={value}>{children}</OrgContext.Provider>;
}

export function useOrg() {
  const ctx = useContext(OrgContext);
  if (!ctx) throw new Error("useOrg must be used within OrgProvider");
  return ctx;
}
