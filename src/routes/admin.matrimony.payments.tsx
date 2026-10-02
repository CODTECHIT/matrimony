import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/common/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatInr } from "@/components/pricing/PlanCard";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { adminService } from "@/services";

export const Route = createFileRoute("/admin/matrimony/payments")({
  head: () => ({
    meta: [
      { title: "Payments — YFJ Matrimony Admin" },
      {
        name: "description",
        content: "Review membership payments, gateway references and refund status.",
      },
      { property: "og:title", content: "Payments — YFJ Matrimony Admin" },
      { property: "og:description", content: "Transaction history and payment status." },
    ],
  }),
  component: AdminPaymentsPage,
});

function AdminPaymentsPage() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["admin", "payments"],
    queryFn: () => adminService.payments(),
  });

  const handleRefund = async (id: string, user: string) => {
    if (!window.confirm(`Issue refund for ${user}'s payment?`)) return;
    try {
      await adminService.refundPayment(id);
      await queryClient.invalidateQueries({ queryKey: ["admin", "payments"] });
      toast.success(`Payment ${id} refunded successfully.`);
    } catch {
      toast.error("Failed to process refund.");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Admin"
        title="Payments"
        description="Transactions recorded by the Razorpay payment gateway."
      />

      {query.isPending ? (
        <ListSkeleton />
      ) : query.isError ? (
        <ErrorState onRetry={() => void query.refetch()} />
      ) : query.data?.length === 0 ? (
        <EmptyState title="No payments yet" description="Transactions will appear here." />
      ) : (
        <div className="overflow-x-auto rounded-3xl border border-border bg-card shadow-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Gateway ref</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {query.data?.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell className="font-medium">{payment.user}</TableCell>
                  <TableCell>{payment.plan}</TableCell>
                  <TableCell>{formatInr(payment.amountInr)}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        payment.status === "success"
                          ? "default"
                          : payment.status === "failed"
                            ? "destructive"
                            : "secondary"
                      }
                    >
                      {payment.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {new Date(payment.createdAt).toLocaleDateString("en-IN", {
                      dateStyle: "medium",
                    })}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{payment.gatewayRef}</TableCell>
                  <TableCell className="text-right">
                    {payment.status === "success" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs text-destructive hover:bg-destructive/10"
                        onClick={() => handleRefund(payment.id, payment.user)}
                      >
                        Refund
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
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
