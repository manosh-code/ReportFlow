import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  BarChart3,
  Building2,
  ChevronDown,
  FileText,
  LogOut,
  Settings,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useOrg } from "@/hooks/useOrg";
import { cn } from "@/lib/utils";
import { useState } from "react";

const links = [
  { to: "/dashboard", label: "Overview", icon: BarChart3, end: true },
  { to: "/dashboard/clients", label: "Clients", icon: Building2, end: false },
  { to: "/dashboard/reports", label: "Reports", icon: FileText, end: false },
  { to: "/dashboard/team", label: "Team", icon: Users, end: false },
  { to: "/dashboard/settings", label: "Settings", icon: Settings, end: false },
] as const;

export function DashboardShell() {
  const { user, signOut } = useAuth();
  const { memberships, current, switchOrg } = useOrg();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="flex w-64 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
        <div className="px-5 py-6">
          <p className="font-display text-2xl text-paper">ReportFlow</p>
          <p className="mt-1 text-xs text-muted-foreground">Agency workspace</p>
        </div>

        <div className="relative px-3">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="flex w-full items-center justify-between rounded-md border border-sidebar-border bg-muted/40 px-3 py-2 text-left text-sm"
          >
            <span className="truncate">
              {current?.organization.name ?? "Select org"}
            </span>
            <ChevronDown className="size-4 opacity-70" />
          </button>
          {open ? (
            <div className="absolute z-20 mt-1 w-[calc(100%-1.5rem)] overflow-hidden rounded-md border border-border bg-card shadow-lg">
              {memberships.map((m) => (
                <button
                  key={m.organization.id}
                  type="button"
                  className={cn(
                    "block w-full px-3 py-2 text-left text-sm hover:bg-muted",
                    m.organization.id === current?.organization.id && "bg-muted",
                  )}
                  onClick={() => {
                    switchOrg(m.organization.id);
                    setOpen(false);
                  }}
                >
                  <span className="block truncate">{m.organization.name}</span>
                  <span className="text-xs text-muted-foreground">{m.role}</span>
                </button>
              ))}
              <button
                type="button"
                className="block w-full border-t border-border px-3 py-2 text-left text-sm text-primary hover:bg-muted"
                onClick={() => {
                  setOpen(false);
                  navigate("/onboarding");
                }}
              >
                Create organization
              </button>
            </div>
          ) : null}
        </div>

        <nav className="mt-6 flex flex-1 flex-col gap-1 px-3">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-2 rounded-md px-3 py-2 text-sm",
                  isActive
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                )
              }
            >
              <link.icon className="size-4" />
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-sidebar-border p-4">
          <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
          <Button
            variant="ghost"
            size="sm"
            className="mt-2 w-full justify-start"
            onClick={() => signOut().then(() => navigate("/"))}
          >
            <LogOut className="size-4" />
            Sign out
          </Button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
