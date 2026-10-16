import { FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";
import { Seo } from "@/components/seo/Seo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useOrg } from "@/hooks/useOrg";
import { supabase } from "@/integrations/supabase/client";
import type { OrgRole } from "@/integrations/supabase/types";

type MemberRow = {
  id: string;
  role: OrgRole;
  user_id: string;
  email: string | null;
  full_name: string | null;
};

type InviteRow = {
  id: string;
  email: string;
  role: string;
  token: string;
  expires_at: string;
  accepted_at: string | null;
};

export function TeamPage() {
  const { current } = useOrg();
  const orgId = current?.organization.id;
  const canInvite = current?.role === "owner" || current?.role === "admin";
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [invites, setInvites] = useState<InviteRow[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"member" | "admin">("member");
  const [busy, setBusy] = useState(false);
  const [lastLink, setLastLink] = useState<string | null>(null);

  useEffect(() => {
    if (!orgId) return;
    let cancelled = false;

    async function load() {
      if (!orgId) return;
      const { data: memberRows, error } = await supabase
        .from("organization_members")
        .select("id, role, user_id")
        .eq("organization_id", orgId);
      if (error) {
        toast.error(error.message);
        return;
      }
      const ids = (memberRows ?? []).map((m) => m.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, email, full_name")
        .in("id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);
      if (cancelled) return;
      setMembers(
        (memberRows ?? []).map((m) => {
          const profile = (profiles ?? []).find((p) => p.id === m.user_id);
          return {
            id: m.id,
            role: m.role,
            user_id: m.user_id,
            email: profile?.email ?? null,
            full_name: profile?.full_name ?? null,
          };
        }),
      );

      if (canInvite) {
        const { data: inviteRows } = await supabase
          .from("invites")
          .select("id, email, role, token, expires_at, accepted_at")
          .eq("organization_id", orgId)
          .is("accepted_at", null)
          .order("created_at", { ascending: false });
        if (!cancelled) setInvites(inviteRows ?? []);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [orgId, canInvite]);

  async function onInvite(event: FormEvent) {
    event.preventDefault();
    if (!orgId) return;
    setBusy(true);
    try {
      const { data, error } = await supabase.rpc("create_invite", {
        _org_id: orgId,
        _email: email,
        _role: role,
      });
      if (error) throw error;
      const link = `${window.location.origin}/invite/${data}`;
      setLastLink(link);
      await navigator.clipboard.writeText(link).catch(() => undefined);
      toast.success("Invite created. Link copied.");
      setEmail("");
      const { data: inviteRows } = await supabase
        .from("invites")
        .select("id, email, role, token, expires_at, accepted_at")
        .eq("organization_id", orgId)
        .is("accepted_at", null);
      setInvites(inviteRows ?? []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Invite failed");
    } finally {
      setBusy(false);
    }
  }

  async function revoke(id: string) {
    const { error } = await supabase.from("invites").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    setInvites((rows) => rows.filter((r) => r.id !== id));
  }

  return (
    <div className="mx-auto max-w-5xl px-8 py-10">
      <Seo title="Team — ReportFlow" description="Members and invites." path="/dashboard/team" />
      <h1 className="font-display text-5xl text-paper">Team</h1>
      <p className="mt-3 text-muted-foreground">
        Members of {current?.organization.name}. Invites expire in seven days.
      </p>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Members</CardTitle>
          <CardDescription>{members.length} in this organization</CardDescription>
        </CardHeader>
        <CardContent className="divide-y divide-border">
          {members.map((member) => (
            <div key={member.id} className="flex items-center justify-between py-3">
              <div>
                <p>{member.full_name || member.email || member.user_id}</p>
                <p className="text-xs text-muted-foreground">{member.email}</p>
              </div>
              <Badge className="capitalize">{member.role}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      {canInvite ? (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Invite a teammate</CardTitle>
            <CardDescription>
              Share the public invite URL. They sign in with the invited email, then join.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="flex flex-col gap-3 md:flex-row" onSubmit={onInvite}>
              <div className="flex-1 space-y-2">
                <Label htmlFor="invite-email">Email</Label>
                <Input
                  id="invite-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="invite-role">Role</Label>
                <select
                  id="invite-role"
                  className="flex h-10 rounded-md border border-input bg-background px-3 text-sm"
                  value={role}
                  onChange={(e) => setRole(e.target.value as "member" | "admin")}
                  disabled={current?.role !== "owner"}
                >
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <Button className="mt-7" disabled={busy} type="submit">
                Send invite
              </Button>
            </form>
            {lastLink ? (
              <p className="mt-4 break-all text-xs text-muted-foreground">{lastLink}</p>
            ) : null}

            <h3 className="mt-8 text-sm font-medium">Pending invites</h3>
            <div className="mt-2 divide-y divide-border">
              {invites.length === 0 ? (
                <p className="py-3 text-sm text-muted-foreground">None pending.</p>
              ) : (
                invites.map((invite) => (
                  <div key={invite.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                    <div>
                      <p>{invite.email}</p>
                      <p className="text-xs text-muted-foreground">
                        {invite.role} · expires {new Date(invite.expires_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const link = `${window.location.origin}/invite/${invite.token}`;
                          navigator.clipboard.writeText(link).then(
                            () => toast.success("Invite link copied."),
                            () => toast.message(link),
                          );
                        }}
                      >
                        Copy link
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => revoke(invite.id)}>
                        Revoke
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <p className="mt-6 text-sm text-muted-foreground">
          Only owners and admins can invite teammates.
        </p>
      )}
    </div>
  );
}
