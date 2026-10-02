import { useEffect } from "react";
import { createFileRoute, Link, Outlet, useNavigate, redirect } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { LoadingState } from "@/components/common/states";
import { useAuth } from "@/hooks/useAuth";
import { tokenStore } from "@/lib/api-client";
import { ShieldCheck, Clock, Ban } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/app")({
  beforeLoad: ({ location }) => {
    if (typeof window !== "undefined") {
      const token = tokenStore.getUserToken();
      if (!token) {
        throw redirect({
          to: "/login",
          search: {
            redirect: location.href,
          },
        });
      }
    }
  },
  component: AppLayout,
});

/**
 * Client-side route gate. This is UX only — the backend must enforce every
 * authorization and subscription rule on its own endpoints.
 */
function AppLayout() {
  const { status, user, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (status === "unauthenticated" || (status === "authenticated" && user?.role === "admin")) {
      void navigate({ to: "/login" });
    }
  }, [status, user, navigate]);

  if (status !== "authenticated" || !user || user.role === "admin") {
    return <LoadingState label="Checking your session…" />;
  }

  // FIX 2: Block unapproved users from accessing the app
  if (user?.profileStatus === "pending") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="max-w-md w-full text-center space-y-5">
          <span className="mx-auto flex size-20 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-950/40">
            <Clock className="size-10 text-amber-500" />
          </span>
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">
              Profile Under Review
            </h1>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              Your profile has been submitted and is waiting for admin approval. You will get full
              access once an administrator reviews and approves your account.
            </p>
          </div>
          <div className="rounded-2xl border border-amber-200 bg-amber-50/70 dark:bg-amber-950/20 p-4 text-sm text-amber-900 dark:text-amber-200 text-left space-y-2">
            <p className="flex items-center gap-2 font-semibold">
              <ShieldCheck className="size-4 text-amber-600" /> What happens next?
            </p>
            <ul className="text-xs space-y-1 text-muted-foreground list-disc list-inside">
              <li>Admin reviews your profile details</li>
              <li>Once approved, you can browse and connect with matches</li>
              <li>You will be notified when your account is activated</li>
            </ul>
          </div>
          <Button variant="outline" className="w-full" onClick={() => void signOut()}>
            Sign out
          </Button>
        </div>
      </div>
    );
  }

  // FIX 2: Block suspended/blocked accounts
  if (user?.profileStatus === "blocked") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="max-w-md w-full text-center space-y-5">
          <span className="mx-auto flex size-20 items-center justify-center rounded-full bg-destructive/10">
            <Ban className="size-10 text-destructive" />
          </span>
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">Account Suspended</h1>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              Your account has been suspended by the administrator. Please contact support for
              assistance.
            </p>
          </div>
          <Button variant="outline" className="w-full" onClick={() => void signOut()}>
            Sign out
          </Button>
          <Button asChild variant="neutral" size="sm">
            <Link to="/contact">Contact Support</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
