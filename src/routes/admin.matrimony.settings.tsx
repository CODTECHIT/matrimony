import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  AlertTriangle,
  CheckCircle2,
  Lock,
  Mail,
  Phone,
  Save,
  Settings,
  Shield,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  UserPlus,
  Users,
} from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { ErrorState, ListSkeleton } from "@/components/common/states";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { adminService } from "@/services";
import type { StaffMemberRow, SystemSettings } from "@/types";

export const Route = createFileRoute("/admin/matrimony/settings")({
  head: () => ({
    meta: [
      { title: "Platform Settings & Staff — YFJ Matrimony Admin" },
      { name: "description", content: "Global system parameters, safety toggles, and staff permissions." },
    ],
  }),
  component: AdminSettingsPage,
});

function AdminSettingsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"system" | "staff">("system");
  const [savingSettings, setSavingSettings] = useState(false);

  // Form state for system settings
  const [settingsForm, setSettingsForm] = useState<SystemSettings>({
    maintenance_mode: false,
    allow_registrations: true,
    require_verification_to_chat: false,
    free_interests_per_day: 10,
    contact_email: "support@yfjmatrimony.com",
    helpline_phone: "+91 99999 88888",
    payment_gateway_mode: "sandbox",
    auto_approve_profiles: false,
  });

  // Promote staff modal / input
  const [promoteUserId, setPromoteUserId] = useState("");
  const [promoteRole, setPromoteRole] = useState("support");
  const [promoting, setPromoting] = useState(false);

  const { data: currentSettings, isLoading: loadingSettings, refetch: refetchSettings } = useQuery({
    queryKey: ["admin", "settings"],
    queryFn: async () => {
      const res = await adminService.settings();
      setSettingsForm(res);
      return res;
    },
  });

  const { data: staff = [], isLoading: loadingStaff, refetch: refetchStaff } = useQuery({
    queryKey: ["admin", "staff"],
    queryFn: () => adminService.staffMembers(),
  });

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      await adminService.updateSettings(settingsForm);
      await queryClient.invalidateQueries({ queryKey: ["admin", "settings"] });
      toast.success("System settings updated successfully!");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to update settings");
    } finally {
      setSavingSettings(false);
    }
  };

  const handleUpdateRole = async (userId: string, newRole: string) => {
    try {
      await adminService.updateStaffRole(userId, newRole);
      await queryClient.invalidateQueries({ queryKey: ["admin", "staff"] });
      toast.success(`User role updated to ${newRole}`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to change staff role");
    }
  };

  const handlePromoteStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promoteUserId.trim()) {
      toast.error("Please enter a User ID");
      return;
    }
    setPromoting(true);
    try {
      await adminService.updateStaffRole(promoteUserId.trim(), promoteRole);
      await queryClient.invalidateQueries({ queryKey: ["admin", "staff"] });
      toast.success(`User granted ${promoteRole} permissions!`);
      setPromoteUserId("");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to assign staff role");
    } finally {
      setPromoting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings & Administration"
        description="Configure global platform controls, automated rules, security gates, and team member permissions."
      />

      {/* Tabs */}
      <div className="flex border-b border-border">
        <button
          type="button"
          onClick={() => setActiveTab("system")}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors cursor-pointer ${
            activeTab === "system"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Settings className="size-4" />
          <span>System & Security</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("staff")}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors cursor-pointer ${
            activeTab === "staff"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <ShieldCheck className="size-4" />
          <span>Staff Roles & RBAC ({staff.length})</span>
        </button>
      </div>

      {activeTab === "system" ? (
        loadingSettings ? (
          <ListSkeleton rows={3} />
        ) : (
          <form onSubmit={handleSaveSettings} className="space-y-6">
            {/* Maintenance Mode Warning Card */}
            {settingsForm.maintenance_mode && (
              <div className="flex items-center gap-3 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-xs text-destructive">
                <AlertTriangle className="size-5 shrink-0" />
                <div>
                  <strong className="block font-semibold">Maintenance Mode Active!</strong>
                  <span>Regular members will see a maintenance screen. Only admins have access.</span>
                </div>
              </div>
            )}

            {/* Platform Toggles */}
            <div className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-4">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Shield className="size-4 text-primary" />
                <span>Platform Controls & Safety Rules</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                {/* Maintenance Mode */}
                <div className="flex items-center justify-between rounded-xl border border-border p-4">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Maintenance Mode</p>
                    <p className="text-xs text-muted-foreground">Temporarily disable member access for upgrades</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settingsForm.maintenance_mode}
                    onChange={(e) => setSettingsForm({ ...settingsForm, maintenance_mode: e.target.checked })}
                    className="size-5 rounded border-border text-primary focus:ring-primary cursor-pointer"
                  />
                </div>

                {/* Allow Registrations */}
                <div className="flex items-center justify-between rounded-xl border border-border p-4">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Open Registration</p>
                    <p className="text-xs text-muted-foreground">Allow new members to register accounts</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settingsForm.allow_registrations}
                    onChange={(e) => setSettingsForm({ ...settingsForm, allow_registrations: e.target.checked })}
                    className="size-5 rounded border-border text-primary focus:ring-primary cursor-pointer"
                  />
                </div>

                {/* Require Verification */}
                <div className="flex items-center justify-between rounded-xl border border-border p-4">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Mandatory ID Verification</p>
                    <p className="text-xs text-muted-foreground">Require verified badge to start chats</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settingsForm.require_verification_to_chat}
                    onChange={(e) =>
                      setSettingsForm({ ...settingsForm, require_verification_to_chat: e.target.checked })
                    }
                    className="size-5 rounded border-border text-primary focus:ring-primary cursor-pointer"
                  />
                </div>

                {/* Auto Approve Profiles */}
                <div className="flex items-center justify-between rounded-xl border border-border p-4">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Auto-Approve Profiles</p>
                    <p className="text-xs text-muted-foreground">Automatically publish new profile submissions</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settingsForm.auto_approve_profiles}
                    onChange={(e) =>
                      setSettingsForm({ ...settingsForm, auto_approve_profiles: e.target.checked })
                    }
                    className="size-5 rounded border-border text-primary focus:ring-primary cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* Numerical & Contact Parameters */}
            <div className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-4">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Settings className="size-4 text-primary" />
                <span>Operational Parameters & Helplines</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                    Free Interests Allowed Per Day
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={settingsForm.free_interests_per_day}
                    onChange={(e) =>
                      setSettingsForm({ ...settingsForm, free_interests_per_day: Number(e.target.value) })
                    }
                    className="w-full rounded-xl border border-border bg-background px-3.5 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                    Payment Gateway Mode
                  </label>
                  <select
                    value={settingsForm.payment_gateway_mode}
                    onChange={(e) =>
                      setSettingsForm({
                        ...settingsForm,
                        payment_gateway_mode: e.target.value as "sandbox" | "live",
                      })
                    }
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                  >
                    <option value="sandbox">Sandbox (Testing / Demo Mode)</option>
                    <option value="live">Live Production (Razorpay Gateway)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                    Official Support Email
                  </label>
                  <input
                    type="email"
                    value={settingsForm.contact_email}
                    onChange={(e) => setSettingsForm({ ...settingsForm, contact_email: e.target.value })}
                    className="w-full rounded-xl border border-border bg-background px-3.5 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                    Helpline Phone Number
                  </label>
                  <input
                    type="text"
                    value={settingsForm.helpline_phone}
                    onChange={(e) => setSettingsForm({ ...settingsForm, helpline_phone: e.target.value })}
                    className="w-full rounded-xl border border-border bg-background px-3.5 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-3 border-t border-border">
                <Button type="submit" disabled={savingSettings} className="gap-2 rounded-xl">
                  <Save className="size-4" />
                  {savingSettings ? "Saving Settings..." : "Save System Settings"}
                </Button>
              </div>
            </div>
          </form>
        )
      ) : (
        /* Staff & RBAC Tab */
        <div className="space-y-6">
          {/* Add Staff Card */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <UserPlus className="size-4 text-primary" />
                <span>Assign Staff Permissions</span>
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Grant administrative or moderation access to an existing platform member.
              </p>
            </div>

            <form onSubmit={handlePromoteStaff} className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 min-w-0">
                <input
                  type="text"
                  required
                  value={promoteUserId}
                  onChange={(e) => setPromoteUserId(e.target.value)}
                  placeholder="Enter User UUID or Email..."
                  className="w-full rounded-xl border border-border bg-background px-3.5 py-2 text-xs font-mono text-foreground focus:border-primary focus:outline-none"
                />
              </div>
              <select
                value={promoteRole}
                onChange={(e) => setPromoteRole(e.target.value)}
                className="rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground focus:border-primary focus:outline-none"
              >
                <option value="support">Customer Support Agent</option>
                <option value="moderator">Content & Verification Moderator</option>
                <option value="admin">Full Administrator</option>
              </select>
              <Button type="submit" disabled={promoting} className="gap-2 rounded-xl text-xs">
                {promoting ? "Assigning..." : "Assign Role"}
              </Button>
            </form>

            {/* Quick RBAC Role Guide */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div className="rounded-xl border border-border/80 bg-background/50 p-3 text-xs">
                <span className="font-bold text-foreground flex items-center gap-1.5">
                  <ShieldCheck className="size-3.5 text-primary" /> Full Admin
                </span>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Full control over payments, packages, coupons, system settings, staff, CMS, and all records.
                </p>
              </div>
              <div className="rounded-xl border border-border/80 bg-background/50 p-3 text-xs">
                <span className="font-bold text-foreground flex items-center gap-1.5">
                  <CheckCircle2 className="size-3.5 text-blue-500" /> Moderator
                </span>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Reviews ID proofs, resolves abuse flags, manages success stories, and edits CMS policy content.
                </p>
              </div>
              <div className="rounded-xl border border-border/80 bg-background/50 p-3 text-xs">
                <span className="font-bold text-foreground flex items-center gap-1.5">
                  <UserCheck className="size-3.5 text-emerald-500" /> Support Agent
                </span>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Manages live customer tickets, chats with members, and responds to member inquiries.
                </p>
              </div>
            </div>
          </div>

          {/* Current Staff List */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Users className="size-4 text-primary" />
              <span>Active Administrative Staff</span>
            </h3>

            {loadingStaff ? (
              <ListSkeleton rows={2} />
            ) : staff.length === 0 ? (
              <p className="text-xs text-muted-foreground">No staff members configured.</p>
            ) : (
              <div className="divide-y divide-border/60">
                {staff.map((member) => (
                  <div key={member.id} className="py-3.5 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="flex size-10 items-center justify-center rounded-full bg-primary-soft text-primary font-bold text-sm">
                        {member.full_name.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-foreground">{member.full_name}</p>
                          <Badge
                            variant={member.role === "admin" ? "default" : "secondary"}
                            className="text-[10px] uppercase font-mono"
                          >
                            {member.role}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{member.email}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <select
                        value={member.role}
                        onChange={(e) => handleUpdateRole(member.id, e.target.value)}
                        className="rounded-lg border border-border bg-background px-2.5 py-1 text-xs font-medium text-foreground focus:border-primary focus:outline-none"
                      >
                        <option value="admin">Admin</option>
                        <option value="moderator">Moderator</option>
                        <option value="support">Support</option>
                        <option value="user">Demote to Member</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
