import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Seo } from "@/components/seo/Seo";
import { useAuth } from "@/hooks/useAuth";
import { useOrg } from "@/hooks/useOrg";
import { supabase } from "@/integrations/supabase/client";

type Preview = {
  organization_name: string;
  email: string;
  role: string;
  expired: boolean;
  accepted: boolean;
};

export function InvitePage() {
  const { token } = useParams();
  const { user } = useAuth();
  const { refresh } = useOrg();
  const navigate = useNavigate();
  const [preview, setPreview] = useState<Preview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!token) return;
    supabase
      .rpc("get_invite_preview", { _token: token })
      .then(({ data, error: rpcError }) => {
        if (rpcError) {
          setError(rpcError.message);
          return;
        }
        const row = Array.isArray(data) ? data[0] : data;
        if (!row) setError("This invite link is invalid.");
        else setPreview(row as Preview);
      });
  }, [token]);

  async function accept() {
    if (!token) return;
    setBusy(true);
    try {
      const { error: rpcError } = await supabase.rpc("accept_invite", { _token: token });
      if (rpcError) throw rpcError;
      await refresh();
      toast.success("You joined the organization.");
      navigate("/dashboard", { replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not accept invite");
    } finally {
      setBusy(false);
    }
  }

  const authHref = `/auth?mode=signup&next=${encodeURIComponent(`/invite/${token}`)}&email=${encodeURIComponent(preview?.email ?? "")}`;
  const signedInMismatch =
    Boolean(user && preview) &&
    user!.email?.toLowerCase() !== preview!.email.toLowerCase();

  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <Seo
        title="Join an agency on ReportFlow"
        description="Accept an invitation to an agency workspace."
        path={`/invite/${token ?? ""}`}
      />
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Agency invite</CardTitle>
          <CardDescription>
            {preview
              ? `Join ${preview.organization_name} as ${preview.role}.`
              : error ?? "Looking up this invite…"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {preview?.expired ? (
            <p className="text-sm text-destructive">This invite has expired.</p>
          ) : null}
          {preview?.accepted ? (
            <p className="text-sm text-muted-foreground">This invite was already accepted.</p>
          ) : null}
          {signedInMismatch ? (
            <p className="text-sm text-destructive">
              This invite is for {preview?.email}. Sign out and continue with that address.
            </p>
          ) : null}
          {preview && !preview.expired && !preview.accepted && !signedInMismatch ? (
            user ? (
              <Button className="w-full" disabled={busy} onClick={accept}>
                Join {preview.organization_name}
              </Button>
            ) : (
              <Button className="w-full" asChild>
                <Link to={authHref}>Sign in to accept</Link>
              </Button>
            )
          ) : null}
          <p className="text-xs text-muted-foreground">
            Invites must be accepted with {preview?.email ?? "the invited email"}.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
