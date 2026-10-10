import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Clock,
  Eye,
  FileEdit,
  FileText,
  Plus,
  Save,
  ShieldCheck,
  Trash2,
  UserCheck,
  X,
} from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { ErrorState, ListSkeleton } from "@/components/common/states";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { adminService } from "@/services";
import type { SiteContentRow } from "@/types";

export const Route = createFileRoute("/admin/matrimony/content")({
  head: () => ({
    meta: [
      { title: "CMS & Content — YFJ Matrimony Admin" },
      { name: "description", content: "Manage website policy pages, legal guidelines, and public content." },
    ],
  }),
  component: AdminContentPage,
});

function AdminContentPage() {
  const queryClient = useQueryClient();
  const [selectedKey, setSelectedKey] = useState<string>("terms");
  const [title, setTitle] = useState("");
  const [bodyText, setBodyText] = useState("");
  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit");
  const [saving, setSaving] = useState(false);

  // Create page modal state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newKey, setNewKey] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newBody, setNewBody] = useState("");
  const [creating, setCreating] = useState(false);

  const { data: pages = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["admin", "content"],
    queryFn: () => adminService.contentPages(),
  });

  const selectedPage = pages.find((p) => p.key === selectedKey) || pages[0];

  useEffect(() => {
    if (selectedPage) {
      setSelectedKey(selectedPage.key);
      setTitle(selectedPage.title);
      setBodyText(
        typeof selectedPage.content === "object" && selectedPage.content?.body
          ? String(selectedPage.content.body)
          : JSON.stringify(selectedPage.content, null, 2),
      );
    }
  }, [selectedPage?.key, selectedPage]);

  const handleSelectPage = (page: SiteContentRow) => {
    setSelectedKey(page.key);
    setTitle(page.title);
    setBodyText(
      typeof page.content === "object" && page.content?.body
        ? String(page.content.body)
        : JSON.stringify(page.content, null, 2),
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !bodyText.trim()) {
      toast.error("Title and page body cannot be empty");
      return;
    }

    setSaving(true);
    try {
      await adminService.saveContentPage(selectedKey, title.trim(), {
        body: bodyText.trim(),
        lastUpdated: new Date().toISOString(),
      });
      await queryClient.invalidateQueries({ queryKey: ["admin", "content"] });
      toast.success(`Page "${title}" saved successfully!`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save CMS page");
    } finally {
      setSaving(false);
    }
  };

  const handleCreateDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanKey = newKey.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "-");
    if (!cleanKey || !newTitle.trim()) {
      toast.error("Document slug and title are required");
      return;
    }

    setCreating(true);
    try {
      await adminService.saveContentPage(cleanKey, newTitle.trim(), {
        body: newBody.trim() || `# ${newTitle.trim()}\n\nContent coming soon...`,
        lastUpdated: new Date().toISOString(),
      });
      await queryClient.invalidateQueries({ queryKey: ["admin", "content"] });
      setSelectedKey(cleanKey);
      setTitle(newTitle.trim());
      setBodyText(newBody.trim() || `# ${newTitle.trim()}\n\nContent coming soon...`);
      setCreateModalOpen(false);
      setNewKey("");
      setNewTitle("");
      setNewBody("");
      toast.success(`Page "${newTitle.trim()}" created!`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to create document");
    } finally {
      setCreating(false);
    }
  };

  const handleDeletePage = async () => {
    if (!selectedKey) return;
    if (!window.confirm(`Are you sure you want to delete the "/${selectedKey}" document?`)) return;

    try {
      await adminService.deleteContentPage(selectedKey);
      await queryClient.invalidateQueries({ queryKey: ["admin", "content"] });
      toast.success(`Page "/${selectedKey}" deleted`);
      const remaining = pages.filter((p) => p.key !== selectedKey);
      if (remaining.length > 0) {
        handleSelectPage(remaining[0]!);
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to delete page");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="CMS & Policy Pages"
        description="Draft, update, and manage official matrimony policies, terms of service, and public member documentation."
        actions={
          <Button onClick={() => setCreateModalOpen(true)} className="gap-2 rounded-xl">
            <Plus className="size-4" />
            New Document
          </Button>
        }
      />

      {/* Create New Document Modal */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="max-w-md rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Create New CMS Document</DialogTitle>
            <DialogDescription>
              Add a new official content page or policy guideline for members.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateDocument} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="doc-slug">Document Slug (URL path)</Label>
              <div className="flex items-center rounded-xl border border-input bg-muted/30 px-3">
                <span className="text-xs text-muted-foreground select-none">/</span>
                <Input
                  id="doc-slug"
                  value={newKey}
                  onChange={(e) => setNewKey(e.target.value)}
                  placeholder="safety-tips"
                  required
                  className="border-0 bg-transparent shadow-none focus-visible:ring-0 text-sm"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="doc-title">Document Title</Label>
              <Input
                id="doc-title"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Safety & Verification Tips"
                required
                className="h-10 rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="doc-body">Initial Body (Markdown / Plain Text)</Label>
              <textarea
                id="doc-body"
                rows={5}
                value={newBody}
                onChange={(e) => setNewBody(e.target.value)}
                placeholder="Write initial policy clauses or guidelines..."
                className="w-full rounded-xl border border-input bg-background p-3 text-xs font-mono focus:border-primary focus:outline-none"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setCreateModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={creating}>
                {creating ? "Creating..." : "Create Document"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {isLoading ? (
        <ListSkeleton rows={3} />
      ) : isError ? (
        <ErrorState title="Could not load CMS content" onRetry={() => { void refetch(); }} />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Sidebar: Pages List */}
          <div className="lg:col-span-4 space-y-2">
            <div className="rounded-2xl border border-border bg-card p-4 shadow-xs">
              <div className="flex items-center justify-between mb-3 px-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Published CMS Documents
                </p>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setCreateModalOpen(true)}
                  className="h-6 px-2 text-[11px] gap-1 text-primary"
                >
                  <Plus className="size-3" /> Add
                </Button>
              </div>
              <div className="space-y-1.5">
                {pages.map((p) => {
                  const isSelected = p.key === selectedKey;
                  return (
                    <button
                      key={p.key}
                      type="button"
                      onClick={() => handleSelectPage(p)}
                      className={`w-full flex items-center justify-between rounded-xl px-3 py-2.5 text-xs font-medium text-left transition-all cursor-pointer ${
                        isSelected
                          ? "bg-primary-soft text-primary font-semibold shadow-xs"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <FileText className="size-4 shrink-0" />
                        <span className="truncate">{p.title}</span>
                      </div>
                      <Badge variant="outline" className="text-[10px] uppercase font-mono px-1.5 py-0 shrink-0">
                        /{p.key}
                      </Badge>
                    </button>
                  );
                })}
              </div>
            </div>

            {selectedPage && (
              <div className="rounded-2xl border border-border bg-card p-4 text-xs text-muted-foreground shadow-xs space-y-2">
                <div className="flex items-center gap-1.5 font-medium text-foreground">
                  <Clock className="size-3.5" />
                  <span>Document Details</span>
                </div>
                <p>Slug: <strong className="text-foreground">/{selectedPage.key}</strong></p>
                <p>Last edited by: <strong className="text-foreground">{selectedPage.updated_by || "Admin"}</strong></p>
                <p>Updated: <strong className="text-foreground">{new Date(selectedPage.updated_at).toLocaleString()}</strong></p>
              </div>
            )}
          </div>

          {/* Right Area: Page Editor & Live Preview */}
          <div className="lg:col-span-8 rounded-2xl border border-border bg-card p-6 shadow-xs">
            <form onSubmit={handleSave} className="space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-4">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab("edit")}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                      activeTab === "edit"
                        ? "bg-primary-soft text-primary"
                        : "text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    <FileEdit className="size-3.5" />
                    Editor
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("preview")}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                      activeTab === "preview"
                        ? "bg-primary-soft text-primary"
                        : "text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    <Eye className="size-3.5" />
                    Preview
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  {pages.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleDeletePage}
                      className="h-9 text-xs text-destructive hover:bg-destructive/10 gap-1.5"
                    >
                      <Trash2 className="size-3.5" />
                      Delete Page
                    </Button>
                  )}
                  <Button type="submit" disabled={saving} className="gap-2 rounded-xl">
                    <Save className="size-4" />
                    {saving ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  Document Title
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Document Title"
                  className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm font-semibold text-foreground focus:border-primary focus:outline-none"
                />
              </div>

              {activeTab === "edit" ? (
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                    Document Body (Markdown / Plain Text)
                  </label>
                  <textarea
                    required
                    rows={16}
                    value={bodyText}
                    onChange={(e) => setBodyText(e.target.value)}
                    placeholder="Write policy clauses, terms, or community rules here..."
                    className="w-full rounded-xl border border-border bg-background p-4 font-mono text-xs text-foreground leading-relaxed focus:border-primary focus:outline-none"
                  />
                </div>
              ) : (
                <div className="rounded-xl border border-border/80 bg-background/50 p-6 min-h-[380px] space-y-4">
                  <h2 className="text-xl font-bold text-foreground border-b border-border pb-2">{title}</h2>
                  <div className="prose prose-sm dark:prose-invert max-w-none text-xs text-foreground/90 whitespace-pre-wrap leading-relaxed">
                    {bodyText}
                  </div>
                </div>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
