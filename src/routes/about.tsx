import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Award,
  BookmarkCheck,
  CheckCircle2,
  Compass,
  Crown,
  Heart,
  HeartHandshake,
  Lock,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Target,
  UserCheck,
  UserPlus,
  Users,
} from "lucide-react";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { Button } from "@/components/ui/button";
import heroBg from "@/assets/hero-bg.jpg";
import heroHands from "@/assets/hero-hands.jpg";
import goldCrown from "@/assets/gold-crown.png";

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
    number: "01",
    title: "Easy Profile Search",
    description: "Find potential life partners with ease.",
    icon: Search,
    color:
      "text-rose-600 bg-rose-50 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900/40",
  },
  {
    number: "02",
    title: "User-Friendly Platform",
    description: "Simple and convenient profile browsing.",
    icon: Sparkles,
    color:
      "text-amber-700 bg-amber-50 border-amber-300 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/40",
  },
  {
    number: "03",
    title: "Meaningful Connections",
    description: "Connect with people who share your values and preferences.",
    icon: Heart,
    color: "text-primary bg-primary-soft border-primary/20",
  },
  {
    number: "04",
    title: "Privacy & Security",
    description: "We value your privacy and strive to protect your personal information.",
    icon: Lock,
    color:
      "text-stone-700 bg-stone-100 border-stone-200 dark:bg-stone-800 dark:text-stone-300 dark:border-stone-700",
  },
  {
    number: "05",
    title: "Family-Friendly Experience",
    description:
      "A platform designed to support individuals and families in their search for a life partner.",
    icon: Users,
    color:
      "text-indigo-700 bg-indigo-50 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-400 dark:border-indigo-900/40",
  },
  {
    number: "06",
    title: "A New Beginning",
    description: "Helping you take the first step toward a happy married life.",
    icon: HeartHandshake,
    color:
      "text-emerald-700 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/40",
  },
];

const services = [
  {
    title: "Bride and Groom Profile Registration",
    description: "Simple, guided profile onboarding for individuals and families.",
    icon: UserPlus,
  },
  {
    title: "Matrimonial Profile Search",
    description: "Intuitive search with detailed community, profession, and location filters.",
    icon: Search,
  },
  {
    title: "Partner Preferences",
    description: "Set customized expectations matching your cultural and personal goals.",
    icon: SlidersHorizontal,
  },
  {
    title: "Profile Browsing and Shortlisting",
    description: "Save and bookmark preferred profiles to review together with your family.",
    icon: BookmarkCheck,
  },
  {
    title: "Connecting Brides and Grooms",
    description: "Express interest with mutual respect and initiate private conversations.",
    icon: HeartHandshake,
  },
  {
    title: "Family-Oriented Matchmaking",
    description: "Thoughtfully built to honor tradition and involve parents and loved ones.",
    icon: Users,
  },
  {
    title: "Membership Plans (if available)",
    description: "Flexible upgrade tiers for direct contact viewing and priority placement.",
    icon: Crown,
  },
];

const coreValues = [
  {
    name: "Trust",
    description: "Building relationships based on honesty and confidence.",
    icon: ShieldCheck,
    tag: "Foundation",
  },
  {
    name: "Respect",
    description: "Valuing every individual and their preferences.",
    icon: HeartHandshake,
    tag: "Dignity",
  },
  {
    name: "Privacy",
    description: "Treating personal information with care.",
    icon: Lock,
    tag: "Protection",
  },
  {
    name: "Commitment",
    description: "Supporting people throughout their partner-search journey.",
    icon: Award,
    tag: "Dedication",
  },
  {
    name: "Togetherness",
    description: "Bringing individuals and families closer through meaningful connections.",
    icon: Users,
    tag: "Harmony",
  },
];

