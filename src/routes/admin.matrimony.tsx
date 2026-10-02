import { useEffect } from "react";
import {
  createFileRoute,
  Outlet,
  useNavigate,
  useRouterState,
  redirect,
} from "@tanstack/react-router";
import { AdminShell } from "@/components/layout/AdminShell";
import { LoadingState } from "@/components/common/states";
import { useAdminAuth } from "@/hooks/useAuth";
import { tokenStore } from "@/lib/api-client";

export const Route = createFileRoute("/admin/matrimony")({
  beforeLoad: ({ location }) => {
    if (typeof window !== "undefined") {
      const isLogin = location.pathname.startsWith("/admin/matrimony/login");
      if (!isLogin) {
        const token = tokenStore.getAdminToken();
        if (!token) {
          throw redirect({
            to: "/admin/matrimony/login",
          });
        }
      }
    }
  },
  component: AdminMatrimonyLayout,
});

function AdminMatrimonyLayout() {
  const { status, user } = useAdminAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isLoginPage = pathname.startsWith("/admin/matrimony/login");

  useEffect(() => {
    if (isLoginPage) return;
    if (status === "unauthenticated" || (status === "authenticated" && user?.role !== "admin")) {
      void navigate({ to: "/admin/matrimony/login" });
    }
  }, [isLoginPage, status, user, navigate]);

  // Login page renders without the admin shell
  if (isLoginPage) {
    return <Outlet />;
  }

  // Gatekeeper: only active admins can enter the admin console
  if (status !== "authenticated" || user?.role !== "admin") {
    return <LoadingState label="Verifying administrative access…" />;
  }

  return (
    <AdminShell>
      <Outlet />
    </AdminShell>
  );
}
