import { useEffect } from "react";
import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { LoadingState } from "@/components/common/states";
import { useAuth } from "@/hooks/useAuth";
import { env } from "@/lib/env";

export const Route = createFileRoute("/app")({
  component: AppLayout,
});

/**
 * Client-side route gate. This is UX only — the backend must enforce every
 * authorization and subscription rule on its own endpoints.
 */
function AppLayout() {
  const { status } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (status === "unauthenticated") {
      void navigate({ to: "/login" });
    }
  }, [status, navigate]);

  if (status !== "authenticated") {
    return <LoadingState label="Checking your session…" />;
  }

  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
