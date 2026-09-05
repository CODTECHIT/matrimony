import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  BadgeCheck,
  HeartHandshake,
  Lock,
  Search,
  Sparkles,
  UsersRound,
  ShieldCheck,
  Heart,
} from "lucide-react";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { AppShell } from "@/components/layout/AppShell";
import { DashboardPage } from "@/routes/app.index";
import { Button } from "@/components/ui/button";
import { ProfileCard } from "@/components/profiles/ProfileCard";
import { ProfileCardSkeleton, ErrorState } from "@/components/common/states";
import { PlanCard } from "@/components/pricing/PlanCard";
import { profilesService, subscriptionsService } from "@/services";
import heroBg from "@/assets/hero-bg.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "YFJ Matrimony — Verified brides & grooms, chosen by families" },
      {
        name: "description",
        content:
          "Find a life partner through YFJ Matrimony: verified profiles, private contact sharing and family-first matchmaking across India.",
      },
      { property: "og:title", content: "YFJ Matrimony — Trusted matchmaking" },
      {
        property: "og:description",
        content: "Verified profiles, private introductions and family-first matchmaking.",
      },
    ],
  }),
  component: HomePage,
});

const pillars = [
  {
    icon: BadgeCheck,
    title: "Verified members",
    body: "Every profile passes mobile and document verification before it appears in search.",
  },
  {
    icon: Lock,
    title: "Private by default",
    body: "Contact details are released only when both families are ready and your plan allows it.",
  },
  {
    icon: UsersRound,
    title: "Family involved",
    body: "Parents and siblings can help shortlist, so decisions are never made alone.",
  },
  {
    icon: HeartHandshake,
    title: "Serious intent",
    body: "Built for marriage, not casual dating. Every conversation begins with an accepted interest.",
  },
];

const steps = [
  { title: "Create your profile", body: "Share your background, education and family details." },
  {
    title: "Get matched",
    body: "Receive daily matches based on community, values and preferences.",
  },
  { title: "Connect privately", body: "Send an interest and start talking once it is accepted." },
];

