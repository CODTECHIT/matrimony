import { useState, useEffect } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  BadgeCheck,
  CheckCircle2,
  AlertCircle,
  Pencil,
  User,
  GraduationCap,
  Image as ImageIcon,
  Users,
  FileText,
  Briefcase,
  MapPin,
  Heart,
  Sparkles,
  Phone,
  Mail,
  Home,
  Compass,
  Crown,
  Moon,
} from "lucide-react";
import { ErrorState, LoadingState } from "@/components/common/states";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { profilesService } from "@/services";
import { useAuth } from "@/hooks/useAuth";
import { getProfileAvatar, handleImageError } from "@/lib/images";

export const Route = createFileRoute("/app/my-profile/")({
  head: () => ({
    meta: [
      { title: "My Profile — YFJ Matrimony" },
      {
        name: "description",
        content:
          "View your complete matrimony profile details, verification status, and checklist.",
      },
      { property: "og:title", content: "My Profile — YFJ Matrimony" },
      { property: "og:description", content: "Your full profile details and partner preferences." },
    ],
  }),
  component: MyProfilePage,
});

function Detail({ label, value }: { label: string; value?: string | undefined }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border/70 py-2.5 last:border-0">
      <dt className="text-xs sm:text-sm text-muted-foreground">{label}</dt>
      <dd className="text-right text-xs sm:text-sm font-semibold text-foreground">
        {value || "—"}
      </dd>
    </div>
  );
}

