import { useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { Clock, Headset, Mail, MapPin, MessageSquare, Phone, Send } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api-client";
import { useAuth } from "@/hooks/useAuth";
import { supportService } from "@/services";
import { realtimeClient } from "@/lib/realtime";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { SupportTicketModal } from "@/components/support/SupportTicketModal";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact YFJ Matrimony — Talk to our advisors" },
      {
        name: "description",
        content:
          "Reach the YFJ Matrimony team for help with your profile, membership or a match you are considering.",
      },
      { property: "og:title", content: "Contact YFJ Matrimony" },
      { property: "og:description", content: "Talk to a relationship advisor about your search." },
    ],
  }),
  component: ContactPage,
});

const schema = z.object({
  name: z.string().trim().min(2, "Please enter your name").max(100),
  email: z.string().trim().email("Enter a valid email address").max(255),
  phone: z
    .string()
    .trim()
    .regex(/^[0-9+\-\s]{8,16}$/, "Enter a valid phone number"),
  message: z.string().trim().min(10, "Tell us a little more").max(1000),
});

type FormErrors = Partial<Record<keyof z.infer<typeof schema>, string>>;

function ContactPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [activeTicketNumber, setActiveTicketNumber] = useState<string | null>(null);

  const { data: myTickets = [] } = useQuery({
    queryKey: ["my-support-tickets"],
    queryFn: () => supportService.getMyTickets(),
    enabled: Boolean(user),
  });

  const { data: publicSettings } = useQuery<{
    contact_email?: string;
    helpline_phone?: string;
  }>({
    queryKey: ["settings", "public"],
    queryFn: () => api.get("/settings/public"),
    staleTime: 5 * 60 * 1000,
  });

  const supportPhone = publicSettings?.helpline_phone || "+91 99999 88888";
  const supportEmail = publicSettings?.contact_email || "support@yfjmatrimony.com";

  useEffect(() => {
    const unsub = realtimeClient.on("ticket:reply", () => {
      void queryClient.invalidateQueries({ queryKey: ["my-support-tickets"] });
    });
    return () => {
      unsub();
    };
  }, [queryClient]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const parsed = schema.safeParse(Object.fromEntries(form));
    if (!parsed.success) {
      const next: FormErrors = {};
      for (const issue of parsed.error.issues) {
        next[issue.path[0] as keyof FormErrors] = issue.message;
      }
      setErrors(next);
      return;
    }
    setErrors({});
    setSubmitting(true);

    try {
      const res = await api.post<{ ok: boolean; ticketNumber: string }>("/support/tickets", {
        name: parsed.data.name,
        email: parsed.data.email,
        phone: parsed.data.phone,
        message: parsed.data.message,
        subject: `General Inquiry from ${parsed.data.name}`,
      });
      toast.success(
        `Ticket #${res.ticketNumber} created! Thank you — an advisor will contact you within one working day.`,
        { duration: 6000 },
      );
      formElement?.reset();
      await queryClient.invalidateQueries({ queryKey: ["my-support-tickets"] });
      setActiveTicketNumber(res.ticketNumber);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to submit inquiry");
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "open":
        return <Badge className="bg-emerald-600 text-white text-[10px]">Open</Badge>;
      case "in_progress":
        return <Badge className="bg-amber-600 text-white text-[10px]">In Progress</Badge>;
      case "resolved":
        return <Badge variant="secondary" className="text-[10px]">Resolved</Badge>;
      default:
        return <Badge variant="outline" className="text-[10px] capitalize">{status}</Badge>;
    }
  };

  return (
    <PublicLayout>
      <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6 space-y-12">
        <div className="grid gap-10 md:grid-cols-[1fr_1.2fr]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gold">Contact</p>
            <h1 className="mt-2 font-display text-4xl font-semibold">We are here to help</h1>
            <p className="mt-3 text-sm text-muted-foreground">
              Questions about a profile, membership or verification? Our advisors respond within one
              working day.
            </p>
            <ul className="mt-6 space-y-4 text-sm">
              <li className="flex items-start gap-3">
                <Phone className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>{supportPhone} (Mon–Sat, 10am–7pm IST)</span>
              </li>
              <li className="flex items-start gap-3">
                <Mail className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>{supportEmail}</span>
              </li>
              <li className="flex items-start gap-3">
                <MapPin className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>Bhimavaram</span>
              </li>
            </ul>
          </div>

          <form
            onSubmit={handleSubmit}
            noValidate
            className="space-y-4 rounded-3xl border border-border bg-card p-6 shadow-card"
          >
            <div className="space-y-1.5">
              <Label htmlFor="name">
                Full name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                name="name"
                defaultValue={user?.fullName || ""}
                maxLength={100}
                className="h-11 rounded-xl"
                required
              />
              {errors.name ? <p className="text-xs text-destructive">{errors.name}</p> : null}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="email">
                  Email <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  defaultValue={user?.email || ""}
                  className="h-11 rounded-xl"
                  required
                />
                {errors.email ? <p className="text-xs text-destructive">{errors.email}</p> : null}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone">
                  Mobile <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  defaultValue={user?.mobile || ""}
                  className="h-11 rounded-xl"
                  required
                />
                {errors.phone ? <p className="text-xs text-destructive">{errors.phone}</p> : null}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="message">
                How can we help? <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="message"
                name="message"
                rows={5}
                maxLength={1000}
                className="rounded-xl"
                required
              />
              {errors.message ? <p className="text-xs text-destructive">{errors.message}</p> : null}
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? (
                "Sending…"
              ) : (
                <>
                  <Send className="size-4" /> Send message
                </>
              )}
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              Fields marked <span className="text-destructive">*</span> are required.
            </p>
          </form>
        </div>

        {/* Existing User Tickets Section */}
        {myTickets.length > 0 && (
          <div className="rounded-3xl border border-border bg-card p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Headset className="size-5 text-primary" />
                <h2 className="font-display text-lg font-bold text-foreground">
                  Your Support Tickets & Conversations ({myTickets.length})
                </h2>
              </div>
              <span className="text-xs text-muted-foreground">
                Click any ticket to view replies & chat with support
              </span>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {myTickets.map((t) => (
                <div
                  key={t.id}
                  className="rounded-2xl border border-border/80 bg-background/50 p-4 space-y-2.5 transition-all hover:border-primary/50 shadow-xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs font-bold text-primary">
                      #{t.ticket_number}
                    </span>
                    {getStatusBadge(t.status)}
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-foreground truncate">{t.subject}</h3>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{t.message}</p>
                  </div>
                  <div className="pt-2 border-t border-border/50 flex items-center justify-between">
                    <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <MessageSquare className="size-3" />
                      {t.replies?.length || 0} response{(t.replies?.length || 0) === 1 ? "" : "s"}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setActiveTicketNumber(t.ticket_number)}
                      className="h-7 text-xs gap-1 rounded-xl"
                    >
                      <Headset className="size-3" /> View & Reply
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Support Ticket Conversation & Interactive Reply Dialog */}
      <SupportTicketModal
        ticketNumberOrId={activeTicketNumber}
        open={Boolean(activeTicketNumber)}
        onClose={() => setActiveTicketNumber(null)}
      />
    </PublicLayout>
  );
}
