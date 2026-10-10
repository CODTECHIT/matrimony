import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Heart,
  HeartHandshake,
  MessageCircle,
  RefreshCw,
  Sparkles,
  Star,
  Users,
  XCircle,
} from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/common/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { adminService } from "@/services";

export const Route = createFileRoute("/admin/matrimony/matches")({
  head: () => ({
    meta: [
      { title: "Match & Interest Oversight — YFJ Matrimony Admin" },
      {
        name: "description",
        content: "Platform matchmaking health, interest acceptance rates, and match activity.",
      },
    ],
  }),
  component: AdminMatchesPage,
});

function AdminMatchesPage() {
  const query = useQuery({
    queryKey: ["admin", "matches", "overview"],
    queryFn: () => adminService.matchesOverview(),
  });

  if (query.isPending) return <ListSkeleton />;
  if (query.isError || !query.data) return <ErrorState onRetry={() => void query.refetch()} />;

  const { metrics, recentActivity } = query.data;

  const cards = [
    {
      label: "Total Interests Expressed",
      value: metrics.totalInterests.toLocaleString("en-IN"),
      icon: Heart,
      color: "text-rose-600 bg-rose-500/10",
    },
    {
      label: "Accepted (Mutual Interest)",
      value: metrics.acceptedInterests.toLocaleString("en-IN"),
      icon: HeartHandshake,
      color: "text-emerald-600 bg-emerald-500/10",
    },
    {
      label: "Interest Acceptance Rate",
      value: `${metrics.acceptanceRate}%`,
      icon: Sparkles,
      color: "text-amber-600 bg-amber-500/10",
    },
    {
      label: "Declined Interests",
      value: metrics.declinedInterests.toLocaleString("en-IN"),
      icon: XCircle,
      color: "text-stone-500 bg-stone-500/10",
    },
    {
      label: "Shortlisted Profiles",
      value: metrics.totalShortlists.toLocaleString("en-IN"),
      icon: Star,
      color: "text-indigo-600 bg-indigo-500/10",
    },
    {
      label: "Active Chat Threads",
      value: metrics.totalConversations.toLocaleString("en-IN"),
      icon: MessageCircle,
      color: "text-sky-600 bg-sky-500/10",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Matchmaking Operations"
        title="Match & Interest Oversight"
        description="Monitor member matchmaking engagement, interest acceptance ratios, and real-time interaction flows."
        actions={
          <Button
            size="sm"
            variant="outline"
            onClick={() => void query.refetch()}
            className="gap-1.5"
          >
            <RefreshCw className="size-3.5" /> Refresh
          </Button>
        }
      />

      {/* KPI Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map(({ label, value, icon: Icon, color }) => (
          <article
            key={label}
            className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 rounded-3xl border border-border bg-card p-5 shadow-card transition-all hover:border-primary/40"
          >
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-muted-foreground">{label}</p>
              <p className="mt-1 font-display text-2xl font-bold">{value}</p>
            </div>
            <span className={`grid size-11 shrink-0 place-items-center rounded-2xl ${color}`}>
              <Icon className="size-5" />
            </span>
          </article>
        ))}
      </div>

      {/* Recent Activity Table */}
      <div className="space-y-3">
        <h2 className="font-display text-lg font-bold text-foreground">
          Recent Interest Activity Stream
        </h2>

        {recentActivity.length === 0 ? (
          <EmptyState
            title="No matching activity recorded yet"
            description="Member interest requests will appear chronologically here."
          />
        ) : (
          <div className="overflow-x-auto rounded-3xl border border-border bg-card shadow-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sender Member</TableHead>
                  <TableHead className="w-12 text-center"></TableHead>
                  <TableHead>Recipient Member</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Timestamp</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentActivity.map((activity) => (
                  <TableRow key={activity.id}>
                    <TableCell className="font-medium">
                      <div>
                        <p className="font-semibold text-sm text-foreground">
                          {activity.sender_name}
                        </p>
                        <p className="text-xs text-muted-foreground font-mono">
                          {activity.sender_display_id || "Member"} • {activity.sender_gender}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="text-center text-muted-foreground">
                      <ArrowRight className="size-4 inline text-primary/70" />
                    </TableCell>
                    <TableCell className="font-medium">
                      <div>
                        <p className="font-semibold text-sm text-foreground">
                          {activity.receiver_name}
                        </p>
                        <p className="text-xs text-muted-foreground font-mono">
                          {activity.receiver_display_id || "Member"} • {activity.receiver_gender}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          activity.status === "accepted"
                            ? "default"
                            : activity.status === "declined"
                              ? "destructive"
                              : "secondary"
                        }
                        className="capitalize text-xs"
                      >
                        {activity.status === "accepted" && "Accepted (Matched)"}
                        {activity.status === "declined" && "Declined"}
                        {activity.status === "pending" && "Pending"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground font-mono">
                      {new Date(activity.created_at).toLocaleString("en-IN", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
