import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  AlertTriangle,
  CheckCircle,
  MessageSquareWarning,
  UserX,
  VolumeX,
} from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/common/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { adminService } from "@/services";
import type { ReportRow } from "@/types";

export const Route = createFileRoute("/admin/matrimony/reports")({
  head: () => ({
    meta: [
      { title: "Reports & Moderation — YFJ Matrimony Admin" },
      {
        name: "description",
        content: "Review member reports, issue warnings, mute chat, and resolve safety issues.",
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

  const [warningReport, setWarningReport] = useState<ReportRow | null>(null);
  const [warningReason, setWarningReason] = useState("");
  const [isSubmittingWarning, setIsSubmittingWarning] = useState(false);

  const query = useQuery({
    queryKey: ["admin", "reports"],
    queryFn: () => adminService.reports(),
  });

  const resolve = async (id: string) => {
    try {
      await adminService.resolveReport(id);
      await queryClient.invalidateQueries({ queryKey: ["admin", "reports"] });
      await queryClient.invalidateQueries({ queryKey: ["admin", "stats"] });
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
      await queryClient.invalidateQueries({ queryKey: ["admin", "stats"] });
      toast.success(`User ${reportedUser} blocked and report resolved`);
    } catch {
      toast.error("Failed to process action");
    }
  };

  const handleMuteUser = async (report: ReportRow) => {
    if (!report.reportedUserId) {
      toast.error("User ID not available for muting");
      return;
    }
    if (!window.confirm(`Mute direct messaging for ${report.reportedUser} for 24 hours?`)) return;
    try {
      await adminService.muteUser(report.reportedUserId, 24, report.reason);
      toast.success(`${report.reportedUser} has been muted from messaging for 24 hours`);
    } catch {
      toast.error("Failed to mute user");
    }
  };

  const handleSendWarning = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!warningReport || !warningReport.reportedUserId) return;
    setIsSubmittingWarning(true);
    try {
      await adminService.warnUser(warningReport.reportedUserId, warningReason.trim(), `Report #${warningReport.id}`);
      toast.success(`Official warning notice delivered to ${warningReport.reportedUser}`);
      setWarningReport(null);
      setWarningReason("");
    } catch {
      toast.error("Failed to deliver warning");
    } finally {
      setIsSubmittingWarning(false);
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
        title="Reported Profiles & Moderation"
        description="Member safety reports, fake profile alerts, warn members, mute chat, and abusive conduct moderation."
      />

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b border-border pb-3">
        {(["all", "open", "resolved"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setFilter(tab)}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold capitalize transition-colors cursor-pointer ${
              filter === tab
                ? "bg-primary text-primary-foreground shadow-sm"
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
                    Report Reason:
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

              <div className="flex flex-wrap sm:flex-col gap-2 justify-end sm:items-end">
                {report.status !== "resolved" ? (
                  <>
                    <div className="flex gap-1.5">
                      {report.reportedUserId && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setWarningReport(report);
                              setWarningReason(report.reason);
                            }}
                            className="h-8 gap-1 text-xs text-amber-600 hover:bg-amber-500/10"
                          >
                            <MessageSquareWarning className="size-3.5" /> Warn
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleMuteUser(report)}
                            className="h-8 gap-1 text-xs text-stone-600 hover:bg-stone-500/10"
                          >
                            <VolumeX className="size-3.5" /> Mute 24h
                          </Button>
                        </>
                      )}
                    </div>
                    <div className="flex gap-1.5">
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => blockAndResolve(report.id, report.reportedUser)}
                        className="h-8 gap-1 text-xs"
                      >
                        <UserX className="size-3.5" /> Block & Resolve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => resolve(report.id)}
                        className="h-8 gap-1 text-xs"
                      >
                        <CheckCircle className="size-3.5" /> Resolve
                      </Button>
                    </div>
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

      {/* Warn Member Dialog */}
      <Dialog open={!!warningReport} onOpenChange={(open) => !open && setWarningReport(null)}>
        <DialogContent className="max-w-md rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="font-display text-xl text-amber-600 flex items-center gap-2">
              <MessageSquareWarning className="size-5" /> Issue Community Warning
            </DialogTitle>
            <DialogDescription>
              Deliver an official warning notice to {warningReport?.reportedUser}.
            </DialogDescription>
          </DialogHeader>

          {warningReport && (
            <form onSubmit={handleSendWarning} className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label htmlFor="warn-reason">Warning Notice Content</Label>
                <textarea
                  id="warn-reason"
                  rows={3}
                  value={warningReason}
                  onChange={(e) => setWarningReason(e.target.value)}
                  placeholder="Explain why this behavior breaches community standards…"
                  required
                  className="flex w-full rounded-2xl border border-input bg-background p-3 text-xs"
                />
              </div>

              <div className="pt-2 border-t border-border flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setWarningReport(null)}
                  disabled={isSubmittingWarning}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-amber-600 hover:bg-amber-700 text-white"
                  disabled={isSubmittingWarning}
                >
                  {isSubmittingWarning ? "Delivering…" : "Send Warning"}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
