import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  BadgeCheck,
  Check,
  CheckSquare,
  Crown,
  Edit3,
  Eye,
  Filter,
  Save,
  Search,
  Square,
  Trash2,
  UserCheck,
  UserX,
  X,
} from "lucide-react";
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
import type { AdminFullProfile, AdminUserRow, PlanTier } from "@/types";

export const Route = createFileRoute("/admin/matrimony/users")({
  head: () => ({
    meta: [
      { title: "Manage Members — YFJ Matrimony Admin" },
      {
        name: "description",
        content: "Approve, block, inspect profiles, and manage YFJ Matrimony member accounts.",
      },
      { property: "og:title", content: "Manage Members — YFJ Matrimony Admin" },
    ],
  }),
  component: AdminUsersPage,
});

function AdminUsersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [genderFilter, setGenderFilter] = useState<string>("all");
  const [planFilter, setPlanFilter] = useState<string>("all");

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [managingUser, setManagingUser] = useState<AdminUserRow | null>(null);
  const [editStatus, setEditStatus] = useState<"approved" | "blocked" | "pending">("pending");
  const [editPlan, setEditPlan] = useState<PlanTier>("free");
  const [isSaving, setIsSaving] = useState(false);

  // Full Profile Inspector State
  const [inspectingUserId, setInspectingUserId] = useState<string | null>(null);
  const [fullProfileData, setFullProfileData] = useState<AdminFullProfile | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editForm, setEditForm] = useState<Partial<AdminFullProfile> & { fullName?: string }>({});

  const query = useQuery({
    queryKey: ["admin", "users", search, statusFilter, genderFilter, planFilter],
    queryFn: () =>
      adminService.users({
        q: search || undefined,
        status: statusFilter,
        gender: genderFilter,
        plan: planFilter,
      }),
    placeholderData: keepPreviousData,
  });

  const usersList = query.data || [];

  const toggleSelectAll = () => {
    if (selectedIds.length === usersList.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(usersList.map((u) => u.id));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const handleBulkAction = async (action: "approve" | "block" | "activate" | "delete") => {
    if (selectedIds.length === 0) return;
    const confirmMsg =
      action === "delete"
        ? `Are you sure you want to permanently delete ${selectedIds.length} users?`
        : `Apply bulk ${action} to ${selectedIds.length} members?`;
    if (!window.confirm(confirmMsg)) return;

    try {
      await adminService.bulkUsers(selectedIds, action);
      await queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      await queryClient.invalidateQueries({ queryKey: ["admin", "stats"] });
      setSelectedIds([]);
      toast.success(`Bulk action completed for ${selectedIds.length} members`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Bulk action failed");
    }
  };

  const act = async (id: string, action: "approved" | "blocked" | "delete") => {
    try {
      if (action === "delete") {
        if (!window.confirm("Are you sure you want to permanently delete this user?")) return;
        await adminService.deleteUser(id);
      } else {
        await adminService.setUserStatus(id, action);
      }
      await queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      await queryClient.invalidateQueries({ queryKey: ["admin", "stats"] });
      toast.success(action === "delete" ? "Member deleted" : `Member marked as ${action}`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Action failed");
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
      await queryClient.invalidateQueries({ queryKey: ["admin", "stats"] });
      toast.success("Member account updated successfully");
      setManagingUser(null);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to update member");
    } finally {
      setIsSaving(false);
    }
  };

  const openFullProfileInspector = async (userId: string) => {
    setInspectingUserId(userId);
    setIsLoadingProfile(true);
    setIsEditingProfile(false);
    try {
      const data = await adminService.fullProfile(userId);
      setFullProfileData(data);
      setEditForm(data);
    } catch {
      toast.error("Failed to load full profile details");
      setInspectingUserId(null);
    } finally {
      setIsLoadingProfile(false);
    }
  };

  const handleSaveFullProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inspectingUserId) return;
    try {
      const updatePayload: Partial<AdminFullProfile> = { ...editForm };
      const resolvedName = editForm.fullName || editForm.full_name;
      if (resolvedName) {
        updatePayload.full_name = resolvedName;
      }
      await adminService.updateFullProfile(inspectingUserId, updatePayload);
      await queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      toast.success("Profile updated successfully");
      setIsEditingProfile(false);
      setFullProfileData({ ...fullProfileData, ...editForm } as AdminFullProfile);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to update profile");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Admin"
        title="Members Management"
        description="Approve new profiles, manage membership plans, inspect 6-section profiles, and moderate accounts."
      />

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name, ID, or mobile"
            aria-label="Search members"
            className="h-11 rounded-2xl pl-11"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 rounded-xl border border-input bg-card px-3 text-xs font-medium text-foreground focus:outline-none"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending Approval</option>
            <option value="approved">Approved & Verified</option>
            <option value="blocked">Blocked</option>
          </select>

          {/* Gender Filter */}
          <select
            value={genderFilter}
            onChange={(e) => setGenderFilter(e.target.value)}
            className="h-10 rounded-xl border border-input bg-card px-3 text-xs font-medium text-foreground focus:outline-none"
          >
            <option value="all">All Genders</option>
            <option value="female">Female</option>
            <option value="male">Male</option>
          </select>

          {/* Plan Filter */}
          <select
            value={planFilter}
            onChange={(e) => setPlanFilter(e.target.value)}
            className="h-10 rounded-xl border border-input bg-card px-3 text-xs font-medium text-foreground focus:outline-none"
          >
            <option value="all">All Plans</option>
            <option value="free">Free</option>
            <option value="silver">Silver</option>
            <option value="gold">Gold</option>
            <option value="platinum">Platinum</option>
          </select>
        </div>
      </div>

      {/* Bulk Action Toolbar */}
      {selectedIds.length > 0 && (
        <div className="flex items-center justify-between rounded-2xl bg-primary-soft p-3 text-sm text-primary">
          <span className="font-semibold">
            {selectedIds.length} member{selectedIds.length > 1 ? "s" : ""} selected
          </span>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => handleBulkAction("approve")}
              className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 text-xs gap-1"
            >
              <UserCheck className="size-3.5" /> Bulk Approve
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleBulkAction("block")}
              className="h-8 text-xs gap-1"
            >
              <UserX className="size-3.5" /> Bulk Block
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => handleBulkAction("delete")}
              className="h-8 text-xs gap-1"
            >
              <Trash2 className="size-3.5" /> Bulk Delete
            </Button>
            <button
              type="button"
              onClick={() => setSelectedIds([])}
              className="text-xs font-medium text-muted-foreground hover:text-foreground ml-2 cursor-pointer"
            >
              Deselect All
            </button>
          </div>
        </div>
      )}

      {query.isPending ? (
        <ListSkeleton />
      ) : query.isError ? (
        <ErrorState onRetry={() => void query.refetch()} />
      ) : usersList.length === 0 ? (
        <EmptyState title="No members found" description="Try clearing search or filters." />
      ) : (
        <div className="overflow-x-auto rounded-3xl border border-border bg-card shadow-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <button
                    type="button"
                    onClick={toggleSelectAll}
                    className="grid place-items-center cursor-pointer p-1 text-muted-foreground hover:text-foreground"
                    aria-label="Select all"
                  >
                    {selectedIds.length > 0 && selectedIds.length === usersList.length ? (
                      <CheckSquare className="size-4 text-primary" />
                    ) : (
                      <Square className="size-4" />
                    )}
                  </button>
                </TableHead>
                <TableHead>Member</TableHead>
                <TableHead>Mobile</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {usersList.map((user) => {
                const isSelected = selectedIds.includes(user.id);
                return (
                  <TableRow key={user.id} className={isSelected ? "bg-primary-soft/30" : ""}>
                    <TableCell>
                      <button
                        type="button"
                        onClick={() => toggleSelectOne(user.id)}
                        className="grid place-items-center cursor-pointer p-1 text-muted-foreground hover:text-foreground"
                      >
                        {isSelected ? (
                          <CheckSquare className="size-4 text-primary" />
                        ) : (
                          <Square className="size-4" />
                        )}
                      </button>
                    </TableCell>
                    <TableCell className="font-medium">
                      <div>
                        <p className="font-semibold text-foreground flex items-center gap-1.5">
                          {user.fullName}
                          {user.verified && (
                            <BadgeCheck className="size-4 text-emerald-600 shrink-0" />
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground font-mono">
                          {user.displayId || user.id.slice(0, 8)} • {user.gender}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs font-mono">{user.mobile}</TableCell>
                    <TableCell className="text-xs">{user.city}</TableCell>
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
                        className="capitalize text-xs"
                      >
                        {user.profileStatus}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(user.joinedAt).toLocaleDateString("en-IN", {
                        dateStyle: "medium",
                      })}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end items-center gap-1.5">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openFullProfileInspector(user.id)}
                          className="h-8 gap-1 text-xs"
                          title="Inspect complete 6-section matrimonial profile"
                        >
                          <Eye className="size-3.5" /> Profile
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openManager(user)}
                          className="h-8 gap-1 text-xs"
                        >
                          <Edit3 className="size-3.5" /> Manage
                        </Button>
                        {user.profileStatus !== "approved" && (
                          <Button
                            size="sm"
                            onClick={() => act(user.id, "approved")}
                            className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                          >
                            Approve
                          </Button>
                        )}
                        {user.profileStatus !== "blocked" && (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => act(user.id, "blocked")}
                            className="h-8 text-xs"
                          >
                            Block
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => act(user.id, "delete")}
                          className="h-8 text-xs text-destructive hover:bg-destructive/10 px-2"
                          title="Permanently Delete Member"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
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
              <div className="rounded-2xl border border-border bg-muted/40 p-4 space-y-2.5 text-sm">
                <div className="flex items-center justify-between border-b border-border pb-2">
                  <div>
                    <p className="font-bold text-base text-foreground">{managingUser.fullName}</p>
                    <p className="text-xs text-muted-foreground font-mono">
                      ID: {managingUser.displayId || managingUser.id}
                    </p>
                  </div>
                  <span className="rounded-full bg-primary-soft px-2.5 py-0.5 text-xs font-bold text-primary uppercase">
                    {managingUser.plan} Tier
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground block">Mobile:</span>
                    <span className="font-semibold text-foreground">{managingUser.mobile}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Location:</span>
                    <span className="font-semibold text-foreground">{managingUser.city}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-user-status">Account Approval Status</Label>
                <select
                  id="edit-user-status"
                  value={editStatus}
                  onChange={(e) =>
                    setEditStatus(e.target.value as "approved" | "blocked" | "pending")
                  }
                  className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none"
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
                  className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none"
                >
                  <option value="free">Free (Basic Discovery)</option>
                  <option value="silver">Silver (Basic Messaging)</option>
                  <option value="gold">Gold (Contact Viewing + Chat)</option>
                  <option value="platinum">Platinum (VIP Highlight + Unlimited)</option>
                </select>
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

      {/* Full 6-Section Profile Inspector Dialog */}
      <Dialog
        open={!!inspectingUserId}
        onOpenChange={(open) => !open && setInspectingUserId(null)}
      >
        <DialogContent className="max-w-3xl rounded-3xl p-6 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="font-display text-xl flex items-center gap-2">
                  <Eye className="size-5 text-primary" /> Matrimonial Profile Inspector
                </DialogTitle>
                <DialogDescription>
                  Full 6-section view of member personal, career, community, and family details.
                </DialogDescription>
              </div>
              {fullProfileData && !isEditingProfile && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsEditingProfile(true)}
                  className="gap-1.5 text-xs"
                >
                  <Edit3 className="size-3.5" /> Edit Profile
                </Button>
              )}
            </div>
          </DialogHeader>

          {isLoadingProfile ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              Loading matrimonial profile details…
            </div>
          ) : fullProfileData ? (
            isEditingProfile ? (
              <form onSubmit={handleSaveFullProfile} className="space-y-4 pt-2">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="space-y-1">
                    <Label>Full Name</Label>
                    <Input
                      value={editForm.fullName || fullProfileData.full_name}
                      onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Mobile Number</Label>
                    <Input
                      value={editForm.mobile || fullProfileData.mobile}
                      onChange={(e) => setEditForm({ ...editForm, mobile: e.target.value })}
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>City</Label>
                    <Input
                      value={editForm.city || fullProfileData.city || ""}
                      onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>State</Label>
                    <Input
                      value={editForm.state || fullProfileData.state || ""}
                      onChange={(e) => setEditForm({ ...editForm, state: e.target.value })}
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Education</Label>
                    <Input
                      value={editForm.education || fullProfileData.education || ""}
                      onChange={(e) => setEditForm({ ...editForm, education: e.target.value })}
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Occupation</Label>
                    <Input
                      value={editForm.occupation || fullProfileData.occupation || ""}
                      onChange={(e) => setEditForm({ ...editForm, occupation: e.target.value })}
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Religion</Label>
                    <Input
                      value={editForm.religion || fullProfileData.religion || ""}
                      onChange={(e) => setEditForm({ ...editForm, religion: e.target.value })}
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Caste</Label>
                    <Input
                      value={editForm.caste || fullProfileData.caste || ""}
                      onChange={(e) => setEditForm({ ...editForm, caste: e.target.value })}
                      className="h-9"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label>About Statement / Bio</Label>
                  <textarea
                    rows={3}
                    value={editForm.about || fullProfileData.about || ""}
                    onChange={(e) => setEditForm({ ...editForm, about: e.target.value })}
                    className="flex w-full rounded-xl border border-input bg-background p-2.5 text-xs"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-border">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditingProfile(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" className="gap-1.5">
                    <Save className="size-3.5" /> Save Changes
                  </Button>
                </div>
              </form>
            ) : (
              <div className="space-y-5 pt-2">
                {/* Header overview */}
                <div className="flex items-center justify-between rounded-2xl bg-muted/40 p-4 border border-border">
                  <div>
                    <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
                      {fullProfileData.full_name}
                      {fullProfileData.verified && (
                        <BadgeCheck className="size-5 text-emerald-600" />
                      )}
                    </h3>
                    <p className="text-xs text-muted-foreground font-mono">
                      ID: {fullProfileData.display_id || fullProfileData.id} • Registered:{" "}
                      {new Date(fullProfileData.joined_at).toLocaleDateString("en-IN")}
                    </p>
                  </div>
                  <Badge className="capitalize">{fullProfileData.profile_status}</Badge>
                </div>

                {/* 6 Canonical Sections */}
                <div className="grid gap-4 sm:grid-cols-2 text-xs">
                  <div className="rounded-2xl border border-border bg-card p-4 space-y-2">
                    <h4 className="font-bold uppercase tracking-wider text-muted-foreground text-[0.7rem] border-b border-border pb-1">
                      1. Personal & Contact
                    </h4>
                    <p><span className="text-muted-foreground">Gender:</span> <strong className="capitalize">{fullProfileData.gender}</strong></p>
                    <p><span className="text-muted-foreground">Age / DOB:</span> <strong>{fullProfileData.age ? `${fullProfileData.age} yrs` : "—"}</strong></p>
                    <p><span className="text-muted-foreground">Height:</span> <strong>{fullProfileData.height || "—"}</strong></p>
                    <p><span className="text-muted-foreground">Mobile:</span> <strong className="font-mono">{fullProfileData.mobile}</strong></p>
                    <p><span className="text-muted-foreground">WhatsApp:</span> <strong>{fullProfileData.whatsapp || "—"}</strong></p>
                  </div>

                  <div className="rounded-2xl border border-border bg-card p-4 space-y-2">
                    <h4 className="font-bold uppercase tracking-wider text-muted-foreground text-[0.7rem] border-b border-border pb-1">
                      2. Community & Religion
                    </h4>
                    <p><span className="text-muted-foreground">Religion:</span> <strong>{fullProfileData.religion || "—"}</strong></p>
                    <p><span className="text-muted-foreground">Caste:</span> <strong>{fullProfileData.caste || "—"}</strong></p>
                    <p><span className="text-muted-foreground">Mother Tongue:</span> <strong>{fullProfileData.mother_tongue || "—"}</strong></p>
                    <p><span className="text-muted-foreground">Marital Status:</span> <strong className="capitalize">{fullProfileData.marital_status || "—"}</strong></p>
                  </div>

                  <div className="rounded-2xl border border-border bg-card p-4 space-y-2">
                    <h4 className="font-bold uppercase tracking-wider text-muted-foreground text-[0.7rem] border-b border-border pb-1">
                      3. Career & Location
                    </h4>
                    <p><span className="text-muted-foreground">Education:</span> <strong>{fullProfileData.education || "—"}</strong></p>
                    <p><span className="text-muted-foreground">Occupation:</span> <strong>{fullProfileData.occupation || "—"}</strong></p>
                    <p><span className="text-muted-foreground">Income Range:</span> <strong>{fullProfileData.income_range || "—"}</strong></p>
                    <p><span className="text-muted-foreground">Location:</span> <strong>{[fullProfileData.city, fullProfileData.state, fullProfileData.country].filter(Boolean).join(", ") || "—"}</strong></p>
                  </div>

                  <div className="rounded-2xl border border-border bg-card p-4 space-y-2">
                    <h4 className="font-bold uppercase tracking-wider text-muted-foreground text-[0.7rem] border-b border-border pb-1">
                      4. Family Details
                    </h4>
                    <p><span className="text-muted-foreground">Father's Occ:</span> <strong>{fullProfileData.father_occupation || "—"}</strong></p>
                    <p><span className="text-muted-foreground">Mother's Occ:</span> <strong>{fullProfileData.mother_occupation || "—"}</strong></p>
                    <p><span className="text-muted-foreground">Siblings:</span> <strong>{fullProfileData.siblings || "—"}</strong></p>
                    <p><span className="text-muted-foreground">Family Type:</span> <strong>{fullProfileData.family_type || "—"}</strong></p>
                  </div>
                </div>

                {/* About Section */}
                <div className="rounded-2xl border border-border bg-card p-4 text-xs space-y-1.5">
                  <h4 className="font-bold uppercase tracking-wider text-muted-foreground text-[0.7rem] border-b border-border pb-1">
                    5. About Profile
                  </h4>
                  <p className="text-foreground leading-relaxed italic">
                    "{fullProfileData.about || "No personal bio written yet."}"
                  </p>
                </div>

                {/* Photos Section */}
                <div className="rounded-2xl border border-border bg-card p-4 text-xs space-y-2">
                  <h4 className="font-bold uppercase tracking-wider text-muted-foreground text-[0.7rem] border-b border-border pb-1">
                    6. Uploaded Gallery Photos ({fullProfileData.photos?.length || 0})
                  </h4>
                  {fullProfileData.photos && fullProfileData.photos.length > 0 ? (
                    <div className="grid grid-cols-4 gap-2 pt-1">
                      {fullProfileData.photos.map((url, i) => (
                        <div key={i} className="aspect-square overflow-hidden rounded-xl border border-border bg-muted">
                          <img src={url} alt={`Gallery ${i + 1}`} className="size-full object-cover" />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No photos uploaded to this profile.</p>
                  )}
                </div>

                <div className="flex justify-end pt-2 border-t border-border">
                  <Button variant="outline" size="sm" onClick={() => setInspectingUserId(null)}>
                    Close
                  </Button>
                </div>
              </div>
            )
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
