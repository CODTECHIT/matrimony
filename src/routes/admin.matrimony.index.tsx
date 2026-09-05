import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CreditCard, IndianRupee, ShieldAlert, UserPlus, Users } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { ErrorState, LoadingState } from "@/components/common/states";
import { formatInr } from "@/components/pricing/PlanCard";
import { adminService } from "@/services";

export const Route = createFileRoute("/admin/matrimony/")({
  head: () => ({
    meta: [
      { title: "Admin Dashboard — YFJ Matrimony" },
      {
        name: "description",
        content: "Operations dashboard for members, subscriptions, revenue and moderation queues.",
      },
      { property: "og:title", content: "Admin Dashboard — YFJ Matrimony" },
      { property: "og:description", content: "Members, revenue and moderation at a glance." },
    ],
  }),
  component: AdminDashboard,
});

function AdminDashboard() {
  const query = useQuery({ queryKey: ["admin", "stats"], queryFn: () => adminService.stats() });

  if (query.isPending) return <LoadingState label="Loading dashboard" />;
  if (query.isError || !query.data) return <ErrorState onRetry={() => void query.refetch()} />;

  const stats = query.data;
  const cards = [
    { label: "Total members", value: stats.totalUsers.toLocaleString("en-IN"), icon: Users },
    { label: "Active members", value: stats.activeUsers.toLocaleString("en-IN"), icon: Users },
    {
      label: "Active subscriptions",
      value: stats.activeSubscriptions.toLocaleString("en-IN"),
      icon: CreditCard,
    },
    { label: "Revenue (30 days)", value: formatInr(stats.revenueInr), icon: IndianRupee },
    {
      label: "New registrations",
      value: stats.newRegistrations.toLocaleString("en-IN"),
      icon: UserPlus,
    },
    {
      label: "Pending approvals",
      value: stats.pendingApprovals.toLocaleString("en-IN"),
      icon: ShieldAlert,
    },
  ];

  const maxRevenue = Math.max(...stats.revenueSeries.map((point) => point.revenue), 1);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Admin"
        title="Dashboard"
        description="Platform health and operations at a glance."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map(({ label, value, icon: Icon }) => (
          <article
            key={label}
            className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 rounded-3xl border border-border bg-card p-5 shadow-card"
          >
            <div className="min-w-0">
              <p className="truncate text-sm text-muted-foreground">{label}</p>
              <p className="mt-1 font-display text-2xl font-semibold">{value}</p>
            </div>
            <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary-soft text-primary">
              <Icon className="size-5" />
            </span>
          </article>
        ))}
      </div>

      <section className="rounded-3xl border border-border bg-card p-5 shadow-card">
        <h2 className="font-display text-xl font-semibold">Revenue trend</h2>
        <div
          className="mt-6 flex h-48 items-end gap-3"
          role="img"
          aria-label="Monthly revenue trend"
        >
          {stats.revenueSeries.map((point) => (
            <div key={point.month} className="flex flex-1 flex-col items-center gap-2">
              <div
                className="w-full rounded-t-xl bg-primary/80"
                style={{ height: `${(point.revenue / maxRevenue) * 100}%` }}
                title={`${point.month}: ${formatInr(point.revenue)}`}
              />
              <span className="text-xs text-muted-foreground">{point.month}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