function MyProfilePage() {
  const { user, refresh } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"preview" | "completion">(() => {
    if (typeof window !== "undefined" && window.innerWidth >= 768) {
      return "preview";
    }
    return "completion";
  });
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const query = useQuery({ queryKey: ["my-profile"], queryFn: () => profilesService.myProfile() });

  useEffect(() => {
    if (
      query.data &&
      user &&
      typeof query.data.profileCompletion === "number" &&
      user.profileCompletion !== query.data.profileCompletion
    ) {
      void refresh();
    }
  }, [query.data, user, refresh]);

  if (query.isPending) return <LoadingState label="Loading your profile…" />;
  if (query.isError || !query.data) return <ErrorState onRetry={() => void query.refetch()} />;

  const profile = query.data;

  const hasBasic = Boolean(profile.fullName && (profile.age || profile.dateOfBirth) && profile.maritalStatus);
  const hasCommunity = Boolean(profile.religion || profile.motherTongue);
  const hasEducation = Boolean(profile.education || profile.occupation);
  const hasPhotos = Boolean(profile.photos && profile.photos.length >= 1);
  const hasFamily = Boolean(
    profile.family &&
    (profile.family.familyType ||
      profile.family.fatherOccupation ||
      profile.family.motherOccupation ||
      profile.family.siblings),
  );

  const completionItems = [
    {
      id: "basic",
      title: "Basic Information",
      icon: FileText,
      status: hasBasic ? ("completed" as const) : ("warning" as const),
    },
    {
      id: "community",
      title: "Community & Religion",
      icon: Sparkles,
      status: hasCommunity ? ("completed" as const) : ("warning" as const),
    },
    {
      id: "education",
      title: "Education & Career",
      icon: GraduationCap,
      status: hasEducation ? ("completed" as const) : ("warning" as const),
    },
    {
      id: "photos",
      title: "Photos",
      icon: ImageIcon,
      status: hasPhotos ? ("completed" as const) : ("warning" as const),
    },
    {
      id: "family",
      title: "Family Details",
      icon: Users,
      status: hasFamily ? ("completed" as const) : ("warning" as const),
    },
  ];

  const completedCount = [hasBasic, hasCommunity, hasEducation, hasPhotos, hasFamily].filter(Boolean).length;
  const calculatedPercentage = Math.round((completedCount / 5) * 100);
  const completionPercentage = profile.profileCompletion ?? calculatedPercentage;

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-20">
      {/* Mobile Top Header matching Screen 3 exactly */}
      <div className="flex md:hidden items-center justify-between py-2">
        <button
          type="button"
          onClick={() => void navigate({ to: "/app" })}
          className="grid size-10 place-items-center rounded-full border border-border bg-white text-foreground hover:bg-muted shadow-xs transition-colors cursor-pointer"
          aria-label="Back to dashboard"
        >
          <ArrowLeft className="size-5" />
        </button>
        <h1 className="font-display text-xl font-bold text-foreground">
          {activeTab === "completion" ? "Complete Your Profile" : "Profile Preview"}
        </h1>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setActiveTab(activeTab === "completion" ? "preview" : "completion")}
            className="text-xs font-semibold text-[#D92662] cursor-pointer"
          >
            {activeTab === "completion" ? "View Details" : "Checklist"}
          </Button>
        </div>
      </div>

      {/* Desktop Top Header Navigation with Gold Accents */}
      <div className="hidden md:flex items-center justify-between py-2 border-b border-amber-500/20 pb-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => void navigate({ to: "/app" })}
            className="grid size-10 place-items-center rounded-full border border-amber-500/30 bg-card text-foreground hover:bg-muted shadow-xs transition-colors cursor-pointer"
            aria-label="Back to dashboard"
          >
            <ArrowLeft className="size-5" />
          </button>
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">
              {activeTab === "preview" ? "My Complete Profile" : "Profile Completion Checklist"}
            </h1>
            <p className="text-xs text-muted-foreground">
              {activeTab === "preview"
                ? "This is how potential matches and their families see your profile"
                : "Complete all sections to maximize high-quality match responses"}
            </p>
          </div>
        </div>

        {/* Tab Switcher Pills */}
        <div className="flex items-center gap-1 rounded-full border border-amber-400/40 bg-card p-1 shadow-xs">
          <button
            type="button"
            onClick={() => setActiveTab("preview")}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "preview"
                ? "bg-primary text-white shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Full Profile
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("completion")}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "completion"
                ? "bg-primary text-white shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Checklist ({completionPercentage}%)
          </button>
        </div>
      </div>

      {activeTab === "preview" ? (
        /* Full Profile View - All Sections Displayed */
        <div className="space-y-6">
          {/* Hero Profile Overview Card with Gold Border */}
          <div className="rounded-3xl border-2 border-amber-400/40 bg-card p-6 shadow-xl shadow-amber-950/5 gold-glow">
            <div className="grid gap-6 md:grid-cols-12 items-center">
              {/* Profile Photo with Gallery Thumbnails */}
              <div className="md:col-span-4 space-y-3">
                <div className="relative overflow-hidden rounded-2xl aspect-[4/5] border border-amber-400/40 shadow-card">
                  <img
                    src={getProfileAvatar(
                      profile.photos[selectedPhotoIndex] ?? profile.photos[0],
                      profile.gender,
                    )}
                    alt={profile.fullName}
                    onError={(e) => handleImageError(e, profile.gender)}
                    className="size-full object-cover"
                  />
                  <div className="absolute top-3 right-3 rounded-full bg-black/60 backdrop-blur-md px-3 py-1 text-xs font-semibold text-white">
                    {selectedPhotoIndex + 1}/{profile.photos.length || 1}
                  </div>
                </div>

                {/* Thumbnails */}
                {profile.photos.length > 1 ? (
                  <div className="flex gap-2 justify-center">
                    {profile.photos.map((photo, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => setSelectedPhotoIndex(index)}
                        className={`size-12 rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                          selectedPhotoIndex === index
                            ? "border-primary scale-105 shadow-xs"
                            : "border-border opacity-70 hover:opacity-100"
                        }`}
                      >
                        <img
                          src={getProfileAvatar(photo, profile.gender)}
                          alt=""
                          onError={(e) => handleImageError(e, profile.gender)}
                          className="size-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>

              {/* Main Information & Quick Actions */}
              <div className="md:col-span-8 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/80 pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="font-display text-3xl font-bold text-foreground">
                        {profile.fullName}
                      </h2>
                      {profile.verified ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 border border-amber-400/40 px-2.5 py-0.5 text-xs font-semibold text-amber-700 dark:text-amber-300">
                          <BadgeCheck className="size-4 text-amber-500" /> Verified
                        </span>
                      ) : null}
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {profile.age} Yrs · {profile.height} · {profile.religion} ({profile.caste}) ·{" "}
                      {profile.city}, {profile.state}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      asChild
                      size="sm"
                      className="rounded-full bg-primary hover:bg-primary/90 text-white font-semibold cursor-pointer"
                    >
                      <Link to="/app/my-profile/edit">
                        <Pencil className="mr-1.5 size-3.5" /> Edit Profile
                      </Link>
                    </Button>
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className="rounded-full border-amber-500/40 text-amber-800 dark:text-amber-300 hover:bg-amber-500/10 cursor-pointer"
                    >
                      <Link to="/app/upgrade">
                        <Crown className="mr-1.5 size-3.5 text-amber-500" /> Upgrade Plan
                      </Link>
                    </Button>
                  </div>
                </div>

                {/* Badges Overview */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="rounded-2xl border border-amber-400/30 bg-amber-500/5 p-3 text-center">
                    <p className="text-xs text-muted-foreground">Membership</p>
                    <p className="font-bold text-amber-700 dark:text-amber-300 uppercase text-xs sm:text-sm mt-0.5">
                      {user?.plan ?? "Gold Member"}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-border bg-card p-3 text-center">
                    <p className="text-xs text-muted-foreground">Profile Status</p>
                    <p className="font-bold text-emerald-600 text-xs sm:text-sm mt-0.5">
                      Active & Approved
                    </p>
                  </div>
                  <div className="rounded-2xl border border-border bg-card p-3 text-center">
                    <p className="text-xs text-muted-foreground">Profile ID</p>
                    <p className="font-bold text-foreground text-xs sm:text-sm mt-0.5">
                      {profile.id}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-border bg-card p-3 text-center">
                    <p className="text-xs text-muted-foreground">Completion</p>
                    <p className="font-bold text-primary text-xs sm:text-sm mt-0.5">
                      {completionPercentage}%
                    </p>
                  </div>
                </div>

                {/* About Excerpt */}
                <div className="rounded-2xl border border-border/80 bg-muted/30 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                    About Me
                  </p>
                  <p className="text-sm leading-relaxed text-foreground">
                    {profile.about ||
                      "No bio added yet. Tell families about your values, aspirations, and interests."}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Grid of Authentic Profile Sections matching user input */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Section: Basic Information */}
            <div className="rounded-3xl border border-amber-400/30 bg-card p-5 sm:p-6 shadow-sm">
              <div className="flex items-center justify-between border-b border-border/80 pb-3 mb-3">
                <div className="flex items-center gap-2">
                  <span className="grid size-9 place-items-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                    <User className="size-4.5" />
                  </span>
                  <h3 className="font-display text-lg font-bold text-foreground">
                    Basic Information
                  </h3>
                </div>
                <Link
                  to="/app/my-profile/edit"
                  hash="basic"
                  className="text-xs font-semibold text-[#D92662] hover:underline flex items-center gap-1"
                >
                  <Pencil className="size-3" /> Edit
                </Link>
              </div>
              <dl className="space-y-0.5">
                <Detail label="Full Name" value={profile.fullName || user?.fullName} />
                <Detail
                  label="Gender"
                  value={
                    profile.gender
                      ? profile.gender.toLowerCase() === "female"
                        ? "Female"
                        : "Male"
                      : "Not specified"
                  }
                />
                <Detail
                  label="Age / Date of Birth"
                  value={profile.age ? `${profile.age} Years` : "Not specified"}
                />
                <Detail label="Height" value={profile.height || "Not specified"} />
                <Detail
                  label="Marital Status"
                  value={
                    profile.maritalStatus
                      ? profile.maritalStatus
                          .replace(/_/g, " ")
                          .replace(/\b\w/g, (c) => c.toUpperCase())
                      : "Not specified"
                  }
                />
                <Detail label="Mother Tongue" value={profile.motherTongue || "Not specified"} />
              </dl>
            </div>

            {/* Section: Community & Religion */}
            <div className="rounded-3xl border border-amber-400/30 bg-card p-5 sm:p-6 shadow-sm">
              <div className="flex items-center justify-between border-b border-border/80 pb-3 mb-3">
                <div className="flex items-center gap-2">
                  <span className="grid size-9 place-items-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                    <Sparkles className="size-4.5" />
                  </span>
                  <h3 className="font-display text-lg font-bold text-foreground">
                    Community & Religion
                  </h3>
                </div>
                <Link
                  to="/app/my-profile/edit"
                  hash="community"
                  className="text-xs font-semibold text-[#D92662] hover:underline flex items-center gap-1"
                >
                  <Pencil className="size-3" /> Edit
                </Link>
              </div>
              <dl className="space-y-0.5">
                <Detail label="Religion" value={profile.religion || "Not specified"} />
                <Detail label="Caste / Community" value={profile.caste || "Not specified"} />
                <Detail label="Mother Tongue" value={profile.motherTongue || "Not specified"} />
              </dl>
            </div>

            {/* Section: Education & Career */}
            <div className="rounded-3xl border border-amber-400/30 bg-card p-5 sm:p-6 shadow-sm">
              <div className="flex items-center justify-between border-b border-border/80 pb-3 mb-3">
                <div className="flex items-center gap-2">
                  <span className="grid size-9 place-items-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                    <GraduationCap className="size-4.5" />
                  </span>
                  <h3 className="font-display text-lg font-bold text-foreground">
                    Education & Career
                  </h3>
                </div>
                <Link
                  to="/app/my-profile/edit"
                  hash="career"
                  className="text-xs font-semibold text-[#D92662] hover:underline flex items-center gap-1"
                >
                  <Pencil className="size-3" /> Edit
                </Link>
              </div>
              <dl className="space-y-0.5">
                <Detail
                  label="Highest Qualification"
                  value={profile.education || "Not specified"}
                />
                <Detail label="Occupation / Title" value={profile.occupation || "Not specified"} />
                <Detail
                  label="Employment Sector"
                  value={profile.employmentStatus || "Not specified"}
                />
                <Detail label="Annual Income" value={profile.incomeRange || "Not specified"} />
                <Detail
                  label="Working Location"
                  value={
                    profile.city
                      ? profile.state
                        ? `${profile.city}, ${profile.state}`
                        : profile.city
                      : "Not specified"
                  }
                />
              </dl>
            </div>

            {/* Section: Family Background */}
            <div className="rounded-3xl border border-amber-400/30 bg-card p-5 sm:p-6 shadow-sm">
              <div className="flex items-center justify-between border-b border-border/80 pb-3 mb-3">
                <div className="flex items-center gap-2">
                  <span className="grid size-9 place-items-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                    <Home className="size-4.5" />
                  </span>
                  <h3 className="font-display text-lg font-bold text-foreground">
                    Family Background
                  </h3>
                </div>
                <Link
                  to="/app/my-profile/edit"
                  hash="about"
                  className="text-xs font-semibold text-[#D92662] hover:underline flex items-center gap-1"
                >
                  <Pencil className="size-3" /> Edit
                </Link>
              </div>
              <dl className="space-y-0.5">
                <Detail label="Family Type" value={profile.family?.familyType || "Not specified"} />
                <Detail
                  label="Family Values"
                  value={profile.family?.familyValues || "Not specified"}
                />
                <Detail
                  label="Father's Occupation"
                  value={profile.family?.fatherOccupation || "Not specified"}
                />
                <Detail
                  label="Mother's Occupation"
                  value={profile.family?.motherOccupation || "Not specified"}
                />
                <Detail label="Siblings" value={profile.family?.siblings || "Not specified"} />
                <Detail
                  label="Native Place / Location"
                  value={
                    profile.state
                      ? `${profile.state}, ${profile.country || "India"}`
                      : profile.country || "Not specified"
                  }
                />
              </dl>
            </div>

            {/* Section: Location & Contact */}
            <div className="rounded-3xl border border-amber-400/30 bg-card p-5 sm:p-6 shadow-sm md:col-span-2">
              <div className="flex items-center justify-between border-b border-border/80 pb-3 mb-3">
                <div className="flex items-center gap-2">
                  <span className="grid size-9 place-items-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                    <MapPin className="size-4.5" />
                  </span>
                  <h3 className="font-display text-lg font-bold text-foreground">
                    Location & Contact
                  </h3>
                </div>
                <Link
                  to="/app/my-profile/edit"
                  hash="career"
                  className="text-xs font-semibold text-[#D92662] hover:underline flex items-center gap-1"
                >
                  <Pencil className="size-3" /> Edit
                </Link>
              </div>
              <div className="grid gap-x-8 sm:grid-cols-2">
                <dl className="space-y-0.5">
                  <Detail label="Residing City" value={profile.city || "Not specified"} />
                  <Detail label="State" value={profile.state || "Not specified"} />
                  <Detail label="Country" value={profile.country || "India"} />
                </dl>
                <dl className="space-y-0.5">
                  <Detail label="Citizenship" value="Indian" />
                  <Detail
                    label="Registered Mobile"
                    value={user?.mobile || profile.contact?.mobile || "Not specified"}
                  />
                  <Detail label="Email Address" value={user?.email || "Not specified"} />
                </dl>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Completion Checklist Tab matching Screen 3 exactly on mobile */
        <div className="md:grid md:grid-cols-12 md:gap-8 items-start space-y-6 md:space-y-0">
          {/* Left Column: Circular Gauge & Continue Button matching Screen 3 */}
          <div className="md:col-span-5 md:sticky md:top-24 rounded-3xl bg-white dark:bg-card p-6 border border-border md:border-2 md:border-amber-400/40 shadow-card md:shadow-xl md:gold-glow flex flex-col items-center text-center">
            {/* Circular Progress Meter */}
            <div className="relative flex size-36 items-center justify-center">
              {/* SVG Circular Ring */}
              <svg className="size-full -rotate-90" viewBox="0 0 100 100">
                {/* Background Ring */}
                <circle cx="50" cy="50" r="42" fill="none" stroke="#FCE7F3" strokeWidth="8" />
                {/* Progress Ring in Gold */}
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  fill="none"
                  stroke="#C59B27"
                  strokeWidth="8"
                  strokeDasharray="264"
                  strokeDashoffset={264 - (264 * completionPercentage) / 100}
                  strokeLinecap="round"
                  className="transition-all duration-1000 ease-out"
                />
              </svg>
              <span className="absolute font-display text-3xl font-bold text-foreground">
                {completionPercentage}%
              </span>
            </div>

            <h2 className="mt-4 font-display text-2xl font-bold text-foreground">Almost there!</h2>
            <p className="mt-1 text-xs sm:text-sm text-muted-foreground max-w-xs">
              Complete your profile to get up to 3× more match responses
            </p>

            <div className="mt-6 w-full">
              <Button
                asChild
                size="lg"
                className="w-full h-13 rounded-2xl bg-[#D92662] hover:bg-[#C2185B] text-white font-bold text-base shadow-lg shadow-rose-950/20 cursor-pointer"
              >
                <Link to="/app/my-profile/edit">Continue</Link>
              </Button>
            </div>
          </div>

          {/* Right Column: Checklist Cards matching Screen 3 */}
          <div className="md:col-span-7 space-y-3">
            {completionItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.id}
                  to="/app/my-profile/edit"
                  className="flex items-center justify-between rounded-2xl border border-border md:border-amber-400/30 bg-white dark:bg-card p-4 shadow-xs hover:shadow-md hover:border-[#D92662]/40 transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-3.5">
                    <span className="grid size-11 place-items-center rounded-2xl bg-rose-50/70 text-foreground group-hover:bg-rose-100/70 transition-colors">
                      <Icon className="size-5 text-[#D92662]" />
                    </span>
                    <div>
                      <span className="text-sm font-bold text-foreground block">{item.title}</span>
                      <span className="text-xs text-muted-foreground">
                        {item.status === "completed" ? "Completed" : "Needs attention"}
                      </span>
                    </div>
                  </div>

                  {item.status === "completed" ? (
                    <span className="flex size-7 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40">
                      <CheckCircle2 className="size-5 fill-emerald-500 text-white" />
                    </span>
                  ) : (
                    <span className="flex size-7 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-950/40">
                      <AlertCircle className="size-5 fill-amber-500 text-white" />
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
