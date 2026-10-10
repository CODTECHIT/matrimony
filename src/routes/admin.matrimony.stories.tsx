import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Calendar,
  Heart,
  Link as LinkIcon,
  Plus,
  Quote,
  Sparkles,
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
import type { SuccessStoryRow } from "@/types";

export const Route = createFileRoute("/admin/matrimony/stories")({
  head: () => ({
    meta: [
      { title: "Success Stories — YFJ Matrimony Admin" },
      { name: "description", content: "Moderate and publish member wedding stories and testimonials." },
    ],
  }),
  component: AdminSuccessStoriesPage,
});

function AdminSuccessStoriesPage() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingStory, setEditingStory] = useState<SuccessStoryRow | null>(null);

  const [formData, setFormData] = useState({
    couple_name: "",
    marriage_date: "",
    story: "",
    photo_url: "",
    is_published: true,
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
          setFormData((prev) => ({ ...prev, photo_url: res.url || base64 }));
          toast.success("Image selected successfully!");
        } catch {
          setFormData((prev) => ({ ...prev, photo_url: base64 }));
          toast.success("Image loaded locally!");
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
      toast.error("Error reading file");
    }
  };

  const { data: stories = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["admin", "success-stories"],
    queryFn: () => adminService.successStories(),
  });

  const openCreateModal = () => {
    setEditingStory(null);
    setFormData({
      couple_name: "",
      marriage_date: new Date().toISOString().split("T")[0]!,
      story: "",
      photo_url: "https://images.unsplash.com/photo-1583939003579-730e3918a45a?auto=format&fit=crop&w=800&q=80",
      is_published: true,
    });
    setModalOpen(true);
  };

  const openEditModal = (story: SuccessStoryRow) => {
    setEditingStory(story);
    setFormData({
      couple_name: story.couple_name,
      marriage_date: story.marriage_date ? story.marriage_date.split("T")[0]! : "",
      story: story.story,
      photo_url: story.photo_url || "",
      is_published: story.is_published,
    });
    setModalOpen(true);
  };

  const handleToggle = async (story: SuccessStoryRow) => {
    try {
      await adminService.updateSuccessStory(story.id, { is_published: !story.is_published });
      await queryClient.invalidateQueries({ queryKey: ["admin", "success-stories"] });
      toast.success(`Story for "${story.couple_name}" ${!story.is_published ? "published" : "unpublished"}`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to toggle story status");
    }
  };

  const handleDelete = async (story: SuccessStoryRow) => {
    if (!window.confirm(`Delete success story for "${story.couple_name}"?`)) return;
    try {
      await adminService.deleteSuccessStory(story.id);
      await queryClient.invalidateQueries({ queryKey: ["admin", "success-stories"] });
      toast.success("Success story deleted");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to delete story");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.couple_name.trim() || !formData.story.trim()) {
      toast.error("Please provide both couple names and the story testimonial");
      return;
    }

    try {
      const payload = {
        couple_name: formData.couple_name.trim(),
        coupleName: formData.couple_name.trim(),
        marriage_date: formData.marriage_date || null,
        marriageDate: formData.marriage_date || null,
        story: formData.story.trim(),
        photo_url: formData.photo_url.trim() || null,
        photoUrl: formData.photo_url.trim() || null,
        is_published: formData.is_published,
        isPublished: formData.is_published,
      };

      if (editingStory) {
        await adminService.updateSuccessStory(editingStory.id, payload);
        toast.success(`Story for "${payload.couple_name}" updated`);
      } else {
        await adminService.createSuccessStory(payload);
        toast.success(`Story for "${payload.couple_name}" created`);
      }

      await queryClient.invalidateQueries({ queryKey: ["admin", "success-stories"] });
      setModalOpen(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save story");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Success Stories"
        description="Share inspiring wedding journeys, celebrate happy couples, and build community trust."
        actions={
          <Button onClick={openCreateModal} className="gap-2 rounded-xl">
            <Plus className="size-4" />
            Add Story
          </Button>
        }
      />

      {/* Grid of stories */}
      {isLoading ? (
        <ListSkeleton rows={3} />
      ) : isError ? (
        <ErrorState title="Could not load success stories" onRetry={() => refetch()} />
      ) : stories.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center">
          <Heart className="mx-auto size-12 text-muted-foreground/40" />
          <h3 className="mt-3 text-base font-semibold text-foreground">No success stories yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Publish member wedding testimonials to inspire singles across the platform.
          </p>
          <Button onClick={openCreateModal} className="mt-4 gap-2">
            <Plus className="size-4" />
            Add Story
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {stories.map((story) => (
            <div
              key={story.id}
              className={`overflow-hidden rounded-2xl border bg-card shadow-xs transition-all flex flex-col justify-between ${
                story.is_published ? "border-border hover:shadow-md" : "border-border/60 opacity-70"
              }`}
            >
              <div>
                {/* Photo Header */}
                <div className="relative aspect-16/10 w-full overflow-hidden bg-muted">
                  <img
                    src={story.photo_url || "https://images.unsplash.com/photo-1583939003579-730e3918a45a?auto=format&fit=crop&w=800&q=80"}
                    alt={story.couple_name}
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        "https://images.unsplash.com/photo-1583939003579-730e3918a45a?auto=format&fit=crop&w=800&q=80";
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                  <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between">
                    <div>
                      <h4 className="text-base font-bold text-white drop-shadow-sm">{story.couple_name}</h4>
                      {story.marriage_date && (
                        <p className="text-xs text-white/80 flex items-center gap-1 mt-0.5">
                          <Calendar className="size-3" />
                          <span>{new Date(story.marriage_date).toLocaleDateString()}</span>
                        </p>
                      )}
                    </div>
                    <Badge
                      variant={story.is_published ? "default" : "secondary"}
                      className="shrink-0 bg-white/90 text-foreground"
                    >
                      {story.is_published ? "Published" : "Draft"}
                    </Badge>
                  </div>
                </div>

                {/* Testimonial Snippet */}
                <div className="p-4 space-y-3">
                  <div className="relative pl-6 text-xs text-muted-foreground leading-relaxed italic">
                    <Quote className="absolute left-0 top-0 size-4 text-primary/40 not-italic" />
                    <p className="line-clamp-4">{story.story}</p>
                  </div>
                </div>
              </div>

              {/* Action Footer */}
              <div className="p-4 pt-0 border-t border-border/60 mt-2 flex items-center justify-between">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleToggle(story)}
                  className="gap-1.5 text-xs h-8 px-2"
                >
                  {story.is_published ? (
                    <>
                      <ToggleRight className="size-4 text-emerald-500" /> Unpublish
                    </>
                  ) : (
                    <>
                      <ToggleLeft className="size-4 text-muted-foreground" /> Publish
                    </>
                  )}
                </Button>

                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => openEditModal(story)}
                    className="text-xs h-8 px-2.5"
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDelete(story)}
                    className="text-xs text-destructive hover:bg-destructive/10 h-8 px-2"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
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
                {editingStory ? `Edit Story: ${editingStory.couple_name}` : "Add Couple Success Story"}
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
                  Couple Names
                </label>
                <input
                  type="text"
                  required
                  value={formData.couple_name}
                  onChange={(e) => setFormData({ ...formData, couple_name: e.target.value })}
                  placeholder="e.g. Vikram Sharma & Ananya Joshi"
                  className="w-full rounded-xl border border-border bg-background px-3.5 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  Wedding / Marriage Date
                </label>
                <input
                  type="date"
                  value={formData.marriage_date}
                  onChange={(e) => setFormData({ ...formData, marriage_date: e.target.value })}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Couple Photo
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
                        {isUploadingImage ? "Uploading & processing image…" : "Click to choose photo from device"}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Direct upload · JPG, PNG, WEBP (up to 10MB)
                      </p>
                    </label>
                  </div>
                ) : (
                  <input
                    type="url"
                    value={formData.photo_url}
                    onChange={(e) => setFormData({ ...formData, photo_url: e.target.value })}
                    placeholder="https://..."
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                  />
                )}

                {/* Live Preview Box */}
                {formData.photo_url && (
                  <div className="mt-2.5 relative aspect-16/9 w-full overflow-hidden rounded-xl border border-border bg-muted group">
                    <img
                      src={formData.photo_url}
                      alt="Story preview"
                      className="h-full w-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, photo_url: "" })}
                      className="absolute top-2 right-2 rounded-full bg-black/70 p-1 text-white hover:bg-black transition-colors"
                      title="Remove image"
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  Story Testimonial
                </label>
                <textarea
                  required
                  rows={5}
                  value={formData.story}
                  onChange={(e) => setFormData({ ...formData, story: e.target.value })}
                  placeholder="How did they meet? Share details of their connection on YFJ Matrimony, their first conversation, and advice for fellow members..."
                  className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="storyPublished"
                  checked={formData.is_published}
                  onChange={(e) => setFormData({ ...formData, is_published: e.target.checked })}
                  className="size-4 rounded border-border text-primary focus:ring-primary"
                />
                <label htmlFor="storyPublished" className="text-sm font-medium text-foreground cursor-pointer">
                  Publish to matrimony homepage & stories gallery immediately
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-border">
                <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingStory ? "Save Changes" : "Create Story"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
