import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  BarChart3,
  Building2,
  ChevronDown,
  FileText,
  LogOut,
  Menu,
  Settings,
  Users,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useOrg } from "@/hooks/useOrg";
import { cn } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";

const links = [
  { to: "/dashboard", label: "Overview", icon: BarChart3, end: true },
  { to: "/dashboard/clients", label: "Clients", icon: Building2, end: false },
  { to: "/dashboard/reports", label: "Reports", icon: FileText, end: false },
  { to: "/dashboard/team", label: "Team", icon: Users, end: false },
  { to: "/dashboard/settings", label: "Settings", icon: Settings, end: false },
] as const;

function OrgSwitcher({ onPicked }: { onPicked?: () => void }) {
  const { memberships, current, switchOrg } = useOrg();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const switcherRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onPointer(event: MouseEvent) {
      if (!switcherRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointer);
    return () => document.removeEventListener("mousedown", onPointer);
  }, []);

  return (
    <div className="relative px-3" ref={switcherRef}>
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
                onPicked?.();
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
              onPicked?.();
              navigate("/onboarding");
            }}
          >
            Create organization
          </button>
        </div>
      ) : null}
    </div>
  );
}

function SidebarBody({ onNavigate }: { onNavigate?: () => void }) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <>
      <div className="px-5 py-6">
        <p className="font-display text-2xl text-paper">ReportFlow</p>
        <p className="mt-1 text-xs text-muted-foreground">Agency workspace</p>
      </div>
      <OrgSwitcher onPicked={onNavigate} />
      <nav className="mt-6 flex flex-1 flex-col gap-1 px-3">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            onClick={() => onNavigate?.()}
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
    </>
  );
}

export function DashboardShell() {
  const { current } = useOrg();
  const [mobileNav, setMobileNav] = useState(false);

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-64 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex">
        <SidebarBody />
      </aside>

      {mobileNav ? (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            className="absolute inset-0 bg-background/70"
            onClick={() => setMobileNav(false)}
          />
          <aside className="relative z-50 flex h-full w-64 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
            <button
              type="button"
              className="absolute right-3 top-4 z-10 text-muted-foreground"
              onClick={() => setMobileNav(false)}
              aria-label="Close menu"
            >
              <X className="size-5" />
            </button>
            <SidebarBody onNavigate={() => setMobileNav(false)} />
          </aside>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center justify-between border-b border-border px-4 py-3 md:hidden">
          <p className="truncate font-display text-xl text-paper">
            {current?.organization.name ?? "ReportFlow"}
          </p>
          <Button
            variant="outline"
            size="icon"
            type="button"
            aria-label="Open menu"
            onClick={() => setMobileNav(true)}
          >
            <Menu className="size-4" />
          </Button>
        </div>
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
