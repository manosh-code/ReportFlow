import { Seo } from "@/components/seo/Seo";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function ReportsPage() {
  return (
    <div className="mx-auto max-w-5xl px-8 py-10">
      <Seo title="Reports — ReportFlow" description="Reports placeholder." path="/dashboard/reports" />
      <h1 className="font-display text-5xl text-paper">Reports</h1>
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Monthly books, later</CardTitle>
          <CardDescription>
            Generation, sharing, and white-label PDFs will hang off the same org id
            you switched in the sidebar.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          No reports yet — foundation only.
        </CardContent>
      </Card>
    </div>
  );
}
