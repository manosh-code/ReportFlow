import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Seo } from "@/components/seo/Seo";
import { useAuth } from "@/hooks/useAuth";
import { useOrg } from "@/hooks/useOrg";
import { slugPreview } from "@/lib/utils";

export function OnboardingPage() {
  const { createOrg, memberships } = useOrg();
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [domain, setDomain] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      await createOrg(name, domain || undefined);
      toast.success("Organization created.");
      navigate("/dashboard", { replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create organization");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <Seo
        title="Create your agency — ReportFlow"
        description="Name your organization and optionally add a company domain for future auto-join."
        path="/onboarding"
      />
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Name the agency</CardTitle>
          <CardDescription>
            You become the owner. A company domain can later auto-join teammates
            with matching work emails — consumer inboxes are blocked.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="space-y-2">
              <Label htmlFor="org">Organization name</Label>
              <Input
                id="org"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                minLength={2}
                placeholder="Northline Media"
              />
              {name ? (
                <p className="text-xs text-muted-foreground">
                  Slug preview: {slugPreview(name) || "agency"}
                </p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="domain">Company domain (optional)</Label>
              <Input
                id="domain"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                placeholder="northline.agency"
              />
            </div>
            <Button className="w-full" disabled={busy} type="submit">
              Create organization
            </Button>
            {memberships.length > 0 ? (
              <Button
                className="w-full"
                variant="ghost"
                type="button"
                onClick={() => navigate("/dashboard")}
              >
                Back to dashboard
              </Button>
            ) : (
              <Button
                className="w-full"
                variant="ghost"
                type="button"
                onClick={() => signOut().then(() => navigate("/"))}
              >
                Sign out
              </Button>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
