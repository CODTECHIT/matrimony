import type { ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  CreditCard,
  Flag,
  LayoutDashboard,
  LogOut,
  Package,
  ShieldCheck,
  Users,
  Wallet,
} from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { useAuth } from "@/hooks/useAuth";

const nav = [
  { to: "/admin/matrimony", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/admin/matrimony/users", label: "Users", icon: Users, exact: false },
  { to: "/admin/matrimony/subscriptions", label: "Subscriptions", icon: CreditCard, exact: false },
  { to: "/admin/matrimony/packages", label: "Packages", icon: Package, exact: false },
  { to: "/admin/matrimony/payments", label: "Payments", icon: Wallet, exact: false },
  { to: "/admin/matrimony/reports", label: "Reported profiles", icon: Flag, exact: false },
] as const;

export function AdminShell({ children }: { children: ReactNode }) {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    void navigate({ to: "/admin/matrimony/login" });
  };

  return (
    <div className="min-h-screen bg-surface">
      <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Logo linkTo="/admin/matrimony" />
            <span className="hidden items-center gap-1.5 rounded-full bg-primary-soft px-3 py-1 text-xs font-semibold text-primary sm:inline-flex">
              <ShieldCheck className="size-3.5" /> Admin console
            </span>
          </div>

          <div className="flex items-center gap-4">
            <Link
              to="/app"
              className="text-xs sm:text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
            >
              Member view
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-xs sm:text-sm font-medium text-destructive hover:opacity-80 transition-opacity cursor-pointer"
            >
              <LogOut className="size-3.5" />
              <span>Sign out</span>
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl gap-8 px-4 py-6 sm:px-6">
        <aside className="hidden w-56 shrink-0 md:block">
          <nav className="sticky top-24 space-y-1" aria-label="Admin">
            {nav.map(({ to, label, icon: Icon, exact }) => (
              <Link
                key={to}
                to={to}
                activeOptions={{ exact }}
                activeProps={{ className: "bg-primary-soft text-primary" }}
                inactiveProps={{ className: "text-muted-foreground hover:bg-muted" }}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors"
              >
                <Icon className="size-4 shrink-0" />
                <span className="truncate">{label}</span>
              </Link>
            ))}
          </nav>
        </aside>
        <main className="min-w-0 flex-1 pb-10">
          <div className="mb-4 -mx-4 flex gap-2 overflow-x-auto px-4 no-scrollbar md:hidden">
            {nav.map(({ to, label, exact }) => (
              <Link
                key={to}
                to={to}
                activeOptions={{ exact }}
                activeProps={{ className: "bg-primary text-primary-foreground" }}
                inactiveProps={{ className: "bg-card text-muted-foreground" }}
                className="shrink-0 rounded-full border border-border px-3 py-1.5 text-xs font-semibold"
              >
                {label}
              </Link>
            ))}
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}
