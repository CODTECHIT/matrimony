import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle, UserX } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/common/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { adminService } from "@/services";

export const Route = createFileRoute("/admin/matrimony/reports")({
  head: () => ({
    meta: [
      { title: "Reports & Moderation — YFJ Matrimony Admin" },
      {
        name: "description",
        content: "Review member reports and resolve safety issues on YFJ Matrimony.",
      },
      { property: "og:title", content: "Reports & Moderation — YFJ Matrimony Admin" },
      { property: "og:description", content: "Moderation queue for member reports." },
    ],
  }),
  component: AdminReportsPage,
});

function AdminReportsPage() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<"all" | "open" | "resolved">("all");

  const query = useQuery({
    queryKey: ["admin", "reports"],
    queryFn: () => adminService.reports(),
  });

  const resolve = async (id: string) => {
    try {
      await adminService.resolveReport(id);
      await queryClient.invalidateQueries({ queryKey: ["admin", "reports"] });
      toast.success("Report marked as resolved");
    } catch {
      toast.error("Failed to resolve report");
    }
  };

  const blockAndResolve = async (id: string, reportedUser: string) => {
    if (!window.confirm(`Block ${reportedUser} and mark this report as resolved?`)) return;
    try {
      await adminService.blockAndResolveReport(id, reportedUser);
      await queryClient.invalidateQueries({ queryKey: ["admin", "reports"] });
      await queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      toast.success(`User ${reportedUser} blocked and report resolved`);
    } catch {
      toast.error("Failed to process action");
    }
  };

  const filteredReports = query.data?.filter((r) => {
    if (filter === "all") return true;
    if (filter === "open") return r.status !== "resolved";
    return r.status === "resolved";
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Admin"
        title="Reported Profiles"
        description="Member safety reports, fake profile alerts, and abusive conduct moderation."
      />

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b border-border pb-3">
        {(["all", "open", "resolved"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setFilter(tab)}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold capitalize transition-colors ${
              filter === tab
                ? "bg-primary text-primary-foreground"
                : "bg-muted/70 text-muted-foreground hover:bg-muted"
            }`}
          >
            {tab === "all" ? "All Reports" : tab}
          </button>
        ))}
      </div>

      {query.isPending ? (
        <ListSkeleton />
      ) : query.isError ? (
        <ErrorState onRetry={() => void query.refetch()} />
      ) : filteredReports?.length === 0 ? (
        <EmptyState
          title="No reports in this view"
          description="The moderation queue is completely clear."
        />
      ) : (
        <ul className="space-y-3">
          {filteredReports?.map((report) => (
            <li
              key={report.id}
              className="grid gap-3 rounded-3xl border border-border bg-card p-5 shadow-card sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-foreground text-base">
                    {report.reportedUser}
                  </span>
                  <Badge
                    variant={
                      report.status === "resolved"
                        ? "default"
                        : report.status === "reviewing"
                          ? "secondary"
                          : "destructive"
                    }
                    className="capitalize text-xs"
                  >
                    {report.status}
                  </Badge>
                </div>
                <p className="mt-2 text-sm text-foreground/90 bg-muted/40 p-2.5 rounded-xl border border-border/50">
                  <span className="font-semibold text-xs text-muted-foreground uppercase tracking-wider block mb-0.5">
                    Reason:
                  </span>
                  {report.reason}
                </p>
                <p className="mt-2 text-xs text-muted-foreground flex items-center gap-1.5">
                  <AlertTriangle className="size-3.5 text-amber-500 shrink-0" />
                  Reported by{" "}
                  <span className="font-medium text-foreground">{report.reportedBy}</span> on{" "}
                  {new Date(report.createdAt).toLocaleDateString("en-IN", { dateStyle: "medium" })}
                </p>
              </div>

              <div className="flex sm:flex-col gap-2 justify-end sm:items-end">
                {report.status !== "resolved" ? (
                  <>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => blockAndResolve(report.id, report.reportedUser)}
                      className="gap-1 text-xs"
                    >
                      <UserX className="size-3.5" /> Block & Resolve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => resolve(report.id)}
                      className="gap-1 text-xs"
                    >
                      <CheckCircle className="size-3.5" /> Mark Resolved
                    </Button>
                  </>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground font-medium bg-muted/60 px-3 py-1 rounded-full">
                    <CheckCircle className="size-3.5 text-emerald-600" /> Resolved
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
