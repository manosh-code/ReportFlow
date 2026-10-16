import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Seo } from "@/components/seo/Seo";
import { useOrg } from "@/hooks/useOrg";

export function DashboardOverviewPage() {
  const { current } = useOrg();

  return (
    <div className="mx-auto max-w-5xl px-8 py-10">
      <Seo
        title="Dashboard — ReportFlow"
        description="Agency reporting workspace overview."
        path="/dashboard"
      />
      <p className="text-sm uppercase tracking-[0.16em] text-primary">Overview</p>
      <h1 className="mt-2 font-display text-5xl text-paper">
        {current?.organization.name}
      </h1>
      <p className="mt-3 max-w-2xl text-muted-foreground">
        Clients and reports land in the next build. This shell is the multi-tenant
        home: switch orgs, invite the team, and upgrade from Settings with Stripe.
      </p>
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Plan</CardTitle>
            <CardDescription>Live plan from Stripe webhooks.</CardDescription>
          </CardHeader>
          <CardContent>
            <Badge className="capitalize">
              {current?.subscription?.plan ?? "free"} · {current?.subscription?.status ?? "active"}
            </Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Your role</CardTitle>
            <CardDescription>Owners and admins manage team and settings.</CardDescription>
          </CardHeader>
          <CardContent className="capitalize">{current?.role}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Coming next</CardTitle>
            <CardDescription>Reporting modules share this org context.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Clients · Reports
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
