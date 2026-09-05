import { createFileRoute, Link } from "@tanstack/react-router";
import { HeartHandshake, ShieldCheck, Sparkles, Users } from "lucide-react";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About YFJ Matrimony — Our story and promise" },
      {
        name: "description",
        content:
          "Learn how YFJ Matrimony helps Indian families find trustworthy life partners through verification, privacy and personal guidance.",
      },
      { property: "og:title", content: "About YFJ Matrimony" },
      {
        property: "og:description",
        content: "Our story, our promise and the way we protect every member's privacy.",
      },
    ],
  }),
  component: AboutPage,
});

const values = [
  {
    icon: ShieldCheck,
    title: "Verification first",
    body: "Mobile, identity and employment checks before a profile becomes searchable.",
  },
  {
    icon: Users,
    title: "Family at the centre",
    body: "Shared shortlists and family details built into the product, not bolted on.",
  },
  {
    icon: HeartHandshake,
    title: "Respectful introductions",
    body: "No cold messages. Conversations only start after an interest is accepted.",
  },
  {
    icon: Sparkles,
    title: "Human support",
    body: "Relationship advisors help with shortlists, meetings and next steps.",
  },
];

function AboutPage() {
  return (
    <PublicLayout>
      <section className="blush-canvas">
        <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gold">About us</p>
          <h1 className="mt-3 font-display text-4xl font-semibold sm:text-5xl">
            Matchmaking with the care of a family friend
          </h1>
          <p className="mt-4 text-base text-muted-foreground">
            YFJ Matrimony began with a simple belief: finding a life partner should feel personal,
            private and dignified. We combine careful verification with technology that respects how
            Indian families actually make this decision.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {values.map(({ icon: Icon, title, body }) => (
            <article
              key={title}
              className="rounded-3xl border border-border bg-card p-5 shadow-card"
            >
              <span className="grid size-11 place-items-center rounded-full bg-primary-soft text-primary">
                <Icon className="size-5" />
              </span>
              <h2 className="mt-4 font-display text-xl font-semibold">{title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-surface py-16">
        <div className="mx-auto grid max-w-5xl gap-8 px-4 sm:px-6 md:grid-cols-2">
          <div>
            <h2 className="font-display text-3xl font-semibold">What we promise</h2>
            <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
              <li>Your contact details are never shown without your consent.</li>
              <li>No profile is sold, shared or advertised outside YFJ Matrimony.</li>
              <li>You can pause, hide or delete your profile at any moment.</li>
              <li>Reported profiles are reviewed by a human within 24 hours.</li>
            </ul>
          </div>
          <div className="rounded-3xl border border-border bg-card p-6 shadow-card">
            <h2 className="font-display text-2xl font-semibold">Ready to begin?</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Registration is free and takes about five minutes.
            </p>
            <Button asChild className="mt-5">
              <Link to="/register">Create your profile</Link>
            </Button>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
