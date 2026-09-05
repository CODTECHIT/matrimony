import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/admin")({
  beforeLoad: ({ location }) => {
    const path = location.pathname.replace(/\/+$/, "");
    if (path === "/admin") {
      throw redirect({
        to: "/admin/matrimony",
      });
    }
  },
  component: () => <Outlet />,
});