function AboutPage() {
  return (
    <PublicLayout>
      {/* 1. Full-Screen Cinematic Royal Hero with Authentic Wedding Photography */}
      <section className="relative min-h-[85vh] sm:min-h-[90vh] flex items-center overflow-hidden bg-stone-950 text-white">
        {/* Full-Bleed Royal Wedding Image */}
        <div className="absolute inset-0 z-0">
          <img
            src={heroBg}
            alt="Royal Indian wedding celebration in palace courtyard"
            className="h-full w-full object-cover object-[center_30%] sm:object-[center_25%]"
          />
          {/* Cinematic Scrim Gradient: High text readability on left while keeping couple & palace vivid on right */}
          <div className="absolute inset-0 bg-gradient-to-r from-stone-950/95 via-stone-950/80 via-50% to-stone-950/30 lg:to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-transparent to-stone-950/60 pointer-events-none" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-amber-500/20 via-transparent to-transparent pointer-events-none" />
        </div>

        {/* Distributed Hero Content Container */}
        <div className="relative z-10 mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:py-24">
          <div className="grid items-center gap-10 lg:grid-cols-12">
            {/* Left Content Column */}
            <div className="lg:col-span-8 space-y-6">
              {/* Gold Eyebrow Badge */}
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/60 bg-stone-900/80 px-4.5 py-1.5 text-xs font-semibold uppercase tracking-[0.22em] text-amber-200 shadow-lg shadow-black/50 backdrop-blur-md animate-float-slow">
                <Sparkles className="size-3.5 text-amber-400" />
                <span>About YFJ Matrimony</span>
              </div>

              {/* Main Headline */}
              <h1 className="font-display text-4xl sm:text-6xl lg:text-7xl font-semibold leading-[1.1] text-white tracking-tight drop-shadow-md">
                Welcome to{" "}
                <span className="bg-gradient-to-r from-amber-200 via-rose-300 to-amber-200 bg-clip-text text-transparent">
                  YFJ Matrimony
                </span>
              </h1>

              {/* Subtitle */}
              <p className="font-display text-xl sm:text-3xl font-medium text-amber-200/95 tracking-wide drop-shadow-sm italic">
                A Trusted Platform for Finding Your Life Partner.
              </p>

              {/* Lead Philosophical Statement */}
              <p className="max-w-2xl text-base sm:text-lg text-stone-200 leading-relaxed font-light drop-shadow-xs">
                At <strong className="font-semibold text-white">YFJ Matrimony</strong>, we believe
                that marriage is a beautiful bond built on love, trust, understanding, and
                commitment. Our mission is to help individuals find their perfect life partner and
                begin a wonderful journey together.
              </p>

              {/* Tagline Proclamation Pill */}
              <div className="inline-flex items-center gap-3 rounded-2xl border border-amber-400/50 bg-stone-900/75 px-5 py-3 shadow-xl backdrop-blur-md">
                <img
                  src={goldCrown}
                  alt=""
                  className="size-5 object-contain shrink-0 hidden sm:inline-block"
                />
                <p className="font-display text-sm sm:text-base font-bold text-stone-100">
                  YFJ Matrimony –{" "}
                  <span className="bg-gradient-to-r from-amber-300 via-rose-300 to-amber-200 bg-clip-text text-transparent">
                    Bringing Hearts Together, Building Beautiful Futures.
                  </span>
                </p>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-wrap items-center gap-4">
                <Button
                  asChild
                  size="lg"
                  className="rounded-full bg-primary hover:bg-primary/90 text-white px-7 text-base shadow-xl shadow-rose-950/50 transition-all cursor-pointer"
                >
                  <Link to="/register">
                    Create Your Profile <ArrowRight className="ml-1.5 size-4" />
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="rounded-full border-amber-400/50 bg-white/10 text-white hover:bg-white/20 hover:text-white px-7 text-base backdrop-blur-md cursor-pointer"
                >
                  <Link to="/app/browse">
                    <Search className="mr-1.5 size-4 text-amber-300" /> Explore Profiles
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Editorial Story Section: Sacred Union & Purpose */}
      <section className="bg-background py-16 sm:py-24 border-b border-border/80">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid gap-12 lg:grid-cols-12 items-center">
            {/* Left Column: Sacred Hands Ceremonial Photograph */}
            <div className="lg:col-span-5">
              <div className="relative group rounded-3xl overflow-hidden border-2 border-amber-400/40 shadow-2xl shadow-rose-950/10">
                <img
                  src={heroHands}
                  alt="Bride and groom holding hands during traditional wedding ceremony"
                  className="w-full h-80 sm:h-96 object-cover object-center group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-stone-950/80 via-transparent to-transparent pointer-events-none" />
                <div className="absolute bottom-4 left-4 right-4 text-white">
                  <span className="text-[0.7rem] uppercase font-bold tracking-widest text-amber-300">
                    Sacred Tradition
                  </span>
                  <p className="font-display text-lg font-bold">
                    Built on Love, Trust & Commitment
                  </p>
                </div>
              </div>
            </div>

            {/* Right Column: Properly Distributed Narrative */}
            <div className="lg:col-span-7 space-y-6">
              <span className="text-xs font-bold uppercase tracking-[0.24em] text-primary">
                Our Foundation
              </span>

              <h2 className="font-display text-3xl sm:text-5xl font-bold text-foreground leading-tight">
                Simple, Meaningful & Memorable
              </h2>

              <p className="text-base sm:text-lg text-foreground/85 leading-relaxed font-normal">
                We provide a simple and user-friendly platform where individuals and families can
                explore profiles and connect with potential life partners who share similar values,
                traditions, and aspirations.
              </p>

              <p className="text-base sm:text-lg text-foreground/85 leading-relaxed font-normal">
                YFJ Matrimony is dedicated to making the journey of finding a life partner simple,
                meaningful, and memorable.
              </p>

              {/* 3 Quick Value Badges */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-2">
                <div className="rounded-2xl border border-border/90 bg-surface/70 p-4 shadow-xs">
                  <div className="flex size-9 items-center justify-center rounded-xl bg-primary-soft text-primary mb-2.5">
                    <Heart className="size-4.5" />
                  </div>
                  <h4 className="text-sm font-bold text-foreground">Shared Values</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">Compatible aspirations</p>
                </div>

                <div className="rounded-2xl border border-border/90 bg-surface/70 p-4 shadow-xs">
                  <div className="flex size-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-400 mb-2.5">
                    <ShieldCheck className="size-4.5" />
                  </div>
                  <h4 className="text-sm font-bold text-foreground">100% Verified</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">Genuine profiles</p>
                </div>

                <div className="rounded-2xl border border-border/90 bg-surface/70 p-4 shadow-xs">
                  <div className="flex size-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400 mb-2.5">
                    <Users className="size-4.5" />
                  </div>
                  <h4 className="text-sm font-bold text-foreground">Family Friendly</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">Respectful process</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Our Mission & Our Vision: Symmetrical Architectural Cards */}
      <section className="blush-canvas py-16 sm:py-24 border-b border-border/80">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-xs font-bold uppercase tracking-[0.24em] text-primary">
              Our Purpose & Promise
            </span>
            <h2 className="mt-2 font-display text-3xl sm:text-5xl font-bold text-foreground">
              Our Mission & Vision
            </h2>
            <div className="mt-3.5 mx-auto h-0.5 w-16 bg-gradient-to-r from-primary to-amber-500 rounded-full" />
          </div>

          <div className="grid gap-8 lg:grid-cols-2">
            {/* Mission Card */}
            <div className="group rounded-3xl border-2 border-border/90 bg-card p-8 sm:p-10 shadow-card transition-all duration-300 hover:border-primary/50 hover:shadow-raised">
              <div className="flex size-14 items-center justify-center rounded-2xl bg-primary-soft text-primary border border-primary/20 group-hover:scale-105 transition-transform">
                <Target className="size-7" />
              </div>
              <span className="mt-6 inline-block text-xs font-bold uppercase tracking-[0.2em] text-primary">
                Connecting Hearts
              </span>
              <h3 className="mt-1 font-display text-3xl sm:text-4xl font-bold text-foreground">
                Our Mission
              </h3>
              <div className="mt-4 space-y-3.5 text-base text-foreground/80 leading-relaxed">
                <p className="font-medium text-foreground">
                  Our mission is to connect individuals and families through a trusted and
                  user-friendly matrimonial platform.
                </p>
                <p>
                  We strive to help people find compatible life partners by providing a simple,
                  convenient, and meaningful matchmaking experience built on trust, respect, and
                  shared values.
                </p>
              </div>
            </div>

            {/* Vision Card */}
            <div className="group rounded-3xl border-2 border-border/90 bg-card p-8 sm:p-10 shadow-card transition-all duration-300 hover:border-amber-400/70 hover:shadow-raised">
              <div className="flex size-14 items-center justify-center rounded-2xl bg-gold-soft text-amber-800 dark:text-amber-300 border border-amber-300/40 group-hover:scale-105 transition-transform">
                <Compass className="size-7" />
              </div>
              <span className="mt-6 inline-block text-xs font-bold uppercase tracking-[0.2em] text-amber-700 dark:text-amber-400">
                Lifelong Relationships
              </span>
              <h3 className="mt-1 font-display text-3xl sm:text-4xl font-bold text-foreground">
                Our Vision
              </h3>
              <div className="mt-4 space-y-3.5 text-base text-foreground/80 leading-relaxed">
                <p className="font-medium text-foreground">
                  Our vision is to become a trusted matrimonial platform that brings people together
                  and helps build happy, loving, and lifelong relationships.
                </p>
                <p>
                  We aim to make every marriage journey meaningful by connecting hearts and creating
                  beautiful beginnings.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Why Choose YFJ Matrimony?: 6 Distributed Luxury Cards */}
      <section className="bg-background py-16 sm:py-24 border-b border-border/80">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <span className="text-xs font-bold uppercase tracking-[0.24em] text-primary">
              The YFJ Difference
            </span>
            <h2 className="mt-2 font-display text-3xl sm:text-5xl font-bold text-foreground">
              Why Choose YFJ Matrimony?
            </h2>
            <p className="mt-3 text-base text-muted-foreground">
              Designed to support individuals and families at every step of the journey.
            </p>
            <div className="mt-3.5 mx-auto h-0.5 w-16 bg-gradient-to-r from-primary to-amber-500 rounded-full" />
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {whyChooseUs.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className="group relative rounded-3xl border border-border/80 bg-card p-7 shadow-card transition-all duration-300 hover:-translate-y-1.5 hover:border-amber-400/60 hover:shadow-raised"
                >
                  <div className="flex items-center justify-between mb-5">
                    <div
                      className={`flex size-12 items-center justify-center rounded-2xl border ${item.color} group-hover:scale-105 transition-transform shadow-xs`}
                    >
                      <Icon className="size-5.5" />
                    </div>
                    <span className="font-display text-2xl font-bold text-muted-foreground/30 group-hover:text-amber-600/50 transition-colors">
                      {item.number}
                    </span>
                  </div>

                  <h3 className="font-display text-xl sm:text-2xl font-bold text-foreground group-hover:text-primary transition-colors">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm text-foreground/75 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 5. Our Services: Clean Curated Showcase */}
      <section className="bg-surface/60 py-16 sm:py-24 border-b border-border/80">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <span className="text-xs font-bold uppercase tracking-[0.24em] text-primary">
              Comprehensive Platform
            </span>
            <h2 className="mt-2 font-display text-3xl sm:text-5xl font-bold text-foreground">
              Our Services
            </h2>
            <p className="mt-3 text-base text-muted-foreground">
              Essential matrimonial services engineered to make your matchmaking journey seamless.
            </p>
            <div className="mt-3.5 mx-auto h-0.5 w-16 bg-gradient-to-r from-primary to-amber-500 rounded-full" />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((service, index) => {
              const Icon = service.icon;
              return (
                <div
                  key={service.title}
                  className="group rounded-2xl border border-border/80 bg-card p-5.5 shadow-2xs hover:border-amber-400/60 hover:shadow-card transition-all duration-200"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex size-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-300/40 group-hover:scale-105 transition-transform">
                      <Icon className="size-5" />
                    </div>
                    <span className="text-xs font-bold text-muted-foreground/50">0{index + 1}</span>
                  </div>
                  <h4 className="font-display text-lg font-bold text-foreground group-hover:text-primary transition-colors">
                    {service.title}
                  </h4>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1.5 leading-relaxed">
                    {service.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 6. Our Values: 5 Guiding Principles */}
      <section className="bg-background py-16 sm:py-24 border-b border-border/80">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <span className="text-xs font-bold uppercase tracking-[0.24em] text-primary">
              Guiding Principles
            </span>
            <h2 className="mt-2 font-display text-3xl sm:text-5xl font-bold text-foreground">
              Our Values
            </h2>
            <p className="mt-3 text-base text-muted-foreground">
              The core principles that guide our interactions, technology, and matchmaking service.
            </p>
            <div className="mt-3.5 mx-auto h-0.5 w-16 bg-gradient-to-r from-primary to-amber-500 rounded-full" />
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
            {coreValues.map((value) => {
              const Icon = value.icon;
              return (
                <div
                  key={value.name}
                  className="group relative rounded-3xl border border-border/90 bg-card p-6 shadow-card transition-all duration-300 hover:-translate-y-1.5 hover:border-amber-400/60 hover:shadow-raised text-center flex flex-col items-center"
                >
                  <div className="flex size-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-300/40 shadow-xs group-hover:scale-110 transition-transform mb-4">
                    <Icon className="size-6.5" />
                  </div>
                  <span className="text-[0.68rem] font-bold uppercase tracking-wider text-primary mb-1">
                    {value.tag}
                  </span>
                  <h3 className="font-display text-xl font-bold text-foreground">{value.name}</h3>
                  <p className="mt-2 text-xs sm:text-sm text-foreground/75 leading-relaxed">
                    {value.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 7. Grand Finale Call To Action */}
      <section className="relative overflow-hidden bg-stone-950 py-20 text-white sm:py-28">
        <div className="absolute inset-0 z-0">
          <img
            src={heroBg}
            alt=""
            className="h-full w-full object-cover object-bottom opacity-20 filter brightness-75"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/90 to-stone-950/70" />
        </div>

        <div className="relative z-10 mx-auto max-w-4xl px-4 text-center sm:px-6">
          <div className="mx-auto flex size-14 items-center justify-center rounded-full border border-amber-400/60 bg-amber-500/10 text-amber-300 shadow-xl shadow-amber-950/50 mb-6">
            <UserCheck className="size-7" />
          </div>

          <h2 className="font-display text-3xl sm:text-5xl lg:text-6xl font-bold text-white tracking-tight leading-tight">
            Ready to Begin Your Journey?
          </h2>

          <p className="mx-auto mt-4 max-w-xl text-base sm:text-lg text-stone-200/90 leading-relaxed font-light">
            Helping you take the first step toward a happy married life. Connect with verified
            brides and grooms who share your family values and aspirations.
          </p>

          <div className="mt-7 inline-block rounded-full border border-amber-400/40 bg-stone-900/80 px-6 py-2 text-xs sm:text-sm font-semibold text-amber-200">
            YFJ Matrimony – Bringing Hearts Together, Building Beautiful Futures.
          </div>

          <div className="mt-9 flex flex-wrap justify-center gap-4">
            <Button
              asChild
              size="lg"
              className="rounded-full bg-primary hover:bg-primary/90 text-white px-8 text-base shadow-xl shadow-rose-950/40 cursor-pointer"
            >
              <Link to="/register">
                Register Free Today <ArrowRight className="ml-2 size-4" />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="rounded-full border-amber-400/40 bg-white/10 text-white hover:bg-white/20 hover:text-white px-8 text-base backdrop-blur-md cursor-pointer"
            >
              <Link to="/app/browse">
                <Search className="mr-2 size-4 text-amber-300" /> Explore Profiles
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
