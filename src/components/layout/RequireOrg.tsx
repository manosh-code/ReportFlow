import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useOrg } from "@/hooks/useOrg";

export function RequireOrg() {
  const { user } = useAuth();
  const { memberships, loading } = useOrg();

  if (!user) return <Navigate to="/auth" replace />;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        Loading workspace…
      </div>
    );
  }

  if (memberships.length === 0) {
    return <Navigate to="/onboarding" replace />;
  }

  return <Outlet />;
}
