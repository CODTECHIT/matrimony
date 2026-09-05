import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/common/states";
import { Badge } from "@/components/ui/badge";
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
  const query = useQuery({
    queryKey: ["admin", "payments"],
    queryFn: () => adminService.payments(),
  });

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
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
