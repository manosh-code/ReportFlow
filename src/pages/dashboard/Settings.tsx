import { FormEvent, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
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
import { openBillingPortal, PLANS, startCheckout, type PaidPlan } from "@/lib/billing";
import { cn } from "@/lib/utils";

function isPaidPlan(value: string): value is PaidPlan {
  return value === "agency" || value === "enterprise";
}

export function SettingsPage() {
  const { current, refresh } = useOrg();
  const org = current?.organization;
  const sub = current?.subscription;
  const canEdit = current?.role === "owner" || current?.role === "admin";
  const [name, setName] = useState(org?.name ?? "");
  const [domain, setDomain] = useState(org?.company_domain ?? "");
  const [autoJoin, setAutoJoin] = useState(org?.domain_auto_join ?? false);
  const [busy, setBusy] = useState(false);
  const [billingBusy, setBillingBusy] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    setName(org?.name ?? "");
    setDomain(org?.company_domain ?? "");
    setAutoJoin(org?.domain_auto_join ?? false);
  }, [org?.id, org?.name, org?.company_domain, org?.domain_auto_join]);

  useEffect(() => {
    const billing = searchParams.get("billing");
    if (!billing) return;
    if (billing === "success") {
      toast.success("Checkout complete. Plan updates as soon as Stripe confirms.");
      void refresh();
    } else if (billing === "canceled") {
      toast.message("Checkout canceled.");
    }
    const next = new URLSearchParams(searchParams);
    next.delete("billing");
    setSearchParams(next, { replace: true });
  }, [refresh, searchParams, setSearchParams]);

  async function onSave(event: FormEvent) {
    event.preventDefault();
    if (!org || !canEdit) return;
    setBusy(true);
    try {
      const { error } = await supabase
        .from("organizations")
        .update({
          name,
          company_domain: domain.trim() ? domain.trim().toLowerCase() : null,
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

  async function onCheckout(plan: PaidPlan) {
    if (!org) return;
    setBillingBusy(plan);
    try {
      await startCheckout(org.id, plan);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Checkout failed");
      setBillingBusy(null);
    }
  }

  async function onPortal() {
    if (!org) return;
    setBillingBusy("portal");
    try {
      await openBillingPortal(org.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Portal failed");
      setBillingBusy(null);
    }
  }

  const currentPlan = sub?.plan ?? "free";
  const hasLiveSub = Boolean(sub?.stripe_subscription_id) &&
    (sub?.status === "active" || sub?.status === "trialing" || sub?.status === "past_due");

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
                disabled={!canEdit}
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
            Stripe Checkout for upgrades. The customer portal for invoices, cards, and
            cancellation. Plan state is written by the webhook, not the browser.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="capitalize">{currentPlan}</Badge>
            <Badge className="capitalize">{sub?.status ?? "active"}</Badge>
            {sub?.current_period_end ? (
              <span className="text-sm text-muted-foreground">
                Renews {new Date(sub.current_period_end).toLocaleDateString()}
              </span>
            ) : null}
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            {PLANS.map((plan) => {
              const selected = plan.id === currentPlan;
              const paidId = isPaidPlan(plan.id) ? plan.id : null;
              return (
                <div
                  key={plan.id}
                  className={cn(
                    "flex flex-col rounded-md border border-border p-4",
                    selected && "border-primary",
                  )}
                >
                  <p className="text-sm font-medium">{plan.name}</p>
                  <p className="mt-1 font-display text-3xl text-paper">
                    {plan.price}
                    <span className="ml-1 text-sm text-muted-foreground">{plan.cadence}</span>
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">{plan.blurb}</p>
                  {paidId && canEdit && !hasLiveSub ? (
                    <Button
                      className="mt-4"
                      type="button"
                      variant={plan.id === "enterprise" ? "default" : "outline"}
                      disabled={billingBusy !== null}
                      onClick={() => onCheckout(paidId)}
                    >
                      {billingBusy === plan.id ? "Redirecting…" : `Upgrade to ${plan.name}`}
                    </Button>
                  ) : (
                    <p className="mt-4 text-xs text-muted-foreground">
                      {selected ? "Current plan" : hasLiveSub ? "Change this in the portal" : ""}
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          {canEdit && sub?.stripe_customer_id ? (
            <Button
              type="button"
              variant="outline"
              disabled={billingBusy !== null}
              onClick={() => void onPortal()}
            >
              {billingBusy === "portal" ? "Opening…" : "Manage billing in Stripe"}
            </Button>
          ) : null}

          {!canEdit ? (
            <p className="text-sm text-muted-foreground">
              Only owners and admins can change the plan.
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
