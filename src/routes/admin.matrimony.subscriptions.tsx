import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/PageHeader";
import { ErrorState, ListSkeleton } from "@/components/common/states";
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

export const Route = createFileRoute("/admin/matrimony/subscriptions")({
  head: () => ({
    meta: [
      { title: "Subscriptions — YFJ Matrimony Admin" },
      {
        name: "description",
        content: "Track active and expired matrimony memberships across all members.",
      },
      { property: "og:title", content: "Subscriptions — YFJ Matrimony Admin" },
      { property: "og:description", content: "Membership status across the platform." },
    ],
  }),
  component: AdminSubscriptionsPage,
});

function AdminSubscriptionsPage() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["admin", "subscriptions"],
    queryFn: () => adminService.subscriptions(),
  });

  const handleCancel = async (user: string) => {
    if (!window.confirm(`Cancel active subscription for ${user}?`)) return;
    try {
      await adminService.cancelSubscription(user);
      await queryClient.invalidateQueries({ queryKey: ["admin", "subscriptions"] });
      toast.success(`Subscription for ${user} marked as expired.`);
    } catch {
      toast.error("Failed to cancel subscription.");
    }
  };

  const handleExtend = async (user: string) => {
    try {
      await adminService.extendSubscription(user, 30);
      await queryClient.invalidateQueries({ queryKey: ["admin", "subscriptions"] });
      toast.success(`Subscription for ${user} extended by 30 days.`);
    } catch {
      toast.error("Failed to extend subscription.");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Admin"
        title="Subscriptions"
        description="Membership status and renewal dates across all members."
      />

      {query.isPending ? (
        <ListSkeleton />
      ) : query.isError ? (
        <ErrorState onRetry={() => void query.refetch()} />
      ) : (
        <div className="overflow-x-auto rounded-3xl border border-border bg-card shadow-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead>Auto-renew</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {query.data?.map((row, index) => (
                <TableRow key={`${row.user}-${index}`}>
                  <TableCell className="font-medium">{row.user}</TableCell>
                  <TableCell className="capitalize">{row.tier}</TableCell>
                  <TableCell>
                    <Badge variant={row.status === "active" ? "default" : "secondary"}>
                      {row.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {row.expiresAt
                      ? new Date(row.expiresAt).toLocaleDateString("en-IN", { dateStyle: "medium" })
                      : "—"}
                  </TableCell>
                  <TableCell>{row.autoRenew ? "On" : "Off"}</TableCell>
                  <TableCell className="text-right space-x-1.5">
                    {row.status === "active" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs text-destructive hover:bg-destructive/10"
                        onClick={() => handleCancel(row.user)}
                      >
                        Cancel
                      </Button>
                    ) : null}
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs text-primary hover:bg-primary-soft"
                      onClick={() => handleExtend(row.user)}
                    >
                      +30 Days
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
