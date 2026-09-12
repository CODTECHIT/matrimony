import { createFileRoute } from "@tanstack/react-router";
import { DashboardContent } from "@/components/dashboard/DashboardContent";

export const Route = createFileRoute("/app/")({
  head: () => ({
    meta: [
      { title: "Find your perfect match — YFJ Matrimony" },
      {
        name: "description",
        content:
          "Your personalised matrimony dashboard: recommended profiles, interests and messages.",
      },
      { property: "og:title", content: "Your matches — YFJ Matrimony" },
      { property: "og:description", content: "Recommended profiles picked for you today." },
    ],
  }),
  component: DashboardContent,
});
