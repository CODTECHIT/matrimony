import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ExternalLink,
  Eye,
  Image as ImageIcon,
  Link as LinkIcon,
  Plus,
  ToggleLeft,
  ToggleRight,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { ErrorState, ListSkeleton } from "@/components/common/states";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { adminService } from "@/services";
import type { BannerRow } from "@/types";

export const Route = createFileRoute("/admin/matrimony/banners")({
  head: () => ({
    meta: [
      { title: "Banners & Promotions — YFJ Matrimony Admin" },
      { name: "description", content: "Manage website hero banners and promotional marketing campaigns." },
    ],
  }),
  component: AdminBannersPage,
});

function AdminBannersPage() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<BannerRow | null>(null);

  const [formData, setFormData] = useState({
    title: "",
    image_url: "",
    link_url: "",
    position: 0,
    target_audience: "all",
    start_date: "",
    end_date: "",
    is_active: true,
  });
  const [imageInputMode, setImageInputMode] = useState<"upload" | "url">("upload");
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select a valid image file (PNG, JPG, WEBP)");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image file size must be less than 10MB");
      return;
    }

    setIsUploadingImage(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result as string;
        try {
          const res = await adminService.uploadImage(base64, file.name, file.type);
          setFormData((prev) => ({ ...prev, image_url: res.url || base64 }));
          toast.success("Banner image selected successfully!");
        } catch {
          setFormData((prev) => ({ ...prev, image_url: base64 }));
          toast.success("Banner image loaded locally!");
        } finally {
          setIsUploadingImage(false);
        }
      };
      reader.onerror = () => {
        toast.error("Failed to read image file");
        setIsUploadingImage(false);
      };
      reader.readAsDataURL(file);
    } catch {
      setIsUploadingImage(false);
      toast.error("Error reading image file");
    }
  };

  const { data: banners = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["admin", "banners"],
    queryFn: () => adminService.banners(),
  });

  const openCreateModal = () => {
    setEditingBanner(null);
    setFormData({
      title: "",
      image_url: "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&q=80",
      link_url: "/pricing",
      position: banners.length,
      target_audience: "all",
      start_date: "",
      end_date: "",
      is_active: true,
    });
    setModalOpen(true);
  };

  const openEditModal = (banner: BannerRow) => {
    setEditingBanner(banner);
    setFormData({
      title: banner.title,
      image_url: banner.image_url,
      link_url: banner.link_url || "",
      position: banner.position || 0,
      target_audience: banner.target_audience || "all",
      start_date: banner.start_date ? banner.start_date.split("T")[0]! : "",
      end_date: banner.end_date ? banner.end_date.split("T")[0]! : "",
      is_active: banner.is_active,
    });
    setModalOpen(true);
  };

  const handleToggle = async (banner: BannerRow) => {
    try {
      await adminService.updateBanner(banner.id, { is_active: !banner.is_active });
      await queryClient.invalidateQueries({ queryKey: ["admin", "banners"] });
      toast.success(`Banner "${banner.title}" ${!banner.is_active ? "activated" : "deactivated"}`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to toggle banner");
    }
  };

  const handleDelete = async (banner: BannerRow) => {
    if (!window.confirm(`Delete banner "${banner.title}"?`)) return;
    try {
      await adminService.deleteBanner(banner.id);
      await queryClient.invalidateQueries({ queryKey: ["admin", "banners"] });
      toast.success(`Banner removed`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to delete banner");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.image_url.trim()) {
      toast.error("Please provide both banner title and image URL");
      return;
    }

    try {
      const payload = {
        title: formData.title.trim(),
        image_url: formData.image_url.trim(),
        imageUrl: formData.image_url.trim(),
        link_url: formData.link_url.trim() || null,
        buttonLink: formData.link_url.trim() || null,
        position: Number(formData.position),
        target_audience: formData.target_audience,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null,
        is_active: formData.is_active,
        isActive: formData.is_active,
      };

      if (editingBanner) {
        await adminService.updateBanner(editingBanner.id, payload);
        toast.success(`Banner "${payload.title}" updated`);
      } else {
        await adminService.createBanner(payload);
        toast.success(`Banner "${payload.title}" created`);
      }

      await queryClient.invalidateQueries({ queryKey: ["admin", "banners"] });
      setModalOpen(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save banner");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Promotional Banners"
        description="Configure dynamic hero promo banners, special event announcements, and app highlights."
        actions={
          <Button onClick={openCreateModal} className="gap-2 rounded-xl">
            <Plus className="size-4" />
            Add Banner
          </Button>
        }
      />

      {/* Banner Cards */}
      {isLoading ? (
        <ListSkeleton rows={3} />
      ) : isError ? (
        <ErrorState title="Could not load banners" onRetry={() => { void refetch(); }} />
      ) : banners.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center">
          <ImageIcon className="mx-auto size-12 text-muted-foreground/40" />
          <h3 className="mt-3 text-base font-semibold text-foreground">No active banners</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Create promotional banners to highlight sales or community announcements.
          </p>
          <Button onClick={openCreateModal} className="mt-4 gap-2">
            <Plus className="size-4" />
            Add Banner
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {banners.map((banner) => (
            <div
              key={banner.id}
              className={`group overflow-hidden rounded-2xl border bg-card shadow-xs transition-all ${
                banner.is_active ? "border-border hover:shadow-md" : "border-border/60 opacity-60"
              }`}
            >
              {/* Image Preview Container */}
              <div className="relative aspect-21/9 w-full overflow-hidden bg-muted">
                <img
                  src={banner.image_url}
                  alt={banner.title}
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-102"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&q=80";
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between">
                  <h4 className="text-base font-bold text-white drop-shadow-sm">{banner.title}</h4>
                  <Badge
                    variant={banner.is_active ? "default" : "secondary"}
                    className="shrink-0 bg-white/90 text-foreground backdrop-blur-xs"
                  >
                    {banner.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </div>

              {/* Banner Details & Meta */}
              <div className="p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <span>Audience: <strong className="text-foreground capitalize">{banner.target_audience || "all"}</strong></span>
                    <span>•</span>
                    <span>Order: <strong className="text-foreground">#{banner.position}</strong></span>
                  </div>
                  {banner.link_url && (
                    <a
                      href={banner.link_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-primary hover:underline"
                    >
                      <ExternalLink className="size-3" />
                      <span>{banner.link_url}</span>
                    </a>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between border-t border-border/60 pt-3">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleToggle(banner)}
                    className="gap-1.5 text-xs h-8 px-2"
                  >
                    {banner.is_active ? (
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
                      onClick={() => openEditModal(banner)}
                      className="text-xs h-8 px-2.5"
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(banner)}
                      className="text-xs text-destructive hover:bg-destructive/10 h-8 px-2"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-lg font-semibold text-foreground">
                {editingBanner ? "Edit Promotional Banner" : "New Promotional Banner"}
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
                  Banner Title
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Find Your Life Partner - Festive Discount 50% Off"
                  className="w-full rounded-xl border border-border bg-background px-3.5 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Banner Graphic
                  </label>
                  <div className="flex rounded-lg border border-border p-0.5 bg-muted/40 text-xs">
                    <button
                      type="button"
                      onClick={() => setImageInputMode("upload")}
                      className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer flex items-center gap-1 ${
                        imageInputMode === "upload"
                          ? "bg-background text-foreground shadow-xs"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Upload className="size-3" /> Direct Upload
                    </button>
                    <button
                      type="button"
                      onClick={() => setImageInputMode("url")}
                      className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer flex items-center gap-1 ${
                        imageInputMode === "url"
                          ? "bg-background text-foreground shadow-xs"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <LinkIcon className="size-3" /> Image URL
                    </button>
                  </div>
                </div>

                {imageInputMode === "upload" ? (
                  <div>
                    <label className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border hover:border-primary/60 bg-muted/20 hover:bg-muted/40 p-4 transition-colors cursor-pointer text-center">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleFileSelect}
                        disabled={isUploadingImage}
                      />
                      <Upload className="size-6 text-primary mb-1.5" />
                      <p className="text-xs font-semibold text-foreground">
                        {isUploadingImage ? "Uploading & processing image…" : "Click to choose banner image from device"}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Direct upload · JPG, PNG, WEBP (landscape recommended)
                      </p>
                    </label>
                  </div>
                ) : (
                  <input
                    type="url"
                    value={formData.image_url}
                    onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                    placeholder="https://..."
                    className="w-full rounded-xl border border-border bg-background px-3.5 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                  />
                )}

                {/* Banner Live Preview */}
                {formData.image_url && (
                  <div className="mt-2.5 relative aspect-21/9 w-full overflow-hidden rounded-xl border border-border bg-muted group">
                    <img
                      src={formData.image_url}
                      alt="Banner Preview"
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&q=80";
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, image_url: "" })}
                      className="absolute top-2 right-2 rounded-full bg-black/70 p-1 text-white hover:bg-black transition-colors"
                      title="Remove image"
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                    Destination URL
                  </label>
                  <input
                    type="text"
                    value={formData.link_url}
                    onChange={(e) => setFormData({ ...formData, link_url: e.target.value })}
                    placeholder="/pricing or /app/matches"
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                    Display Order
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.position}
                    onChange={(e) => setFormData({ ...formData, position: Number(e.target.value) })}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                    Target Audience
                  </label>
                  <select
                    value={formData.target_audience}
                    onChange={(e) => setFormData({ ...formData, target_audience: e.target.value })}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                  >
                    <option value="all">All Visitors & Members</option>
                    <option value="free">Free Members Only</option>
                    <option value="verified">Verified Members</option>
                  </select>
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <input
                    type="checkbox"
                    id="bannerActive"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="size-4 rounded border-border text-primary focus:ring-primary"
                  />
                  <label htmlFor="bannerActive" className="text-sm font-medium text-foreground cursor-pointer">
                    Active immediately
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-border">
                <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingBanner ? "Save Changes" : "Create Banner"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
