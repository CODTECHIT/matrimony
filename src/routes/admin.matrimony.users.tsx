import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Search, Trash2, Edit3, Crown } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/common/states";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import type { AdminUserRow, PlanTier } from "@/types";

export const Route = createFileRoute("/admin/matrimony/users")({
  head: () => ({
    meta: [
      { title: "Manage Members — YFJ Matrimony Admin" },
      {
        name: "description",
        content: "Approve, block and manage YFJ Matrimony member accounts.",
      },
      { property: "og:title", content: "Manage Members — YFJ Matrimony Admin" },
      { property: "og:description", content: "Member moderation and account management." },
    ],
  }),
  component: AdminUsersPage,
});

function AdminUsersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [managingUser, setManagingUser] = useState<AdminUserRow | null>(null);
  const [editStatus, setEditStatus] = useState<"approved" | "blocked" | "pending">("pending");
  const [editPlan, setEditPlan] = useState<PlanTier>("free");
  const [isSaving, setIsSaving] = useState(false);

  const query = useQuery({
    queryKey: ["admin", "users", search],
    queryFn: () => adminService.users(search || undefined),
    placeholderData: keepPreviousData,
  });

  const act = async (id: string, action: "approved" | "blocked" | "delete") => {
    try {
      if (action === "delete") {
        if (!window.confirm("Are you sure you want to permanently delete this user?")) return;
        await adminService.deleteUser(id);
      } else {
        await adminService.setUserStatus(id, action);
      }
      await queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      toast.success(action === "delete" ? "Member deleted" : `Member marked as ${action}`);
    } catch {
      toast.error("Action failed");
    }
  };

  const openManager = (user: AdminUserRow) => {
    setManagingUser(user);
    setEditStatus(user.profileStatus);
    setEditPlan(user.plan);
  };

  const handleSaveMemberChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!managingUser) return;
    setIsSaving(true);
    try {
      if (editStatus !== managingUser.profileStatus) {
        await adminService.setUserStatus(managingUser.id, editStatus);
      }
      if (editPlan !== managingUser.plan) {
        await adminService.updateUserPlan(managingUser.id, editPlan);
      }
      await queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      toast.success("Member account updated successfully");
      setManagingUser(null);
    } catch {
      toast.error("Failed to update member");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Admin"
        title="Members"
        description="Approve new profiles, manage membership plans, and moderate accounts."
      />

      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search members by name or mobile"
          aria-label="Search members"
          className="h-11 rounded-2xl pl-11"
        />
      </div>

      {query.isPending ? (
        <ListSkeleton />
      ) : query.isError ? (
        <ErrorState onRetry={() => void query.refetch()} />
      ) : query.data?.length === 0 ? (
        <EmptyState title="No members found" description="Try a different search term." />
      ) : (
        <div className="overflow-x-auto rounded-3xl border border-border bg-card shadow-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Mobile</TableHead>
                <TableHead>City</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {query.data?.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">
                    <div>
                      <p className="font-semibold text-foreground">{user.fullName}</p>
                      <p className="text-xs text-muted-foreground font-mono">{user.id}</p>
                    </div>
                  </TableCell>
                  <TableCell>{user.mobile}</TableCell>
                  <TableCell>{user.city}</TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-xs font-semibold capitalize">
                      {user.plan === "platinum" && <Crown className="size-3 text-amber-500" />}
                      {user.plan}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        user.profileStatus === "approved"
                          ? "default"
                          : user.profileStatus === "blocked"
                            ? "destructive"
                            : "secondary"
                      }
                      className="capitalize"
                    >
                      {user.profileStatus}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(user.joinedAt).toLocaleDateString("en-IN", { dateStyle: "medium" })}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end items-center gap-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openManager(user)}
                        className="gap-1 text-xs"
                      >
                        <Edit3 className="size-3.5" /> Manage
                      </Button>
                      {user.profileStatus !== "approved" && (
                        <Button
                          size="sm"
                          onClick={() => act(user.id, "approved")}
                          className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                          Approve
                        </Button>
                      )}
                      {user.profileStatus !== "blocked" && (
                        <Button
                          size="sm"
                          variant="neutral"
                          onClick={() => act(user.id, "blocked")}
                          className="text-xs"
                        >
                          Block
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Member Manage & Plan Edit Dialog */}
      <Dialog open={!!managingUser} onOpenChange={(open) => !open && setManagingUser(null)}>
        <DialogContent className="max-w-md rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Manage Member Account</DialogTitle>
            <DialogDescription>
              Adjust verification approval, assign membership plans, or restrict access.
            </DialogDescription>
          </DialogHeader>

          {managingUser && (
            <form onSubmit={handleSaveMemberChanges} className="space-y-4 pt-2">
              <div className="rounded-2xl border border-border bg-muted/40 p-3 space-y-1 text-sm">
                <p className="font-bold text-foreground">{managingUser.fullName}</p>
                <p className="text-xs text-muted-foreground">Mobile: {managingUser.mobile}</p>
                <p className="text-xs text-muted-foreground">
                  City: {managingUser.city} · Gender: {managingUser.gender}
                </p>
                <p className="text-xs text-muted-foreground">ID: {managingUser.id}</p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-user-status">Account Approval Status</Label>
                <select
                  id="edit-user-status"
                  value={editStatus}
                  onChange={(e) =>
                    setEditStatus(e.target.value as "approved" | "blocked" | "pending")
                  }
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="pending">Pending Approval</option>
                  <option value="approved">Approved & Verified</option>
                  <option value="blocked">Blocked / Suspended</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-user-plan">Membership Plan Tier</Label>
                <select
                  id="edit-user-plan"
                  value={editPlan}
                  onChange={(e) => setEditPlan(e.target.value as PlanTier)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="free">Free (Basic Discovery)</option>
                  <option value="silver">Silver (Basic Messaging)</option>
                  <option value="gold">Gold (Contact Viewing + Chat)</option>
                  <option value="platinum">Platinum (VIP Highlight + Unlimited)</option>
                </select>
                <p className="text-xs text-muted-foreground">
                  Admin can manually upgrade members or assign promotional plans.
                </p>
              </div>

              <div className="pt-2 border-t border-border flex justify-between items-center">
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    act(managingUser.id, "delete");
                    setManagingUser(null);
                  }}
                  className="gap-1"
                >
                  <Trash2 className="size-3.5" /> Delete User
                </Button>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setManagingUser(null)}
                    disabled={isSaving}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" disabled={isSaving}>
                    {isSaving ? "Saving…" : "Save Changes"}
                  </Button>
                </div>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
