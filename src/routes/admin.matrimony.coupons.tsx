import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Check,
  Copy,
  Gift,
  Percent,
  Plus,
  Search,
  Tag,
  ToggleLeft,
  ToggleRight,
  Trash2,
  TrendingUp,
  X,
} from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { ErrorState, ListSkeleton } from "@/components/common/states";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { adminService } from "@/services";
import type { CouponRow } from "@/types";

export const Route = createFileRoute("/admin/matrimony/coupons")({
  head: () => ({
    meta: [
      { title: "Coupons & Discounts — YFJ Matrimony Admin" },
      { name: "description", content: "Manage discount coupons and promotional campaigns." },
    ],
  }),
  component: AdminCouponsPage,
});

function AdminCouponsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<CouponRow | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    code: "",
    discount_type: "percentage" as "percentage" | "fixed",
    discount_value: 20,
    min_amount: 999,
    usage_limit: 100,
    valid_until: "",
    is_active: true,
  });

  const { data: coupons = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["admin", "coupons"],
    queryFn: () => adminService.coupons(),
  });

  const openCreateModal = () => {
    setEditingCoupon(null);
    setFormData({
      code: "",
      discount_type: "percentage",
      discount_value: 20,
      min_amount: 999,
      usage_limit: 100,
      valid_until: "",
      is_active: true,
    });
    setModalOpen(true);
  };

  const openEditModal = (coupon: CouponRow) => {
    setEditingCoupon(coupon);
    setFormData({
      code: coupon.code,
      discount_type: coupon.discount_type,
      discount_value: coupon.discount_value,
      min_amount: coupon.min_amount || 0,
      usage_limit: coupon.usage_limit || 100,
      valid_until: (coupon.valid_until || coupon.expires_at)
        ? (coupon.valid_until || coupon.expires_at)!.split("T")[0]!
        : "",
      is_active: coupon.is_active,
    });
    setModalOpen(true);
  };

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success(`Copied "${code}" to clipboard!`);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleToggleActive = async (coupon: CouponRow) => {
    try {
      await adminService.updateCoupon(coupon.id, { is_active: !coupon.is_active });
      await queryClient.invalidateQueries({ queryKey: ["admin", "coupons"] });
      toast.success(`Coupon ${coupon.code} ${!coupon.is_active ? "activated" : "deactivated"}`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to toggle coupon status");
    }
  };

  const handleDelete = async (coupon: CouponRow) => {
    if (!window.confirm(`Are you sure you want to delete coupon ${coupon.code}?`)) return;
    try {
      await adminService.deleteCoupon(coupon.id);
      await queryClient.invalidateQueries({ queryKey: ["admin", "coupons"] });
      toast.success(`Coupon ${coupon.code} deleted`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to delete coupon");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.code.trim()) {
      toast.error("Please provide a coupon code");
      return;
    }

    try {
      const payload = {
        code: formData.code.trim().toUpperCase(),
        discount_type: formData.discount_type,
        discountType: formData.discount_type,
        discount_value: Number(formData.discount_value),
        discountValue: Number(formData.discount_value),
        min_amount: Number(formData.min_amount),
        minAmount: Number(formData.min_amount),
        usage_limit: Number(formData.usage_limit),
        usageLimit: Number(formData.usage_limit),
        valid_until: formData.valid_until || null,
        expires_at: formData.valid_until || null,
        is_active: formData.is_active,
        isActive: formData.is_active,
      };

      if (editingCoupon) {
        await adminService.updateCoupon(editingCoupon.id, payload);
        toast.success(`Coupon ${payload.code} updated!`);
      } else {
        await adminService.createCoupon(payload);
        toast.success(`Coupon ${payload.code} created!`);
      }

      await queryClient.invalidateQueries({ queryKey: ["admin", "coupons"] });
      setModalOpen(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save coupon");
    }
  };

  const filteredCoupons = coupons.filter(
    (c) =>
      c.code.toLowerCase().includes(search.toLowerCase()) ||
      c.discount_type.toLowerCase().includes(search.toLowerCase()),
  );

  const totalUsed = coupons.reduce((sum, c) => sum + (c.used_count || 0), 0);
  const activeCount = coupons.filter((c) => c.is_active).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Promotions & Coupons"
        description="Create promotional codes, discount campaigns, and manage membership savings."
        actions={
          <Button onClick={openCreateModal} className="gap-2 rounded-xl shadow-sm">
            <Plus className="size-4" />
            Create Coupon
          </Button>
        }
      />

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Active Coupons</p>
            <p className="mt-1 text-2xl font-bold text-foreground">{activeCount} / {coupons.length}</p>
          </div>
          <div className="flex size-11 items-center justify-center rounded-xl bg-primary-soft text-primary">
            <Tag className="size-5" />
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Redemptions</p>
            <p className="mt-1 text-2xl font-bold text-foreground">{totalUsed}</p>
          </div>
          <div className="flex size-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
            <TrendingUp className="size-5" />
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Avg. Discount</p>
            <p className="mt-1 text-2xl font-bold text-foreground">
              {coupons.length > 0
                ? `${Math.round(coupons.reduce((sum, c) => sum + (c.discount_type === "percentage" ? c.discount_value : 20), 0) / coupons.length)}%`
                : "0%"}
            </p>
          </div>
          <div className="flex size-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
            <Gift className="size-5" />
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by coupon code or type..."
            className="w-full rounded-xl border border-border bg-card pl-10 pr-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
          />
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <ListSkeleton rows={4} />
      ) : isError ? (
        <ErrorState title="Could not load coupons" onRetry={() => refetch()} />
      ) : filteredCoupons.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center">
          <Tag className="mx-auto size-12 text-muted-foreground/40" />
          <h3 className="mt-3 text-base font-semibold text-foreground">No coupons found</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {search ? "No coupons matched your search query." : "Start by creating your first promotional discount coupon."}
          </p>
          {!search && (
            <Button onClick={openCreateModal} className="mt-4 gap-2">
              <Plus className="size-4" />
              Create Coupon
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCoupons.map((coupon) => {
            const usagePercent = coupon.usage_limit
              ? Math.min(100, Math.round(((coupon.used_count || 0) / coupon.usage_limit) * 100))
              : 0;

            return (
              <div
                key={coupon.id}
                className={`relative overflow-hidden rounded-2xl border bg-card p-5 transition-all shadow-xs ${
                  coupon.is_active ? "border-border hover:border-primary/40" : "border-border/60 opacity-70"
                }`}
              >
                {/* Header ribbon */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-lg font-bold tracking-wider text-primary">
                      {coupon.code}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy(coupon.code)}
                      className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
                      title="Copy code"
                    >
                      {copiedCode === coupon.code ? (
                        <Check className="size-3.5 text-emerald-500" />
                      ) : (
                        <Copy className="size-3.5" />
                      )}
                    </button>
                  </div>
                  <Badge variant={coupon.is_active ? "default" : "secondary"}>
                    {coupon.is_active ? "Active" : "Disabled"}
                  </Badge>
                </div>

                {/* Discount Display */}
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold text-foreground">
                    {coupon.discount_type === "percentage" ? `${coupon.discount_value}%` : `₹${coupon.discount_value}`}
                  </span>
                  <span className="text-sm font-medium text-muted-foreground">OFF</span>
                </div>

                <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                  <p>Min order requirement: <span className="font-medium text-foreground">₹{coupon.min_amount || 0}</span></p>
                  {coupon.expires_at && (
                    <p>
                      Expires: <span className="font-medium text-foreground">{new Date(coupon.expires_at).toLocaleDateString()}</span>
                    </p>
                  )}
                </div>

                {/* Usage meter */}
                <div className="mt-4 border-t border-border/60 pt-3">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-muted-foreground">Usage</span>
                    <span className="font-medium text-foreground">
                      {coupon.used_count || 0} / {coupon.usage_limit || "∞"}
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-300"
                      style={{ width: `${usagePercent}%` }}
                    />
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleToggleActive(coupon)}
                    className="gap-1.5 text-xs text-muted-foreground hover:text-foreground h-8 px-2"
                  >
                    {coupon.is_active ? (
                      <>
                        <ToggleRight className="size-4 text-emerald-500" /> Deactivate
                      </>
                    ) : (
                      <>
                        <ToggleLeft className="size-4 text-muted-foreground" /> Activate
                      </>
                    )}
                  </Button>

                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => openEditModal(coupon)}
                      className="text-xs h-8 px-2.5"
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(coupon)}
                      className="text-xs text-destructive hover:bg-destructive/10 h-8 px-2"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-lg font-semibold text-foreground">
                {editingCoupon ? `Edit Coupon: ${editingCoupon.code}` : "Create New Coupon"}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  Coupon Code
                </label>
                <input
                  type="text"
                  required
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  placeholder="e.g. WELCOME50, FESTIVE100"
                  className="w-full rounded-xl border border-border bg-background px-3.5 py-2 font-mono text-sm uppercase text-foreground focus:border-primary focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                    Discount Type
                  </label>
                  <select
                    value={formData.discount_type}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        discount_type: e.target.value as "percentage" | "fixed",
                      })
                    }
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed Flat (₹)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                    Discount Value
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formData.discount_value}
                    onChange={(e) => setFormData({ ...formData, discount_value: Number(e.target.value) })}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                    Min Order (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.min_amount}
                    onChange={(e) => setFormData({ ...formData, min_amount: Number(e.target.value) })}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                    Usage Limit
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.usage_limit}
                    onChange={(e) => setFormData({ ...formData, usage_limit: Number(e.target.value) })}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  Expiry Date (Optional)
                </label>
                <input
                  type="date"
                  value={formData.valid_until}
                  onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="couponActive"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="size-4 rounded border-border text-primary focus:ring-primary"
                />
                <label htmlFor="couponActive" className="text-sm font-medium text-foreground cursor-pointer">
                  Activate coupon immediately
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-border">
                <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingCoupon ? "Save Changes" : "Create Coupon"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
