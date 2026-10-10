import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Clock,
  Eye,
  FileCode,
  Filter,
  RefreshCw,
  ScrollText,
  Search,
  Shield,
  User,
} from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/common/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { adminService } from "@/services";
import type { AuditLogRow } from "@/types";

export const Route = createFileRoute("/admin/matrimony/audit-logs")({
  head: () => ({
    meta: [
      { title: "System Audit Logs — YFJ Matrimony Admin" },
      {
        name: "description",
        content: "Immutable audit trail of administrative modifications and security actions.",
      },
    ],
  }),
  component: AdminAuditLogsPage,
});

function AdminAuditLogsPage() {
  const [selectedAction, setSelectedAction] = useState<string>("all");
  const [inspectingLog, setInspectingLog] = useState<AuditLogRow | null>(null);

  const query = useQuery({
    queryKey: ["admin", "audit-logs", selectedAction],
    queryFn: () =>
      adminService.auditLogs(selectedAction === "all" ? undefined : selectedAction, 100, 0),
  });

  const getActionBadgeColor = (action: string) => {
    if (action.includes("delete") || action.includes("block")) return "destructive";
    if (action.includes("approved") || action.includes("verified")) return "default";
    return "secondary";
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Security & Governance"
        title="Administrative Audit Logs"
        description="Immutable chronological record of all administrative actions, plan updates, verifications, and moderation."
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

      {/* Action Filters */}
      <div className="flex flex-wrap gap-2 border-b border-border pb-3">
        {[
          { label: "All Logs", value: "all" },
          { label: "Verifications", value: "verification_approved" },
          { label: "User Status Changes", value: "user_status_changed" },
          { label: "Plan Updates", value: "user_plan_updated" },
          { label: "Bulk Actions", value: "bulk_users_approve" },
          { label: "Refunds", value: "payment_refunded" },
          { label: "Reports Resolved", value: "report_resolved" },
        ].map(({ label, value }) => (
          <button
            key={value}
            type="button"
            onClick={() => setSelectedAction(value)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
              selectedAction === value
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted/70 text-muted-foreground hover:bg-muted"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {query.isPending ? (
        <ListSkeleton />
      ) : query.isError ? (
        <ErrorState onRetry={() => void query.refetch()} />
      ) : query.data?.logs?.length === 0 ? (
        <EmptyState
          title="No audit logs recorded"
          description="System actions will be chronologically indexed here."
        />
      ) : (
        <div className="overflow-x-auto rounded-3xl border border-border bg-card shadow-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>Admin</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Target Type</TableHead>
                <TableHead>Target ID</TableHead>
                <TableHead>IP Address</TableHead>
                <TableHead className="text-right">Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {query.data?.logs?.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="font-mono text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(log.created_at).toLocaleString("en-IN", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </TableCell>
                  <TableCell className="font-medium">
                    <span className="flex items-center gap-1.5">
                      <Shield className="size-3.5 text-primary shrink-0" />
                      {log.admin_name || "Admin"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getActionBadgeColor(log.action)} className="font-mono text-[0.7rem]">
                      {log.action}
                    </Badge>
                  </TableCell>
                  <TableCell className="capitalize text-xs font-medium">
                    {log.target_type}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground max-w-[140px] truncate">
                    {log.target_id || "—"}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {log.ip_address || "127.0.0.1"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setInspectingLog(log)}
                      className="h-8 gap-1 text-xs"
                    >
                      <Eye className="size-3.5" /> View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Metadata Inspector Dialog */}
      <Dialog open={!!inspectingLog} onOpenChange={(open) => !open && setInspectingLog(null)}>
        <DialogContent className="max-w-lg rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="font-display text-xl flex items-center gap-2">
              <ScrollText className="size-5 text-primary" /> Audit Log Record
            </DialogTitle>
            <DialogDescription>
              Detailed forensic snapshot recorded during this administrative modification.
            </DialogDescription>
          </DialogHeader>

          {inspectingLog && (
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-3 rounded-2xl bg-muted/40 p-3.5 text-xs border border-border">
                <div>
                  <span className="text-muted-foreground block">Action:</span>
                  <span className="font-bold text-foreground">{inspectingLog.action}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Admin User:</span>
                  <span className="font-semibold text-foreground">{inspectingLog.admin_name}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Target Type:</span>
                  <span className="font-semibold text-foreground capitalize">
                    {inspectingLog.target_type}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Target ID:</span>
                  <span className="font-mono text-foreground">{inspectingLog.target_id || "None"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Recorded At:</span>
                  <span className="text-foreground">
                    {new Date(inspectingLog.created_at).toLocaleString("en-IN")}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block">IP Address:</span>
                  <span className="font-mono text-foreground">{inspectingLog.ip_address || "127.0.0.1"}</span>
                </div>
              </div>

              <div>
                <Label className="text-xs font-semibold mb-1.5 flex items-center gap-1.5">
                  <FileCode className="size-3.5 text-primary" /> Action Metadata Payload:
                </Label>
                <pre className="max-h-60 overflow-auto rounded-2xl bg-stone-950 p-4 font-mono text-xs text-stone-200">
                  {JSON.stringify(inspectingLog.metadata || {}, null, 2)}
                </pre>
              </div>

              <div className="pt-2 flex justify-end">
                <Button variant="outline" onClick={() => setInspectingLog(null)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
