import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { OrgProvider } from "@/hooks/useOrg";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { RequireOrg } from "@/components/layout/RequireOrg";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { LandingPage } from "@/pages/Landing";
import { AuthPage } from "@/pages/Auth";
import { ResetPasswordPage } from "@/pages/ResetPassword";
import { InvitePage } from "@/pages/Invite";
import { OnboardingPage } from "@/pages/Onboarding";
import { DashboardOverviewPage } from "@/pages/dashboard/Overview";
import { ClientsPage } from "@/pages/dashboard/Clients";
import { ReportsPage } from "@/pages/dashboard/Reports";
import { TeamPage } from "@/pages/dashboard/Team";
import { SettingsPage } from "@/pages/dashboard/Settings";

function AuthRedirect() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        Loading session…
      </div>
    );
  }
  if (user) return <Navigate to="/dashboard" replace />;
  return <AuthPage />;
}

export default function App() {
  return (
    <AuthProvider>
      <OrgProvider>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/auth" element={<AuthRedirect />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/invite/:token" element={<InvitePage />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/onboarding" element={<OnboardingPage />} />
            <Route element={<RequireOrg />}>
              <Route path="/dashboard" element={<DashboardShell />}>
                <Route index element={<DashboardOverviewPage />} />
                <Route path="clients" element={<ClientsPage />} />
                <Route path="reports" element={<ReportsPage />} />
                <Route path="team" element={<TeamPage />} />
                <Route path="settings" element={<SettingsPage />} />
              </Route>
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </OrgProvider>
    </AuthProvider>
  );
}
