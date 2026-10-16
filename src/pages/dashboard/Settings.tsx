import { FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";
import { Seo } from "@/components/seo/Seo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useOrg } from "@/hooks/useOrg";
import { supabase } from "@/integrations/supabase/client";

export function SettingsPage() {
  const { current, refresh } = useOrg();
  const org = current?.organization;
  const canEdit = current?.role === "owner" || current?.role === "admin";
  const [name, setName] = useState(org?.name ?? "");
  const [domain, setDomain] = useState(org?.company_domain ?? "");
  const [autoJoin, setAutoJoin] = useState(org?.domain_auto_join ?? false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setName(org?.name ?? "");
    setDomain(org?.company_domain ?? "");
    setAutoJoin(org?.domain_auto_join ?? false);
  }, [org?.id, org?.name, org?.company_domain, org?.domain_auto_join]);

  async function onSave(event: FormEvent) {
    event.preventDefault();
    if (!org || !canEdit) return;
    const domainNorm = domain.trim().toLowerCase();
    if (autoJoin && !domainNorm) {
      toast.error("Add a company domain before enabling auto-join.");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase
        .from("organizations")
        .update({
          name,
          company_domain: domainNorm || null,
          domain_auto_join: autoJoin,
        })
        .eq("id", org.id);
      if (error) throw error;
      await refresh();
      toast.success("Organization updated.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-8 py-10">
      <Seo
        title="Settings — ReportFlow"
        description="Organization and billing settings."
        path="/dashboard/settings"
      />
      <h1 className="font-display text-5xl text-paper">Settings</h1>

      <form onSubmit={onSave}>
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Organization</CardTitle>
            <CardDescription>
              Domain auto-join adds matching work emails as members on signup. Personal
              inbox domains are rejected in the database.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="org-name">Name</Label>
              <Input
                id="org-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={!canEdit}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="org-domain">Company domain</Label>
              <Input
                id="org-domain"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                disabled={!canEdit}
                placeholder="agency.com"
              />
            </div>
            <div className="flex items-center justify-between rounded-md border border-border px-3 py-3">
              <div>
                <p className="text-sm font-medium">Domain auto-join</p>
                <p className="text-xs text-muted-foreground">
                  New accounts whose email domain matches can join as members.
                </p>
              </div>
              <Switch
                checked={autoJoin}
                onCheckedChange={setAutoJoin}
                disabled={!canEdit || !domain.trim()}
              />
            </div>
            {canEdit ? (
              <Button disabled={busy} type="submit">
                Save
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground">Members cannot edit settings.</p>
            )}
          </CardContent>
        </Card>
      </form>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Billing</CardTitle>
          <CardDescription>
            Foundation only. Live Stripe checkout and webhooks need the managed Stripe
            integration plus a webhook secret — next step.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Badge className="capitalize">{current?.subscription?.plan ?? "free"}</Badge>
            <Badge className="capitalize">{current?.subscription?.status ?? "active"}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Stripe customer: {current?.subscription?.stripe_customer_id ?? "not linked"}
          </p>
          <p className="text-sm text-muted-foreground">
            Stripe subscription: {current?.subscription?.stripe_subscription_id ?? "not linked"}
          </p>
          <Button type="button" variant="outline" disabled>
            Upgrade with Stripe (coming next)
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
