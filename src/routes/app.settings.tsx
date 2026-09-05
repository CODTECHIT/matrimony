import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Bell, LogOut, Shield, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";

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
  const [prefs, setPrefs] = useState<Record<string, boolean>>({
    interests: true,
    messages: true,
    matches: false,
    photo: true,
    contact: true,
    online: false,
  });

  const toggle = (id: string) => {
    setPrefs((prev) => ({ ...prev, [id]: !prev[id] }));
    // Backend integration point: PATCH /users/me/preferences
    toast.success("Preference saved");
  };

  const handleSignOut = async () => {
    await signOut();
    void navigate({ to: "/login" });
  };

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
