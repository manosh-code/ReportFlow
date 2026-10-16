import { FormEvent, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Seo } from "@/components/seo/Seo";
import { useAuth } from "@/hooks/useAuth";
import { safeAppPath } from "@/lib/utils";

export function AuthPage() {
  const { signIn, signUp, signInWithGoogle, resetPassword, configured } =
    useAuth();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const next = safeAppPath(params.get("next"));
  const invitedEmail = params.get("email") ?? "";
  const [mode, setMode] = useState<"signin" | "signup">(
    params.get("mode") === "signup" ? "signup" : "signin",
  );
  const [email, setEmail] = useState(invitedEmail);
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);
  const [forgot, setForgot] = useState(false);

  const heading = useMemo(() => {
    if (forgot) return "Reset password";
    return mode === "signup" ? "Create account" : "Sign in";
  }, [forgot, mode]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      if (!configured) {
        throw new Error("Connect Lovable Cloud env vars before signing in.");
      }
      if (forgot) {
        await resetPassword(email);
        toast.success("Password reset email sent.");
        setForgot(false);
        return;
      }
      if (mode === "signup") {
        const message = await signUp(email, password, fullName);
        if (message) toast.message(message);
        else navigate(next, { replace: true });
      } else {
        await signIn(email, password);
        navigate(next, { replace: true });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Seo
        title={mode === "signup" ? "Create your ReportFlow account" : "Sign in to ReportFlow"}
        description="Sign in or create an agency workspace on ReportFlow."
        path="/auth"
      />
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-16">
        <Link to="/" className="mb-8 font-display text-3xl text-paper">
          ReportFlow
        </Link>
        <Card>
          <CardHeader>
            <CardTitle>{heading}</CardTitle>
            <CardDescription>
              {forgot
                ? "We will email a reset link that opens on this app."
                : "Email and password, or continue with Google (enable the Google provider in Lovable Cloud → Users)."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={onSubmit}>
              {mode === "signup" && !forgot ? (
                <div className="space-y-2">
                  <Label htmlFor="name">Full name</Label>
                  <Input
                    id="name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    autoComplete="name"
                    required
                  />
                </div>
              ) : null}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              {!forgot ? (
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete={mode === "signup" ? "new-password" : "current-password"}
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              ) : null}
              <Button className="w-full" disabled={busy} type="submit">
                {forgot
                  ? "Send reset link"
                  : mode === "signup"
                    ? "Create account"
                    : "Sign in"}
              </Button>
            </form>
            {!forgot ? (
              <>
                <Button
                  className="mt-3 w-full"
                  variant="outline"
                  type="button"
                  onClick={() =>
                    signInWithGoogle().catch((err: unknown) =>
                      toast.error(
                        err instanceof Error
                          ? err.message
                          : "Enable Google under Lovable Cloud → Users, then retry.",
                      ),
                    )
                  }
                >
                  Continue with Google
                </Button>
                <div className="mt-4 flex justify-between text-sm text-muted-foreground">
                  <button type="button" onClick={() => setForgot(true)}>
                    Forgot password?
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode(mode === "signup" ? "signin" : "signup")}
                  >
                    {mode === "signup" ? "Have an account? Sign in" : "Need an account? Sign up"}
                  </button>
                </div>
              </>
            ) : (
              <button
                type="button"
                className="mt-4 text-sm text-muted-foreground"
                onClick={() => setForgot(false)}
              >
                Back to sign in
              </button>
            )}
            {!configured ? (
              <p className="mt-4 text-xs text-primary">
                Cloud keys are missing. Copy `.env.example` to `.env.local` with your
                Lovable Cloud URL and anon key.
              </p>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
