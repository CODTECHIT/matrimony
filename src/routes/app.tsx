import { useEffect } from "react";
import { createFileRoute, Outlet, useNavigate, redirect } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { LoadingState } from "@/components/common/states";
import { useAuth } from "@/hooks/useAuth";
import { tokenStore } from "@/lib/api-client";

export const Route = createFileRoute("/app")({
  beforeLoad: ({ location }) => {
    if (typeof window !== "undefined") {
      const token = tokenStore.get();
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
