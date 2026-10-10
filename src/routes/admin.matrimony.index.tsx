import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  BadgeCheck,
  CreditCard,
  Flag,
  HeartHandshake,
  IndianRupee,
  LifeBuoy,
  Shield,
  ShieldAlert,
  UserPlus,
  Users,
} from "lucide-react";
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
      label: "Verified profiles",
      value: (stats.verifiedProfiles ?? 0).toLocaleString("en-IN"),
      icon: BadgeCheck,
      color: "text-emerald-600 bg-emerald-500/10",
    },
    {
      label: "Pending ID verifications",
      value: (stats.pendingVerifications ?? 0).toLocaleString("en-IN"),
      icon: Shield,
      color: "text-amber-600 bg-amber-500/10",
    },
    {
      label: "Active subscriptions",
      value: stats.activeSubscriptions.toLocaleString("en-IN"),
      icon: CreditCard,
    },
    { label: "Revenue (30 days)", value: formatInr(stats.revenueInr), icon: IndianRupee },
    {
      label: "Mutual Matches",
      value: (stats.totalMatches ?? 0).toLocaleString("en-IN"),
      icon: HeartHandshake,
      color: "text-pink-600 bg-pink-500/10",
    },
    {
      label: "Open Help Desk Tickets",
      value: (stats.openTickets ?? 0).toLocaleString("en-IN"),
      icon: LifeBuoy,
      color: "text-sky-600 bg-sky-500/10",
    },
    {
      label: "Open Abuse Reports",
      value: (stats.openReports ?? 0).toLocaleString("en-IN"),
      icon: Flag,
      color: "text-rose-600 bg-rose-500/10",
    },
  ];

  const maxRevenue = Math.max(...stats.revenueSeries.map((point) => point.revenue), 1);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Admin Console"
        title="Operations Dashboard"
        description="Platform health, member verification queues, support tickets, and moderation overview."
      />

      {/* Metrics Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ label, value, icon: Icon, color }) => (
          <article
            key={label}
            className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 rounded-3xl border border-border bg-card p-5 shadow-card transition-all hover:border-primary/40"
          >
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-muted-foreground">{label}</p>
              <p className="mt-1 font-display text-2xl font-bold">{value}</p>
            </div>
            <span
              className={`grid size-11 shrink-0 place-items-center rounded-2xl ${
                color || "bg-primary-soft text-primary"
              }`}
            >
              <Icon className="size-5" />
            </span>
          </article>
        ))}
      </div>

      {/* Quick Action Navigation */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <a
          href="/admin/matrimony/verification"
          className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-card hover:bg-muted/50 transition-colors"
        >
          <div className="grid size-10 place-items-center rounded-xl bg-amber-500/10 text-amber-600">
            <Shield className="size-5" />
          </div>
          <div>
            <p className="font-semibold text-sm text-foreground">Review Verifications</p>
            <p className="text-xs text-muted-foreground">
              {stats.pendingVerifications ?? 0} docs awaiting check
            </p>
          </div>
        </a>

        <a
          href="/admin/matrimony/tickets"
          className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-card hover:bg-muted/50 transition-colors"
        >
          <div className="grid size-10 place-items-center rounded-xl bg-sky-500/10 text-sky-600">
            <LifeBuoy className="size-5" />
          </div>
          <div>
            <p className="font-semibold text-sm text-foreground">Support Help Desk</p>
            <p className="text-xs text-muted-foreground">
              {stats.openTickets ?? 0} open member inquiries
            </p>
          </div>
        </a>

        <a
          href="/admin/matrimony/matches"
          className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-card hover:bg-muted/50 transition-colors"
        >
          <div className="grid size-10 place-items-center rounded-xl bg-pink-500/10 text-pink-600">
            <HeartHandshake className="size-5" />
          </div>
          <div>
            <p className="font-semibold text-sm text-foreground">Match Oversight</p>
            <p className="text-xs text-muted-foreground">
              {stats.totalMatches ?? 0} mutual matches
            </p>
          </div>
        </a>

        <a
          href="/admin/matrimony/reports"
          className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-card hover:bg-muted/50 transition-colors"
        >
          <div className="grid size-10 place-items-center rounded-xl bg-rose-500/10 text-rose-600">
            <Flag className="size-5" />
          </div>
          <div>
            <p className="font-semibold text-sm text-foreground">Moderation Queue</p>
            <p className="text-xs text-muted-foreground">
              {stats.openReports ?? 0} abuse reports pending
            </p>
          </div>
        </a>
      </div>

      <section className="rounded-3xl border border-border bg-card p-5 shadow-card">
        <h2 className="font-display text-xl font-semibold">Revenue Trend</h2>
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
