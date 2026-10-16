import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

export function serviceClient(): SupabaseClient {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("Supabase service credentials are missing");
  return createClient(url, key, { auth: { persistSession: false } });
}

export function userClient(authHeader: string): SupabaseClient {
  const url = Deno.env.get("SUPABASE_URL");
  const anon = Deno.env.get("SUPABASE_ANON_KEY");
  if (!url || !anon) throw new Error("Supabase anon credentials are missing");
  return createClient(url, anon, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });
}

export async function requireUser(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) throw new Error("Missing Authorization header");
  const { data, error } = await userClient(authHeader).auth.getUser();
  if (error || !data.user) throw new Error("Not authenticated");
  return data.user;
}

export async function requireBillingAdmin(orgId: string, userId: string) {
  const admin = serviceClient();
  const { data, error } = await admin
    .from("organization_members")
    .select("role")
    .eq("organization_id", orgId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  if (!data || (data.role !== "owner" && data.role !== "admin")) {
    throw new Error("Only owners and admins can manage billing");
  }

  const { data: subscription, error: subError } = await admin
    .from("subscriptions")
    .select("*")
    .eq("organization_id", orgId)
    .maybeSingle();
  if (subError) throw subError;
  if (!subscription) throw new Error("No subscription row for this organization");

  const { data: organization, error: orgError } = await admin
    .from("organizations")
    .select("id, name")
    .eq("id", orgId)
    .maybeSingle();
  if (orgError) throw orgError;
  if (!organization) throw new Error("Organization not found");

  return { admin, subscription, organization };
}
