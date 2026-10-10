import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  Bell,
  BellRing,
  CheckCircle2,
  Clock,
  Filter,
  Megaphone,
  Radio,
  Send,
  ShieldAlert,
  Sparkles,
  Users,
} from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { adminService } from "@/services";

export const Route = createFileRoute("/admin/matrimony/notifications")({
  head: () => ({
    meta: [
      { title: "Broadcast Notifications — YFJ Matrimony Admin" },
      { name: "description", content: "Send announcements and targeted broadcast alerts to members." },
    ],
  }),
  component: AdminNotificationsPage,
});

interface SentCampaign {
  id: string;
  title: string;
  body: string;
  cohort: string;
  type: string;
  recipientCount: number;
  sentAt: string;
}

function AdminNotificationsPage() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [cohort, setCohort] = useState("all");
  const [type, setType] = useState("system");
  const [sending, setSending] = useState(false);

  // Local sent history record
  const [history, setHistory] = useState<SentCampaign[]>([
    {
      id: "bc-1",
      title: "Weekend Match Fest is live!",
      body: "Discover 5x more verified profiles this weekend. Check your recommendations today.",
      cohort: "all",
      type: "promo",
      recipientCount: 42,
      sentAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    },
    {
      id: "bc-2",
      title: "Complete your ID Verification badge",
      body: "Verified profiles receive up to 3x more direct interest requests and priority ranking.",
      cohort: "unverified",
      type: "system",
      recipientCount: 19,
      sentAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    },
  ]);

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) {
      toast.error("Please provide both title and announcement body");
      return;
    }

    setSending(true);
    try {
      const res = await adminService.broadcastNotification({
        title: title.trim(),
        body: body.trim(),
        cohort,
        type,
      });

      const newCampaign: SentCampaign = {
        id: `bc-${Date.now()}`,
        title: title.trim(),
        body: body.trim(),
        cohort,
        type,
        recipientCount: res.recipientCount || 1,
        sentAt: new Date().toISOString(),
      };

      setHistory([newCampaign, ...history]);
      toast.success(`Announcement broadcast successfully to ${res.recipientCount || 0} members!`);
      setTitle("");
      setBody("");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to broadcast notification");
    } finally {
      setSending(false);
    }
  };

  const getCohortLabel = (c: string) => {
    switch (c) {
      case "all":
        return "All Members";
      case "free":
        return "Free Plan Members";
      case "unverified":
        return "Unverified Members";
      case "male":
        return "Male Members";
      case "female":
        return "Female Members";
      case "premium":
        return "Paid Subscribers";
      default:
        return c;
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Broadcast Announcements"
        description="Deliver push announcements, system maintenance warnings, and promotional campaigns."
      />

      {/* Grid: Composer on left, Preview on right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Composer Form */}
        <div className="lg:col-span-7 rounded-2xl border border-border bg-card p-6 shadow-xs">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground mb-4">
            <Megaphone className="size-4 text-primary" />
            <span>Compose Broadcast Announcement</span>
          </div>

          <form onSubmit={handleBroadcast} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                Target Audience Cohort
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  { id: "all", label: "All Members", icon: Users },
                  { id: "free", label: "Free Members", icon: Sparkles },
                  { id: "unverified", label: "Unverified", icon: ShieldAlert },
                  { id: "male", label: "Male Only", icon: Users },
                  { id: "female", label: "Female Only", icon: Users },
                  { id: "premium", label: "Premium VIP", icon: Sparkles },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setCohort(item.id)}
                    className={`flex items-center gap-2 rounded-xl border p-2.5 text-xs font-medium text-left transition-all cursor-pointer ${
                      cohort === item.id
                        ? "border-primary bg-primary-soft text-primary font-semibold shadow-xs"
                        : "border-border bg-background text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    <item.icon className="size-3.5 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  Alert Category
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                >
                  <option value="system">System Announcement</option>
                  <option value="promo">Promotional Offer</option>
                  <option value="security">Safety & Security Alert</option>
                  <option value="match">Match Opportunity</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  Delivery Channel
                </label>
                <div className="flex h-10 items-center gap-2 rounded-xl border border-border bg-muted/40 px-3 text-xs text-muted-foreground">
                  <Radio className="size-3.5 text-emerald-500 animate-pulse" />
                  <span>In-app Notification Feed</span>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                Announcement Title
              </label>
              <input
                type="text"
                required
                maxLength={80}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. 50% Off Platinum Plans this Festive Weekend!"
                className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none"
              />
              <span className="mt-1 block text-right text-[11px] text-muted-foreground">{title.length} / 80</span>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                Announcement Message
              </label>
              <textarea
                required
                rows={4}
                maxLength={300}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Write clear, engaging message text that will be displayed in user notification drawers..."
                className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none"
              />
              <span className="mt-1 block text-right text-[11px] text-muted-foreground">{body.length} / 300</span>
            </div>

            <div className="flex justify-end pt-2">
              <Button type="submit" disabled={sending} className="gap-2 rounded-xl">
                <Send className="size-4" />
                {sending ? "Broadcasting..." : "Send Announcement"}
              </Button>
            </div>
          </form>
        </div>

        {/* Live Preview Panel */}
        <div className="lg:col-span-5 space-y-4">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-xs">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Member In-App Notification Preview
            </p>

            {/* Notification Card Mockup */}
            <div className="rounded-2xl border border-border/80 bg-background p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
                  <Bell className="size-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <p className="text-xs font-bold text-foreground truncate">
                      {title || "Notification Title Preview"}
                    </p>
                    <span className="text-[10px] text-muted-foreground shrink-0">Just now</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                    {body || "This is how your broadcast message preview will appear on user devices."}
                  </p>
                  <div className="mt-2.5 flex items-center gap-2">
                    <Badge variant="secondary" className="text-[10px] py-0 px-1.5 uppercase font-mono">
                      {type}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">Target: {getCohortLabel(cohort)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-xl bg-muted/40 p-3 text-xs text-muted-foreground space-y-1">
              <p className="font-medium text-foreground">Targeting Delivery Summary:</p>
              <p>• Recipients: Filtered dynamically across active members</p>
              <p>• Delivery: Instant WebSocket & database persistent notification</p>
              <p>• Dismissible: Users can mark as read from their notification bell</p>
            </div>
          </div>
        </div>
      </div>

      {/* Broadcast History */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock className="size-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold text-foreground">Recent Broadcast History</h3>
          </div>
          <Badge variant="outline">{history.length} broadcast campaigns</Badge>
        </div>

        <div className="divide-y divide-border/60">
          {history.map((item) => (
            <div key={item.id} className="py-3.5 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-foreground">{item.title}</span>
                  <Badge variant="secondary" className="text-[10px] capitalize">
                    {item.type}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-1">{item.body}</p>
                <div className="flex items-center gap-3 text-[11px] text-muted-foreground pt-0.5">
                  <span>Target: <strong className="text-foreground">{getCohortLabel(item.cohort)}</strong></span>
                  <span>•</span>
                  <span>{new Date(item.sentAt).toLocaleString()}</span>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                <div className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
                  <CheckCircle2 className="size-3.5" />
                  <span>{item.recipientCount} delivered</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