function HomePage() {
  const navigate = useNavigate();
  const [lookingFor, setLookingFor] = useState<"female" | "male">("female");
  const [minAge, setMinAge] = useState("21");
  const [maxAge, setMaxAge] = useState("28");
  const [religion, setReligion] = useState("All");
  const [motherTongue, setMotherTongue] = useState("All");

  const profilesQuery = useQuery({
    queryKey: ["profiles", "recommended"],
    queryFn: () => profilesService.recommended(),
  });
  const plansQuery = useQuery({ queryKey: ["plans"], queryFn: () => subscriptionsService.plans() });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    void navigate({
      to: "/app/browse",
      search: {
        gender: lookingFor === "female" ? "Female" : "Male",
        minAge: Number(minAge) || 21,
        maxAge: Number(maxAge) || 28,
        religion: religion === "All" ? undefined : religion,
        motherTongue: motherTongue === "All" ? undefined : motherTongue,
      },
    });
  };

  return (
    <>
      {/* Mobile Experience: Dedicated Mobile Screen 9 Feed, Drawer & Bottom Tab Bar */}
      <div className="md:hidden">
        <AppShell>
          <DashboardPage />
        </AppShell>
      </div>

      {/* Desktop Experience: Full-Screen Royal Matrimonial Hero & Public Landing Page */}
      <div className="hidden md:block">
        <PublicLayout>
          {/* Full-Screen Matrimonial Hero Section */}
          <section className="relative min-h-[92vh] sm:min-h-screen flex items-center overflow-hidden bg-stone-950">
            {/* Full-Screen Background Image */}
            <div className="absolute inset-0 z-0">
              <img
                src={heroBg}
                alt="Royal Indian wedding celebration background"
                className="h-full w-full object-cover object-[center_25%] sm:object-center"
              />
              {/* Multi-layered cinematic gradient overlays for high readability and premium aesthetic */}
              <div className="absolute inset-0 bg-gradient-to-r from-stone-950/95 via-stone-950/80 to-stone-950/40 lg:to-stone-950/25" />
              <div className="absolute inset-0 bg-gradient-to-t from-background via-stone-950/20 to-stone-950/50" />
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-amber-500/15 via-transparent to-transparent pointer-events-none" />
            </div>

            {/* Hero Content Container */}
            <div className="relative z-10 mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:py-24">
              <div className="grid items-center gap-10 lg:grid-cols-12">
                {/* Left Content Column */}
                <div className="text-white lg:col-span-7">
                  <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/40 bg-stone-900/70 px-3.5 py-1.5 text-xs font-semibold text-amber-200 backdrop-blur-md shadow-lg">
                    <Sparkles className="size-3.5 text-amber-400" />
                    <span>#1 Trusted Matchmaking Platform Since 2016</span>
                  </div>

                  <h1 className="mt-5 font-display text-4xl leading-[1.1] font-semibold text-white sm:text-6xl lg:text-7xl">
                    Find your{" "}
                    <span className="bg-gradient-to-r from-rose-400 via-rose-300 to-amber-200 bg-clip-text text-transparent">
                      perfect match
                    </span>
                  </h1>

                  <p className="mt-5 max-w-xl text-base text-stone-200/90 sm:text-lg leading-relaxed font-normal">
                    Trusted by families. Chosen by hearts. YFJ Matrimony brings together verified
                    brides and grooms with complete privacy, respect, and family involvement.
                  </p>

                  <div className="mt-8 flex flex-wrap items-center gap-4">
                    <Button
                      asChild
                      size="lg"
                      className="bg-primary hover:bg-primary/90 text-white shadow-xl shadow-rose-950/40 rounded-full px-6 text-base"
                    >
                      <Link to="/register">
                        Register free <ArrowRight className="ml-1 size-4" />
                      </Link>
                    </Button>
                    <Button
                      asChild
                      variant="outline"
                      size="lg"
                      className="rounded-full border-white/30 bg-white/10 text-white backdrop-blur-md hover:bg-white/20 hover:text-white px-6 text-base"
                    >
                      <Link to="/app/browse">
                        <Search className="mr-1 size-4" /> Explore profiles
                      </Link>
                    </Button>
                  </div>

                  <dl className="mt-10 grid max-w-lg grid-cols-3 gap-6 pt-6 border-t border-white/15">
                    <div>
                      <dt className="font-display text-2xl sm:text-3xl font-bold text-amber-300">
                        18k+
                      </dt>
                      <dd className="text-xs sm:text-sm text-stone-300 mt-0.5">Verified members</dd>
                    </div>
                    <div>
                      <dt className="font-display text-2xl sm:text-3xl font-bold text-amber-300">
                        4.2k
                      </dt>
                      <dd className="text-xs sm:text-sm text-stone-300 mt-0.5">Happy matches</dd>
                    </div>
                    <div>
                      <dt className="font-display text-2xl sm:text-3xl font-bold text-amber-300">
                        120+
                      </dt>
                      <dd className="text-xs sm:text-sm text-stone-300 mt-0.5">Communities</dd>
                    </div>
                  </dl>
                </div>

                {/* Right Matrimonial Match Finder Card */}
                <div className="lg:col-span-5">
                  <div className="rounded-3xl border border-white/25 bg-card/95 p-6 sm:p-7 shadow-2xl backdrop-blur-xl dark:bg-stone-900/95">
                    <div className="flex items-center justify-between border-b border-border/80 pb-4">
                      <div>
                        <h2 className="font-display text-2xl font-bold text-foreground">
                          Find Your Life Partner
                        </h2>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Search thousands of genuine, verified profiles
                        </p>
                      </div>
                      <span className="flex size-9 items-center justify-center rounded-full bg-primary-soft text-primary">
                        <Heart className="size-4 fill-primary" />
                      </span>
                    </div>

                    <form onSubmit={handleSearch} className="mt-5 space-y-4">
                      {/* Looking For Gender */}
                      <div>
                        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1.5">
                          I am looking for a
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setLookingFor("female")}
                            className={`flex items-center justify-center gap-2 rounded-xl py-2.5 px-3 text-sm font-semibold transition-all border ${
                              lookingFor === "female"
                                ? "border-primary bg-primary text-primary-foreground shadow-sm"
                                : "border-border bg-background/50 hover:bg-muted text-foreground"
                            }`}
                          >
                            <svg
                              className={`size-4 ${
                                lookingFor === "female" ? "text-primary-foreground" : "text-primary"
                              }`}
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              aria-hidden="true"
                            >
                              <circle cx="12" cy="9" r="5" />
                              <path d="M12 14v7" />
                              <path d="M9 18h6" />
                            </svg>
                            <span>Bride / Female</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setLookingFor("male")}
                            className={`flex items-center justify-center gap-2 rounded-xl py-2.5 px-3 text-sm font-semibold transition-all border ${
                              lookingFor === "male"
                                ? "border-primary bg-primary text-primary-foreground shadow-sm"
                                : "border-border bg-background/50 hover:bg-muted text-foreground"
                            }`}
                          >
                            <svg
                              className={`size-4 ${
                                lookingFor === "male" ? "text-primary-foreground" : "text-primary"
                              }`}
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              aria-hidden="true"
                            >
                              <circle cx="10" cy="14" r="5" />
                              <path d="M19 5l-5.4 5.4" />
                              <path d="M19 5h-5" />
                              <path d="M19 5v5" />
                            </svg>
                            <span>Groom / Male</span>
                          </button>
                        </div>
                      </div>

                      {/* Age Range */}
                      <div>
                        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1.5">
                          Age Range
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground shrink-0">From:</span>
                            <select
                              value={minAge}
                              onChange={(e) => setMinAge(e.target.value)}
                              className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                            >
                              {Array.from({ length: 43 }, (_, i) => i + 18).map((age) => (
                                <option key={age} value={age}>
                                  {age} Yrs
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground shrink-0">To:</span>
                            <select
                              value={maxAge}
                              onChange={(e) => setMaxAge(e.target.value)}
                              className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                            >
                              {Array.from({ length: 43 }, (_, i) => i + 18).map((age) => (
                                <option key={age} value={age}>
                                  {age} Yrs
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>

                      {/* Religion */}
                      <div>
                        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1.5">
                          Religion
                        </label>
                        <select
                          value={religion}
                          onChange={(e) => setReligion(e.target.value)}
                          className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                        >
                          <option value="All">All Religions</option>
                          <option value="Hindu">Hindu</option>
                          <option value="Muslim">Muslim</option>
                          <option value="Christian">Christian</option>
                          <option value="Sikh">Sikh</option>
                          <option value="Jain">Jain</option>
                          <option value="Buddhist">Buddhist</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>

                      {/* Mother Tongue */}
                      <div>
                        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1.5">
                          Mother Tongue / Community
                        </label>
                        <select
                          value={motherTongue}
                          onChange={(e) => setMotherTongue(e.target.value)}
                          className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                        >
                          <option value="All">All Communities</option>
                          <option value="Hindi">Hindi</option>
                          <option value="Marathi">Marathi</option>
                          <option value="Gujarati">Gujarati</option>
                          <option value="Punjabi">Punjabi</option>
                          <option value="Bengali">Bengali</option>
                          <option value="Tamil">Tamil</option>
                          <option value="Telugu">Telugu</option>
                          <option value="Malayalam">Malayalam</option>
                          <option value="Kannada">Kannada</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>

                      {/* Search CTA */}
                      <Button
                        type="submit"
                        size="lg"
                        className="w-full rounded-xl bg-primary hover:bg-primary/90 text-white font-semibold shadow-lg shadow-rose-950/20 mt-2"
                      >
                        <Search className="mr-2 size-4" /> Search Matches
                      </Button>

                      <div className="flex items-center justify-center gap-1.5 pt-2 text-[0.7rem] text-muted-foreground">
                        <ShieldCheck className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span>100% Verified Profiles & Privacy Protection</span>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Why Families Choose YFJ */}
          <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
            <h2 className="font-display text-3xl font-semibold sm:text-4xl text-foreground">
              Why families choose YFJ
            </h2>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {pillars.map(({ icon: Icon, title, body }) => (
                <article
                  key={title}
                  className="rounded-3xl border border-border bg-card p-5 shadow-card hover:shadow-raised transition-shadow"
                >
                  <span className="grid size-11 place-items-center rounded-full bg-primary-soft text-primary">
                    <Icon className="size-5" />
                  </span>
                  <h3 className="mt-4 font-display text-xl font-semibold text-foreground">
                    {title}
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground">{body}</p>
                </article>
              ))}
            </div>
          </section>

          {/* Recommended Profiles */}
          <section className="bg-surface py-16">
            <div className="mx-auto max-w-6xl px-4 sm:px-6">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4">
                <div className="min-w-0">
                  <h2 className="font-display text-3xl font-semibold sm:text-4xl text-foreground">
                    Recommended profiles
                  </h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    A glimpse of members who joined recently.
                  </p>
                </div>
                <Button asChild variant="ghost" size="sm">
                  <Link to="/app/browse">
                    View all <ArrowRight />
                  </Link>
                </Button>
              </div>

              <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {profilesQuery.isPending ? (
                  Array.from({ length: 4 }).map((_, index) => <ProfileCardSkeleton key={index} />)
                ) : profilesQuery.isError ? (
                  <div className="sm:col-span-2 lg:col-span-4">
                    <ErrorState onRetry={() => void profilesQuery.refetch()} />
                  </div>
                ) : (
                  profilesQuery.data
                    ?.slice(0, 4)
                    .map((profile) => <ProfileCard key={profile.id} profile={profile} />)
                )}
              </div>
            </div>
          </section>

          {/* How it Works */}
          <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
            <h2 className="font-display text-3xl font-semibold sm:text-4xl text-foreground">
              How it works
            </h2>
            <ol className="mt-8 grid gap-4 md:grid-cols-3">
              {steps.map((step, index) => (
                <li
                  key={step.title}
                  className="rounded-3xl border border-border bg-card p-6 shadow-card"
                >
                  <span className="font-display text-4xl font-semibold text-gold">
                    0{index + 1}
                  </span>
                  <h3 className="mt-3 font-display text-xl font-semibold text-foreground">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground">{step.body}</p>
                </li>
              ))}
            </ol>
          </section>

          {/* Membership Plans */}
          <section className="bg-surface py-16">
            <div className="mx-auto max-w-6xl px-4 sm:px-6">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4">
                <div className="min-w-0">
                  <h2 className="font-display text-3xl font-semibold sm:text-4xl text-foreground">
                    Membership plans
                  </h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Upgrade only when you are ready to talk.
                  </p>
                </div>
                <Button asChild variant="ghost" size="sm">
                  <Link to="/pricing">
                    Compare <ArrowRight />
                  </Link>
                </Button>
              </div>
              <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {plansQuery.isPending
                  ? Array.from({ length: 4 }).map((_, index) => (
                      <div key={index} className="h-96 animate-pulse rounded-3xl bg-muted" />
                    ))
                  : plansQuery.data?.map((plan) => <PlanCard key={plan.id} plan={plan} />)}
              </div>
            </div>
          </section>

          {/* Bottom CTA Banner */}
          <section className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6">
            <h2 className="font-display text-3xl font-semibold sm:text-4xl text-foreground">
              Your family. Your future. Our priority.
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">
              Create your profile in a few minutes and start receiving matches that respect your
              values.
            </p>
            <Button asChild size="lg" className="mt-6 rounded-full px-8">
              <Link to="/register">
                Get started <ArrowRight />
              </Link>
            </Button>
          </section>
        </PublicLayout>
      </div>
    </>
  );
}
