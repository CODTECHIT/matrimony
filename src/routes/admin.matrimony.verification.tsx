import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  BadgeCheck,
  CheckCircle,
  Clock,
  Eye,
  FileText,
  Shield,
  ShieldAlert,
  User,
  XCircle,
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
import type { VerificationItem } from "@/types";

export const Route = createFileRoute("/admin/matrimony/verification")({
  head: () => ({
    meta: [
      { title: "ID Verification Queue — YFJ Matrimony Admin" },
      {
        name: "description",
        content: "Review uploaded Government IDs, verify identity, and grant verified badges.",
      },
    ],
  }),
  component: AdminVerificationPage,
});

function AdminVerificationPage() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<"pending" | "approved" | "rejected" | "all">("pending");
  const [inspectingItem, setInspectingItem] = useState<VerificationItem | null>(null);
  const [rejectingItem, setRejectingItem] = useState<VerificationItem | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const query = useQuery({
    queryKey: ["admin", "verifications", filter],
    queryFn: () => adminService.verifications(filter === "all" ? undefined : filter),
  });

  const handleApprove = async (item: VerificationItem) => {
    try {
      await adminService.approveVerification(item.id);
      await queryClient.invalidateQueries({ queryKey: ["admin", "verifications"] });
      await queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      await queryClient.invalidateQueries({ queryKey: ["admin", "stats"] });
      toast.success(`Identity verified for ${item.user_name}. Verified badge granted!`);
      if (inspectingItem?.id === item.id) setInspectingItem(null);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to approve verification");
    }
  };

  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingItem) return;
    setIsSubmitting(true);
    try {
      await adminService.rejectVerification(rejectingItem.id, rejectReason.trim());
      await queryClient.invalidateQueries({ queryKey: ["admin", "verifications"] });
      await queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      await queryClient.invalidateQueries({ queryKey: ["admin", "stats"] });
      toast.success(`Verification marked as rejected for ${rejectingItem.user_name}`);
      setRejectingItem(null);
      setRejectReason("");
      if (inspectingItem?.id === rejectingItem.id) setInspectingItem(null);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to reject verification");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Trust & Safety"
        title="ID Verification Queue"
        description="Verify government identification documents, validate photos, and grant verified badges."
      />

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b border-border pb-3">
        {(["pending", "approved", "rejected", "all"] as const).map((tab) => (
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
            {tab === "all" ? "All Documents" : `${tab} Queue`}
          </button>
        ))}
      </div>

      {query.isPending ? (
        <ListSkeleton />
      ) : query.isError ? (
        <ErrorState onRetry={() => void query.refetch()} />
      ) : query.data?.length === 0 ? (
        <EmptyState
          title={`No ${filter} verification requests`}
          description={
            filter === "pending"
              ? "All pending member documents have been reviewed."
              : "No verification records found in this category."
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {query.data?.map((item) => (
            <article
              key={item.id}
              className="flex flex-col justify-between rounded-3xl border border-border bg-card p-5 shadow-card transition-all hover:border-primary/40"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="grid size-10 place-items-center rounded-2xl bg-primary-soft text-primary font-bold">
                      {item.user_name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-semibold text-foreground text-sm flex items-center gap-1.5">
                        {item.user_name}
                        {item.status === "approved" && (
                          <BadgeCheck className="size-4 text-emerald-600" />
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground font-mono">
                        {item.display_id || item.user_id.slice(0, 8)} • {item.city || "India"}
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant={
                      item.status === "approved"
                        ? "default"
                        : item.status === "rejected"
                          ? "destructive"
                          : "secondary"
                    }
                    className="capitalize text-[0.7rem]"
                  >
                    {item.status}
                  </Badge>
                </div>

                <div className="mt-4 rounded-2xl bg-muted/40 p-3 text-xs space-y-1.5 border border-border/50">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Document Type:</span>
                    <span className="font-semibold uppercase text-foreground">
                      {item.document_type}
                    </span>
                  </div>
                  {item.document_number && (
                    <div className="flex justify-between text-muted-foreground">
                      <span>Doc Number:</span>
                      <span className="font-mono text-foreground">{item.document_number}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-muted-foreground">
                    <span>Submitted:</span>
                    <span className="text-foreground">
                      {new Date(item.created_at).toLocaleDateString("en-IN", {
                        dateStyle: "medium",
                      })}
                    </span>
                  </div>
                </div>

                {/* Thumbnail Previews */}
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div className="relative aspect-4/3 overflow-hidden rounded-xl border border-border bg-muted">
                    <img
                      src={item.document_front_url}
                      alt="Front Document"
                      className="size-full object-cover"
                      loading="lazy"
                    />
                    <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1 text-[0.65rem] text-white">
                      Front ID
                    </span>
                  </div>
                  <div className="relative aspect-4/3 overflow-hidden rounded-xl border border-border bg-muted">
                    {item.selfie_url ? (
                      <img
                        src={item.selfie_url}
                        alt="Selfie"
                        className="size-full object-cover"
                        loading="lazy"
                      />
                    ) : item.document_back_url ? (
                      <img
                        src={item.document_back_url}
                        alt="Back ID"
                        className="size-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="grid size-full place-items-center text-muted-foreground text-xs">
                        No 2nd photo
                      </div>
                    )}
                    <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1 text-[0.65rem] text-white">
                      {item.selfie_url ? "Selfie" : "Back ID"}
                    </span>
                  </div>
                </div>

                {item.rejection_reason && (
                  <p className="mt-2 text-xs text-destructive bg-destructive/10 p-2 rounded-xl">
                    <span className="font-bold">Reason:</span> {item.rejection_reason}
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="mt-4 pt-3 border-t border-border flex items-center justify-between gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setInspectingItem(item)}
                  className="gap-1 text-xs"
                >
                  <Eye className="size-3.5" /> Inspect
                </Button>

                {item.status === "pending" && (
                  <div className="flex gap-1.5">
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => {
                        setRejectingItem(item);
                        setRejectReason("");
                      }}
                      className="text-xs h-8 px-2.5"
                    >
                      <XCircle className="size-3.5" /> Reject
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleApprove(item)}
                      className="text-xs h-8 px-3 bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      <CheckCircle className="size-3.5" /> Approve
                    </Button>
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Inspect Document Modal */}
      <Dialog open={!!inspectingItem} onOpenChange={(open) => !open && setInspectingItem(null)}>
        <DialogContent className="max-w-2xl rounded-3xl p-6 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-xl flex items-center gap-2">
              <Shield className="size-5 text-primary" /> Inspect Identity Documents
            </DialogTitle>
            <DialogDescription>
              Verify document legitimacy and check photo consistency against the profile.
            </DialogDescription>
          </DialogHeader>

          {inspectingItem && (
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between rounded-2xl bg-muted/40 p-4 border border-border">
                <div>
                  <p className="font-bold text-base text-foreground">{inspectingItem.user_name}</p>
                  <p className="text-xs text-muted-foreground font-mono">
                    Mobile: {inspectingItem.user_mobile} • ID: {inspectingItem.display_id || inspectingItem.user_id}
                  </p>
                </div>
                <Badge className="capitalize">{inspectingItem.status}</Badge>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Government Document (Front):</Label>
                  <div className="overflow-hidden rounded-2xl border border-border bg-stone-950">
                    <img
                      src={inspectingItem.document_front_url}
                      alt="Front Document Large"
                      className="w-full object-contain max-h-64"
                    />
                  </div>
                </div>

                {inspectingItem.document_back_url && (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Government Document (Back):</Label>
                    <div className="overflow-hidden rounded-2xl border border-border bg-stone-950">
                      <img
                        src={inspectingItem.document_back_url}
                        alt="Back Document Large"
                        className="w-full object-contain max-h-64"
                      />
                    </div>
                  </div>
                )}

                {inspectingItem.selfie_url && (
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label className="text-xs font-semibold">Live Verification Selfie:</Label>
                    <div className="overflow-hidden rounded-2xl border border-border bg-stone-950 flex justify-center">
                      <img
                        src={inspectingItem.selfie_url}
                        alt="Verification Selfie Large"
                        className="max-h-64 object-contain"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-border flex justify-between items-center">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setInspectingItem(null)}
                >
                  Close
                </Button>

                {inspectingItem.status === "pending" && (
                  <div className="flex gap-2">
                    <Button
                      variant="destructive"
                      onClick={() => {
                        setRejectingItem(inspectingItem);
                        setRejectReason("");
                      }}
                      className="gap-1.5"
                    >
                      <XCircle className="size-4" /> Reject Document
                    </Button>
                    <Button
                      onClick={() => handleApprove(inspectingItem)}
                      className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      <CheckCircle className="size-4" /> Approve & Verify
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Rejection Reason Dialog */}
      <Dialog open={!!rejectingItem} onOpenChange={(open) => !open && setRejectingItem(null)}>
        <DialogContent className="max-w-md rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="font-display text-xl text-destructive flex items-center gap-2">
              <ShieldAlert className="size-5" /> Reject ID Verification
            </DialogTitle>
            <DialogDescription>
              Specify the reason why this document is invalid. This notice will be delivered to the member.
            </DialogDescription>
          </DialogHeader>

          {rejectingItem && (
            <form onSubmit={handleRejectSubmit} className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label htmlFor="reject-reason">Rejection Reason</Label>
                <textarea
                  id="reject-reason"
                  rows={3}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="e.g. Document image is blurry and text is illegible. Please upload a clear color photo."
                  required
                  className="flex w-full rounded-2xl border border-input bg-background p-3 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>

              {/* Quick Preset Buttons */}
              <div className="flex flex-wrap gap-1.5">
                {[
                  "Blurry image, unreadable text",
                  "Name mismatch with profile",
                  "Expired document",
                  "Document corners cut off",
                ].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setRejectReason(preset)}
                    className="rounded-full bg-muted px-2.5 py-1 text-[0.7rem] text-muted-foreground hover:bg-muted/80 cursor-pointer"
                  >
                    + {preset}
                  </button>
                ))}
              </div>

              <div className="pt-2 border-t border-border flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setRejectingItem(null)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="destructive"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Rejecting…" : "Confirm Rejection"}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
