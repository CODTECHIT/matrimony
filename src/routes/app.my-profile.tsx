import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/app/my-profile")({
  component: () => <Outlet />,
});
