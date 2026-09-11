import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Seo } from "@/components/seo/Seo";
import { useAuth } from "@/hooks/useAuth";

export function ResetPasswordPage() {
  const { updatePassword, user } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      await updatePassword(password);
      toast.success("Password updated.");
      navigate("/dashboard", { replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update password");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <Seo
        title="Set a new password — ReportFlow"
        description="Choose a new password for your ReportFlow account."
        path="/reset-password"
      />
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>New password</CardTitle>
          <CardDescription>
            {user
              ? "Choose a password at least 8 characters long."
              : "Open this page from the reset email so we can verify the session."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={!user}
              />
            </div>
            <Button className="w-full" disabled={busy || !user} type="submit">
              Update password
            </Button>
          </form>
          <Link to="/auth" className="mt-4 inline-block text-sm text-muted-foreground">
            Back to sign in
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
