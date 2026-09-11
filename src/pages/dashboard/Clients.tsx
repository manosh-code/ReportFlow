import { Seo } from "@/components/seo/Seo";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function ClientsPage() {
  return (
    <div className="mx-auto max-w-5xl px-8 py-10">
      <Seo title="Clients — ReportFlow" description="Client roster placeholder." path="/dashboard/clients" />
      <h1 className="font-display text-5xl text-paper">Clients</h1>
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Roster arrives with reporting</CardTitle>
          <CardDescription>
            Each client will belong to the active organization. Row-level security
            already guarantees another agency cannot read this list.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          No clients yet — this surface is reserved for the next slice.
        </CardContent>
      </Card>
    </div>
  );
}
