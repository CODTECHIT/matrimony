import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  CheckCircle2,
  Compass,
  Heart,
  HeartHandshake,
  Lock,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  UserCheck,
  Users,
  Award,
} from "lucide-react";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About YFJ Matrimony — A Trusted Platform for Finding Your Life Partner" },
      {
        name: "description",
        content:
          "Welcome to YFJ Matrimony – Bringing hearts together and building beautiful futures with trusted, user-friendly matchmaking for individuals and families.",
      },
      { property: "og:title", content: "About YFJ Matrimony — Our Mission, Vision & Values" },
      {
        property: "og:description",
        content:
          "Discover how YFJ Matrimony connects individuals and families through trust, respect, privacy, and shared values.",
      },
    ],
  }),
  component: AboutPage,
});

const whyChooseUs = [
  {
    title: "Easy Profile Search",
    description: "Find potential life partners with ease.",
    icon: Search,
  },
  {
    title: "User-Friendly Platform",
    description: "Simple and convenient profile browsing.",
    icon: Sparkles,
  },
  {
    title: "Meaningful Connections",
    description: "Connect with people who share your values and preferences.",
    icon: Heart,
  },
  {
    title: "Privacy & Security",
    description: "We value your privacy and strive to protect your personal information.",
    icon: Lock,
  },
  {
    title: "Family-Friendly Experience",
    description:
      "A platform designed to support individuals and families in their search for a life partner.",
    icon: Users,
  },
  {
    title: "A New Beginning",
    description: "Helping you take the first step toward a happy married life.",
    icon: HeartHandshake,
  },
];

const services = [
  "Bride and Groom Profile Registration",
  "Matrimonial Profile Search",
  "Partner Preferences",
  "Profile Browsing and Shortlisting",
  "Connecting Brides and Grooms",
  "Family-Oriented Matchmaking",
  "Membership Plans (if available)",
];

const coreValues = [
  {
    name: "Trust",
    description: "Building relationships based on honesty and confidence.",
    icon: ShieldCheck,
  },
  {
    name: "Respect",
    description: "Valuing every individual and their preferences.",
    icon: HeartHandshake,
  },
  {
    name: "Privacy",
    description: "Treating personal information with care.",
    icon: Lock,
  },
  {
    name: "Commitment",
    description: "Supporting people throughout their partner-search journey.",
    icon: Award,
  },
  {
    name: "Togetherness",
    description: "Bringing individuals and families closer through meaningful connections.",
    icon: Users,
  },
];

