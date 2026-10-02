import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/admin")({
  beforeLoad: ({ location }) => {
    const path = location.pathname.replace(/\/+$/, "");
    if (path === "/admin" || path === "") {
      throw redirect({
        to: "/admin/matrimony",
      });
    }
    if (path === "/admin/login") {
      throw redirect({
        to: "/admin/matrimony/login",
      });
    }
  },
  component: () => <Outlet />,
});
