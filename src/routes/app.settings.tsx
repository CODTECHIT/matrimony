import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  BadgeCheck,
  Bell,
  Clock,
  FileCheck2,
  LogOut,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { authService, profilesService } from "@/services";

export const Route = createFileRoute("/app/settings")({
  head: () => ({
    meta: [
      { title: "Settings — YFJ Matrimony" },
      {
        name: "description",
        content: "Manage notifications, privacy preferences and your YFJ Matrimony account.",
      },
      { property: "og:title", content: "Settings — YFJ Matrimony" },
      { property: "og:description", content: "Notification and privacy preferences." },
    ],
  }),
  component: SettingsPage,
});

const notificationToggles = [
  {
    id: "interests",
    label: "New interests",
    description: "Email me when someone sends an interest.",
  },
  { id: "messages", label: "Messages", description: "Notify me about new chat messages." },
  { id: "matches", label: "Daily matches", description: "Send a daily digest of new matches." },
];

const privacyToggles = [
  {
    id: "photo",
    label: "Photo visibility",
    description: "Show my photos to premium members only.",
  },
  {
    id: "contact",
    label: "Contact privacy",
    description: "Hide my number until I accept an interest.",
  },
  { id: "online", label: "Online status", description: "Show when I was last active." },
];

function SettingsPage() {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const preferencesQuery = useQuery({
    queryKey: ["preferences"],
    queryFn: () => authService.getPreferences(),
  });

  const [prefs, setPrefs] = useState<Record<string, boolean>>({
    interests: true,
    messages: true,
    matches: false,
    photo: false,
    contact: true,
    online: true,
  });

  const [verifyModalOpen, setVerifyModalOpen] = useState(false);
  const [isSubmittingId, setIsSubmittingId] = useState(false);
  const [idForm, setIdForm] = useState({
    documentType: "aadhaar",
    documentNumber: "",
    documentFrontUrl: "",
    documentBackUrl: "",
    selfieUrl: "",
  });

  const verificationQuery = useQuery({
    queryKey: ["my", "verification"],
    queryFn: () => profilesService.getVerificationStatus(),
  });

  useEffect(() => {
    if (preferencesQuery.data) {
      setPrefs(preferencesQuery.data);
    }
  }, [preferencesQuery.data]);

  const mutation = useMutation({
    mutationFn: (nextPrefs: Record<string, boolean>) => authService.updatePreferences(nextPrefs),
    onSuccess: (data) => {
      queryClient.setQueryData(["preferences"], data);
      toast.success("Preferences saved");
    },
    onError: () => {
      toast.error("Could not save preferences");
    },
  });

  const toggle = (id: string) => {
    const nextVal = !prefs[id];
    const updated = { ...prefs, [id]: nextVal };
    setPrefs(updated);
    mutation.mutate(updated);
  };

  const handleSignOut = async () => {
    await signOut();
    void navigate({ to: "/login" });
  };

  const handleIdFileUpload = (
    field: "documentFrontUrl" | "documentBackUrl" | "selfieUrl",
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size must be under 10MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setIdForm((prev) => ({ ...prev, [field]: reader.result as string }));
      toast.success("Document photo selected");
    };
    reader.onerror = () => toast.error("Failed to read document photo");
    reader.readAsDataURL(file);
  };

  const handleIdSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!idForm.documentFrontUrl) {
      toast.error("Please provide the front photo of your Government ID");
      return;
    }
    setIsSubmittingId(true);
    try {
      await profilesService.submitIdVerification(idForm);
      await queryClient.invalidateQueries({ queryKey: ["my", "verification"] });
      toast.success("ID submitted! Our Trust & Safety team will review it within 24 hours.");
      setVerifyModalOpen(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to submit ID verification");
    } finally {
      setIsSubmittingId(false);
    }
  };

  const currentVerification = verificationQuery.data?.verification;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Account"
        title="Settings"
        description="Control how you are notified and what others can see."
      />

      <section className="rounded-3xl border border-border bg-card p-5 shadow-card">
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
          <Bell className="size-4 text-primary" /> Notifications
        </h2>
        <div className="mt-4 space-y-4">
          {notificationToggles.map((item) => (
            <div key={item.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
              <div className="min-w-0">
                <Label htmlFor={`pref-${item.id}`}>{item.label}</Label>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </div>
              <Switch
                id={`pref-${item.id}`}
                checked={prefs[item.id] ?? false}
                onCheckedChange={() => toggle(item.id)}
              />
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-border bg-card p-5 shadow-card">
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
          <Shield className="size-4 text-primary" /> Privacy
        </h2>
        <div className="mt-4 space-y-4">
          {privacyToggles.map((item) => (
            <div key={item.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
              <div className="min-w-0">
                <Label htmlFor={`pref-${item.id}`}>{item.label}</Label>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </div>
              <Switch
                id={`pref-${item.id}`}
                checked={prefs[item.id] ?? false}
                onCheckedChange={() => toggle(item.id)}
              />
            </div>
          ))}
        </div>
      </section>

      {/* Identity Verification Section */}
      <section className="rounded-3xl border border-border bg-card p-5 shadow-card">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-foreground">
              <ShieldCheck className="size-5 text-primary" /> Government ID Verification
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Verify your Aadhaar, Passport, or Government ID to earn the prestigious{" "}
              <strong className="text-foreground">Verified Badge</strong> and boost match interest
              up to 5x.
            </p>
          </div>
          {currentVerification?.status === "approved" ? (
            <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-400/40 gap-1.5 px-3 py-1 text-xs">
              <BadgeCheck className="size-3.5 text-emerald-600" /> Verified Member
            </Badge>
          ) : currentVerification?.status === "pending" ? (
            <Badge variant="outline" className="bg-amber-500/10 text-amber-700 border-amber-400/40 gap-1.5 px-3 py-1 text-xs">
              <Clock className="size-3.5 text-amber-600" /> In Review Queue
            </Badge>
          ) : currentVerification?.status === "rejected" ? (
            <Badge variant="destructive" className="gap-1.5 px-3 py-1 text-xs">
              <ShieldAlert className="size-3.5" /> Needs Attention
            </Badge>
          ) : (
            <Badge variant="secondary" className="gap-1.5 px-3 py-1 text-xs">
              Not Verified
            </Badge>
          )}
        </div>

        <div className="mt-4 rounded-2xl bg-muted/40 p-4 border border-border/60">
          {currentVerification?.status === "approved" ? (
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-emerald-500/20 p-2 text-emerald-600">
                <FileCheck2 className="size-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Identity Verified</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Your document ({currentVerification.document_type?.toUpperCase()}) was verified
                  by admin. The verified shield badge is displayed on your public profile.
                </p>
              </div>
            </div>
          ) : currentVerification?.status === "pending" ? (
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-amber-500/20 p-2 text-amber-600">
                  <Clock className="size-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Document Under Review</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Your {currentVerification.document_type?.toUpperCase()} is currently in the
                    Admin Verification Queue. You will receive an instant notification once
                    reviewed.
                  </p>
                </div>
              </div>
            </div>
          ) : currentVerification?.status === "rejected" ? (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-destructive/15 p-2 text-destructive">
                  <ShieldAlert className="size-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-destructive">Verification Rejected</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Reason: {currentVerification.rejection_reason || "Document details mismatch"}.
                    Please re-upload a clear copy.
                  </p>
                </div>
              </div>
              <Button size="sm" onClick={() => setVerifyModalOpen(true)}>
                Re-submit Documents
              </Button>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-primary/10 p-2 text-primary">
                  <ShieldCheck className="size-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Protect Your Matches & Build Trust</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Government ID documents are strictly encrypted and reviewed by authorized
                    moderators only.
                  </p>
                </div>
              </div>
              <Button size="sm" onClick={() => setVerifyModalOpen(true)} className="gap-1.5 shrink-0">
                <Upload className="size-4" /> Submit ID Proof
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* Verification Upload Modal */}
      {verifyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-lg rounded-3xl border border-border bg-card p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-display text-lg font-bold text-foreground flex items-center gap-2">
                <ShieldCheck className="size-5 text-primary" /> Submit Government ID Proof
              </h3>
              <button
                type="button"
                onClick={() => setVerifyModalOpen(false)}
                className="rounded-full p-1 text-muted-foreground hover:bg-muted cursor-pointer"
              >
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={handleIdSubmit} className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                    Document Type
                  </label>
                  <select
                    value={idForm.documentType}
                    onChange={(e) => setIdForm({ ...idForm, documentType: e.target.value })}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none cursor-pointer"
                  >
                    <option value="aadhaar">Aadhaar Card</option>
                    <option value="passport">Passport</option>
                    <option value="driving_license">Driving License</option>
                    <option value="voter_id">Voter ID</option>
                    <option value="pan">PAN Card</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                    Document ID Number (Optional)
                  </label>
                  <input
                    type="text"
                    value={idForm.documentNumber}
                    onChange={(e) => setIdForm({ ...idForm, documentNumber: e.target.value })}
                    placeholder="e.g. XXXX-XXXX-4921"
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              {/* Front Photo */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  Document Front Photo <span className="text-destructive">*</span>
                </label>
                <label className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border hover:border-primary/60 bg-muted/20 hover:bg-muted/40 p-4 transition-colors cursor-pointer text-center">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleIdFileUpload("documentFrontUrl", e)}
                  />
                  <Upload className="size-6 text-primary mb-1" />
                  <p className="text-xs font-semibold text-foreground">
                    Upload clear photo of ID front
                  </p>
                  <p className="text-[11px] text-muted-foreground">JPG, PNG up to 10MB</p>
                </label>
                {idForm.documentFrontUrl && (
                  <div className="mt-2 relative aspect-16/10 w-full overflow-hidden rounded-xl border border-border bg-muted">
                    <img
                      src={idForm.documentFrontUrl}
                      alt="Front preview"
                      className="h-full w-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setIdForm({ ...idForm, documentFrontUrl: "" })}
                      className="absolute top-2 right-2 rounded-full bg-black/70 p-1 text-white hover:bg-black"
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {/* Back Photo (Optional) */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  Document Back Photo (Optional)
                </label>
                <label className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border hover:border-primary/60 bg-muted/20 hover:bg-muted/40 p-3 transition-colors cursor-pointer text-center">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleIdFileUpload("documentBackUrl", e)}
                  />
                  <Upload className="size-5 text-muted-foreground mb-1" />
                  <p className="text-xs font-medium text-foreground">Upload photo of ID back</p>
                </label>
                {idForm.documentBackUrl && (
                  <div className="mt-2 relative aspect-16/10 w-full overflow-hidden rounded-xl border border-border bg-muted">
                    <img
                      src={idForm.documentBackUrl}
                      alt="Back preview"
                      className="h-full w-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setIdForm({ ...idForm, documentBackUrl: "" })}
                      className="absolute top-2 right-2 rounded-full bg-black/70 p-1 text-white hover:bg-black"
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>
                )}
              </div>

              <div className="rounded-xl bg-amber-500/10 border border-amber-400/30 p-3 text-xs text-amber-900 dark:text-amber-300">
                🔒 Your document is encrypted and reviewed strictly for identity verification. It will
                never be displayed publicly to other members.
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setVerifyModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmittingId || !idForm.documentFrontUrl}>
                  {isSubmittingId ? "Submitting…" : "Submit for Verification"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <section className="rounded-3xl border border-border bg-card p-5 shadow-card">
        <h2 className="font-display text-lg font-semibold">Account</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button asChild variant="neutral">
            <Link to="/app/subscription">Manage membership</Link>
          </Button>
          <Button variant="neutral" onClick={handleSignOut}>
            <LogOut /> Sign out
          </Button>
          <Button
            variant="destructive"
            onClick={() =>
              toast.info("Account deletion is handled by our support team for your safety.")
            }
          >
            <Trash2 /> Delete account
          </Button>
        </div>
      </section>
    </div>
  );
}
