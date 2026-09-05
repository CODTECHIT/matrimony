import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2, ShieldCheck, Sparkles, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { adminService } from "@/services";
import type { Plan, PlanTier } from "@/types";

interface PackageEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialPlan?: Plan | null;
}

export function PackageEditorDialog({ open, onOpenChange, initialPlan }: PackageEditorDialogProps) {
  const queryClient = useQueryClient();
  const [isSaving, setIsSaving] = useState(false);

  // Form State
  const [name, setName] = useState("");
  const [tier, setTier] = useState<PlanTier>("silver");
  const [priceInr, setPriceInr] = useState<number>(999);
  const [durationMonths, setDurationMonths] = useState<number>(3);
  const [popular, setPopular] = useState(false);

  // Limitations
  const [profileViews, setProfileViews] = useState("50 / day");
  const [interests, setInterests] = useState("25 / month");
  const [messaging, setMessaging] = useState("Matched members");
  const [contacts, setContacts] = useState("10 / month");

  // Permissions / Access Toggles
  const [canMessage, setCanMessage] = useState(true);
  const [canViewContacts, setCanViewContacts] = useState(true);
  const [canUseAdvancedFilters, setCanUseAdvancedFilters] = useState(false);
  const [profileHighlight, setProfileHighlight] = useState(false);

  // Features list
  const [features, setFeatures] = useState<string[]>([]);
  const [newFeatureText, setNewFeatureText] = useState("");

  useEffect(() => {
    if (initialPlan) {
      setName(initialPlan.name);
      setTier(initialPlan.tier);
      setPriceInr(initialPlan.priceInr);
      setDurationMonths(initialPlan.durationMonths);
      setPopular(initialPlan.popular ?? false);
      setProfileViews(initialPlan.limits?.profileViews || "Unlimited");
      setInterests(initialPlan.limits?.interests || "Unlimited");
      setMessaging(initialPlan.limits?.messaging || "Unlimited");
      setContacts(initialPlan.limits?.contacts || "Unlimited");
      setCanMessage(initialPlan.permissions?.canMessage ?? initialPlan.tier !== "free");
      setCanViewContacts(
        initialPlan.permissions?.canViewContacts ??
          (initialPlan.tier === "gold" || initialPlan.tier === "platinum"),
      );
      setCanUseAdvancedFilters(
        initialPlan.permissions?.canUseAdvancedFilters ?? initialPlan.tier !== "free",
      );
      setProfileHighlight(
        initialPlan.permissions?.profileHighlight ?? initialPlan.tier === "platinum",
      );
      setFeatures(initialPlan.features || []);
    } else {
      // Defaults for a new package
      setName("");
      setTier("silver");
      setPriceInr(999);
      setDurationMonths(3);
      setPopular(false);
      setProfileViews("50 / day");
      setInterests("25 / month");
      setMessaging("Matched members");
      setContacts("10 / month");
      setCanMessage(true);
      setCanViewContacts(false);
      setCanUseAdvancedFilters(true);
      setProfileHighlight(false);
      setFeatures([
        "View up to 50 profiles daily",
        "Send 25 express interests per month",
        "Message verified matches",
        "Advanced community filters",
      ]);
    }
  }, [initialPlan, open]);

  const handleAddFeature = () => {
    if (!newFeatureText.trim()) return;
    setFeatures([...features, newFeatureText.trim()]);
    setNewFeatureText("");
  };

  const handleRemoveFeature = (index: number) => {
    setFeatures(features.filter((_, i) => i !== index));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Package name is required");
      return;
    }

    setIsSaving(true);
    try {
      const payload: Partial<Plan> = {
        ...(initialPlan?.id ? { id: initialPlan.id } : {}),
        name: name.trim(),
        tier,
        priceInr: Number(priceInr),
        durationMonths: Number(durationMonths),
        popular,
        features: features.length > 0 ? features : ["All standard membership features"],
        limits: {
          profileViews: profileViews.trim() || "Unlimited",
          interests: interests.trim() || "Unlimited",
          messaging: messaging.trim() || "Unlimited",
          contacts: contacts.trim() || "Unlimited",
        },
        permissions: {
          canMessage,
          canViewContacts,
          canUseAdvancedFilters,
          profileHighlight,
        },
      };

      await adminService.savePackage(payload);
      await queryClient.invalidateQueries({ queryKey: ["admin", "packages"] });
      await queryClient.invalidateQueries({ queryKey: ["plans"] });

      toast.success(
        initialPlan ? "Package updated successfully" : "New package created successfully",
      );
      onOpenChange(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save package");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl p-6">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <span className="grid size-9 place-items-center rounded-xl bg-primary-soft text-primary">
              <Sparkles className="size-4" />
            </span>
            <div>
              <DialogTitle className="font-display text-xl">
                {initialPlan
                  ? `Edit Package: ${initialPlan.name}`
                  : "Create New Membership Package"}
              </DialogTitle>
              <DialogDescription>
                Configure pricing, membership limitations, and what users can access.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSave} className="space-y-6 pt-2">
          {/* Section 1: Basic Plan Information */}
          <div className="rounded-2xl border border-border bg-muted/30 p-4 space-y-4">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              Basic Package Details
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="pkg-name">Package Name *</Label>
                <Input
                  id="pkg-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Gold Plus, VIP Premium"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="pkg-tier">Plan Tier *</Label>
                <select
                  id="pkg-tier"
                  value={tier}
                  onChange={(e) => setTier(e.target.value as PlanTier)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="free">Free Tier</option>
                  <option value="silver">Silver Tier</option>
                  <option value="gold">Gold Tier</option>
                  <option value="platinum">Platinum Tier</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="pkg-price">Price (₹ INR) *</Label>
                <Input
                  id="pkg-price"
                  type="number"
                  min="0"
                  value={priceInr}
                  onChange={(e) => setPriceInr(Math.max(0, Number(e.target.value)))}
                  placeholder="e.g. 1999"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="pkg-duration">Duration (Months) *</Label>
                <Input
                  id="pkg-duration"
                  type="number"
                  min="1"
                  max="36"
                  value={durationMonths}
                  onChange={(e) => setDurationMonths(Math.max(1, Number(e.target.value)))}
                  placeholder="e.g. 3, 6, 12"
                  required
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-border/60">
              <div>
                <p className="text-sm font-medium text-foreground">Featured / Popular Badge</p>
                <p className="text-xs text-muted-foreground">
                  Highlight this package as 'Most Popular' on the pricing screen
                </p>
              </div>
              <Switch checked={popular} onCheckedChange={setPopular} />
            </div>
          </div>

          {/* Section 2: User Access Limitations */}
          <div className="rounded-2xl border border-border bg-muted/30 p-4 space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground">User Access Limitations</h3>
              <p className="text-xs text-muted-foreground">
                Define the strict usage quotas and limits for members on this plan.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="limit-views">Daily Profile Views</Label>
                <Input
                  id="limit-views"
                  value={profileViews}
                  onChange={(e) => setProfileViews(e.target.value)}
                  placeholder="e.g. 20 / day, 50 / day, Unlimited"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="limit-interests">Monthly Express Interests</Label>
                <Input
                  id="limit-interests"
                  value={interests}
                  onChange={(e) => setInterests(e.target.value)}
                  placeholder="e.g. 15 / month, 50 / month, Unlimited"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="limit-messaging">Direct Messaging Access</Label>
                <Input
                  id="limit-messaging"
                  value={messaging}
                  onChange={(e) => setMessaging(e.target.value)}
                  placeholder="e.g. Not included, Matched members, Everyone"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="limit-contacts">Contact Numbers Unlocked</Label>
                <Input
                  id="limit-contacts"
                  value={contacts}
                  onChange={(e) => setContacts(e.target.value)}
                  placeholder="e.g. Hidden, 15 / month, 30 / month, Unlimited"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Feature Permissions (What should a user access?) */}
          <div className="rounded-2xl border border-border bg-muted/30 p-4 space-y-3">
            <div>
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <ShieldCheck className="size-4 text-primary" /> Feature Permissions
              </h3>
              <p className="text-xs text-muted-foreground">
                Select what specific modules this tier allows members to unlock.
              </p>
            </div>

            <div className="space-y-2.5 pt-1">
              <div className="flex items-center justify-between rounded-xl bg-card p-2.5 border border-border/70">
                <div>
                  <p className="text-sm font-medium">Direct Messaging</p>
                  <p className="text-xs text-muted-foreground">
                    Allows member to chat and send private messages
                  </p>
                </div>
                <Switch checked={canMessage} onCheckedChange={setCanMessage} />
              </div>

              <div className="flex items-center justify-between rounded-xl bg-card p-2.5 border border-border/70">
                <div>
                  <p className="text-sm font-medium">View Contact & WhatsApp Details</p>
                  <p className="text-xs text-muted-foreground">
                    Unlock phone numbers of verified matrimonial profiles
                  </p>
                </div>
                <Switch checked={canViewContacts} onCheckedChange={setCanViewContacts} />
              </div>

              <div className="flex items-center justify-between rounded-xl bg-card p-2.5 border border-border/70">
                <div>
                  <p className="text-sm font-medium">Advanced Search Filters</p>
                  <p className="text-xs text-muted-foreground">
                    Enable filters for caste, horoscope, income bracket and education
                  </p>
                </div>
                <Switch
                  checked={canUseAdvancedFilters}
                  onCheckedChange={setCanUseAdvancedFilters}
                />
              </div>

              <div className="flex items-center justify-between rounded-xl bg-card p-2.5 border border-border/70">
                <div>
                  <p className="text-sm font-medium">Profile Highlight & VIP Boost</p>
                  <p className="text-xs text-muted-foreground">
                    Boost profile placement and show golden badge in search results
                  </p>
                </div>
                <Switch checked={profileHighlight} onCheckedChange={setProfileHighlight} />
              </div>
            </div>
          </div>

          {/* Section 4: Public Highlights / Bullet Features */}
          <div className="rounded-2xl border border-border bg-muted/30 p-4 space-y-3">
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                Bullet Highlights (Pricing Card)
              </h3>
              <p className="text-xs text-muted-foreground">
                Bullet points displayed on the pricing card for users.
              </p>
            </div>

            <div className="flex gap-2">
              <Input
                value={newFeatureText}
                onChange={(e) => setNewFeatureText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddFeature();
                  }
                }}
                placeholder="e.g. 24/7 Relationship Manager support"
                className="flex-1"
              />
              <Button type="button" variant="secondary" onClick={handleAddFeature}>
                <Plus className="size-4 mr-1" /> Add
              </Button>
            </div>

            <ul className="space-y-1.5 max-h-36 overflow-y-auto">
              {features.map((feat, index) => (
                <li
                  key={index}
                  className="flex items-center justify-between rounded-lg bg-card px-3 py-1.5 text-xs border border-border/50"
                >
                  <span className="flex items-center gap-2">
                    <Check className="size-3.5 text-primary shrink-0" />
                    {feat}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveFeature(index)}
                    className="text-muted-foreground hover:text-destructive p-1"
                    aria-label="Remove feature"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Saving…" : initialPlan ? "Update Package" : "Create Package"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