function AboutPage() {
  return (
    <PublicLayout>
      {/* Hero / Welcome Section */}
      <section className="blush-canvas relative overflow-hidden py-16 sm:py-20">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/40 bg-amber-50/70 dark:bg-amber-950/30 px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-amber-800 dark:text-amber-300">
            <Sparkles className="size-3.5 text-amber-600 dark:text-amber-400" />
            <span>About YFJ Matrimony</span>
          </div>

          <h1 className="mt-5 font-display text-3xl font-semibold text-foreground sm:text-5xl lg:text-6xl leading-tight">
            Welcome to YFJ Matrimony
          </h1>

          <p className="mt-3 font-display text-lg sm:text-2xl font-medium text-primary">
            A Trusted Platform for Finding Your Life Partner.
          </p>

          <div className="mx-auto mt-6 max-w-2xl space-y-4 text-base sm:text-lg text-muted-foreground leading-relaxed">
            <p>
              At YFJ Matrimony, we believe that marriage is a beautiful bond built on love, trust,
              understanding, and commitment. Our mission is to help individuals find their perfect
              life partner and begin a wonderful journey together.
            </p>
            <p>
              We provide a simple and user-friendly platform where individuals and families can
              explore profiles and connect with potential life partners who share similar values,
              traditions, and aspirations.
            </p>
            <p>
              YFJ Matrimony is dedicated to making the journey of finding a life partner simple,
              meaningful, and memorable.
            </p>
          </div>

          <div className="mt-8 inline-block rounded-2xl border-2 border-amber-400/40 bg-card/90 px-6 py-4 shadow-sm backdrop-blur-sm">
            <p className="font-display text-base sm:text-xl font-bold text-foreground">
              YFJ Matrimony –{" "}
              <span className="bg-gradient-to-r from-primary to-amber-600 bg-clip-text text-transparent">
                Bringing Hearts Together, Building Beautiful Futures.
              </span>
            </p>
          </div>
        </div>
      </section>

      {/* Mission & Vision Section */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="grid gap-8 md:grid-cols-2">
          {/* Mission */}
          <div className="group rounded-3xl border border-border/80 bg-card p-8 shadow-card transition-all duration-300 hover:border-primary/40 hover:shadow-lg">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-primary-soft text-primary group-hover:scale-105 transition-transform">
              <Target className="size-6" />
            </div>
            <h2 className="mt-6 font-display text-2xl sm:text-3xl font-bold text-foreground">
              Our Mission
            </h2>
            <p className="mt-4 text-base text-muted-foreground leading-relaxed">
              Our mission is to connect individuals and families through a trusted and user-friendly
              matrimonial platform.
            </p>
            <p className="mt-3 text-base text-muted-foreground leading-relaxed">
              We strive to help people find compatible life partners by providing a simple,
              convenient, and meaningful matchmaking experience built on trust, respect, and shared
              values.
            </p>
          </div>

          {/* Vision */}
          <div className="group rounded-3xl border border-border/80 bg-card p-8 shadow-card transition-all duration-300 hover:border-amber-400/60 hover:shadow-lg">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 group-hover:scale-105 transition-transform">
              <Compass className="size-6" />
            </div>
            <h2 className="mt-6 font-display text-2xl sm:text-3xl font-bold text-foreground">
              Our Vision
            </h2>
            <p className="mt-4 text-base text-muted-foreground leading-relaxed">
              Our vision is to become a trusted matrimonial platform that brings people together and
              helps build happy, loving, and lifelong relationships.
            </p>
            <p className="mt-3 text-base text-muted-foreground leading-relaxed">
              We aim to make every marriage journey meaningful by connecting hearts and creating
              beautiful beginnings.
            </p>
          </div>
        </div>
      </section>

      {/* Why Choose YFJ Matrimony? */}
      <section className="bg-surface py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="font-display text-3xl font-bold text-foreground sm:text-4xl">
              Why Choose YFJ Matrimony?
            </h2>
            <p className="mt-3 text-base text-muted-foreground">
              Designed with care to support you and your family every step of the way.
            </p>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {whyChooseUs.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className="rounded-3xl border border-border/80 bg-card p-6 shadow-card transition-all duration-200 hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg"
                >
                  <div className="flex size-11 items-center justify-center rounded-xl bg-primary-soft text-primary">
                    <Icon className="size-5" />
                  </div>
                  <h3 className="mt-4 font-display text-xl font-bold text-foreground">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                    {item.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Our Services */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:py-20 sm:px-6">
        <div className="grid gap-12 lg:grid-cols-12 items-center">
          <div className="lg:col-span-5">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              What We Offer
            </span>
            <h2 className="mt-2 font-display text-3xl font-bold text-foreground sm:text-4xl">
              Our Services
            </h2>
            <p className="mt-4 text-base text-muted-foreground leading-relaxed">
              From free registration to dedicated matching preferences and family-first connection
              tools, we provide everything you need for a smooth partner search.
            </p>
            <div className="mt-8">
              <Button asChild size="lg" className="rounded-full px-7 shadow-md">
                <Link to="/register">
                  Register free now <ArrowRight className="ml-1.5 size-4" />
                </Link>
              </Button>
            </div>
          </div>

          <div className="lg:col-span-7">
            <div className="grid gap-3 sm:grid-cols-2">
              {services.map((service) => (
                <div
                  key={service}
                  className="flex items-center gap-3.5 rounded-2xl border border-border/80 bg-card p-4 shadow-card hover:border-primary/40 transition-colors"
                >
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="size-4.5" />
                  </div>
                  <span className="text-sm font-semibold text-foreground">{service}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Our Values */}
      <section className="bg-surface py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="text-center max-w-3xl mx-auto">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              Guiding Principles
            </span>
            <h2 className="mt-2 font-display text-3xl font-bold text-foreground sm:text-4xl">
              Our Values
            </h2>
            <p className="mt-3 text-base text-muted-foreground">
              The core principles that guide our interactions, technology, and service.
            </p>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
            {coreValues.map((value) => {
              const Icon = value.icon;
              return (
                <div
                  key={value.name}
                  className="rounded-3xl border border-border/80 bg-card p-6 shadow-card transition-all duration-200 hover:-translate-y-1 hover:border-amber-400/60 hover:shadow-lg text-center flex flex-col items-center"
                >
                  <div className="flex size-12 items-center justify-center rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 mb-4">
                    <Icon className="size-6" />
                  </div>
                  <h3 className="font-display text-lg font-bold text-foreground">{value.name}</h3>
                  <p className="mt-2 text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    {value.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Ready to Begin CTA */}
      <section className="mx-auto max-w-4xl px-4 py-16 sm:py-20 text-center sm:px-6">
        <div className="rounded-3xl border-2 border-amber-400/40 bg-gradient-to-br from-card via-amber-50/20 to-card dark:via-amber-950/10 p-8 sm:p-12 shadow-card">
          <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-primary-soft text-primary mb-6">
            <UserCheck className="size-7" />
          </div>
          <h2 className="font-display text-3xl font-bold text-foreground sm:text-4xl">
            Ready to Begin Your Journey?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-muted-foreground">
            Helping you take the first step toward a happy married life. Create your free profile
            today and find compatible life partners who share your values.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Button asChild size="lg" className="rounded-full px-8 shadow-md">
              <Link to="/register">
                Create your profile <ArrowRight className="ml-1.5 size-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="rounded-full px-8">
              <Link to="/app/browse">Explore profiles</Link>
            </Button>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
