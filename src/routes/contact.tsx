import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { Mail, MapPin, Phone, Send } from "lucide-react";
import { toast } from "sonner";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

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
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
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
    // Backend integration point: POST /support/enquiries
    await new Promise((resolve) => setTimeout(resolve, 500));
    setSubmitting(false);
    toast.success("Thank you — an advisor will call you within one working day.");
    event.currentTarget.reset();
  };

  return (
    <PublicLayout>
      <div className="mx-auto grid max-w-5xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1fr_1.2fr]">
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
              <span>+91 90000 00000 (Mon–Sat, 10am–7pm IST)</span>
            </li>
            <li className="flex items-start gap-3">
              <Mail className="mt-0.5 size-4 shrink-0 text-primary" />
              <span>care@yfjmatrimony.com</span>
            </li>
            <li className="flex items-start gap-3">
              <MapPin className="mt-0.5 size-4 shrink-0 text-primary" />
              <span>3rd Floor, Kalyani Nagar, Pune 411006, India</span>
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
            <Input id="name" name="name" maxLength={100} className="h-11 rounded-xl" required />
            {errors.name ? <p className="text-xs text-destructive">{errors.name}</p> : null}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="email">
                Email <span className="text-destructive">*</span>
              </Label>
              <Input id="email" name="email" type="email" className="h-11 rounded-xl" required />
              {errors.email ? <p className="text-xs text-destructive">{errors.email}</p> : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">
                Mobile <span className="text-destructive">*</span>
              </Label>
              <Input id="phone" name="phone" type="tel" className="h-11 rounded-xl" required />
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
                <Send /> Send message
              </>
            )}
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            Fields marked <span className="text-destructive">*</span> are required.
          </p>
        </form>
      </div>
    </PublicLayout>
  );
}
