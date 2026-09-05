import { useState } from "react";
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
} from "lucide-react";
import { ErrorState, LoadingState } from "@/components/common/states";
import { Button } from "@/components/ui/button";
import { profilesService } from "@/services";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/app/my-profile/")({
  head: () => ({
    meta: [
      { title: "Complete Your Profile — YFJ Matrimony" },
      {
        name: "description",
        content: "Review how your matrimony profile appears and keep your details completed.",
      },
      { property: "og:title", content: "My Profile — YFJ Matrimony" },
      { property: "og:description", content: "Complete your profile to get better matches." },
    ],
  }),
  component: MyProfilePage,
});

function Detail({ label, value }: { label: string; value?: string | undefined }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border py-2.5 last:border-0">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-right text-sm font-medium">{value || "—"}</dd>
    </div>
  );
}

const completionItems = [
  {
    id: "basic",
    title: "Basic Information",
    icon: User,
    status: "completed",
    color: "text-[#C59B27]",
  },
  {
    id: "about",
    title: "About Yourself",
    icon: FileText,
    status: "completed",
    color: "text-emerald-500",
  },
  {
    id: "education",
    title: "Education & Career",
    icon: GraduationCap,
    status: "completed",
    color: "text-emerald-500",
  },
  {
    id: "photos",
    title: "Photos",
    icon: ImageIcon,
    status: "warning",
    color: "text-amber-500",
  },
  {
    id: "family",
    title: "Family Details",
    icon: Users,
    status: "warning",
    color: "text-amber-500",
  },
];

function MyProfilePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"completion" | "preview">("completion");
  const query = useQuery({ queryKey: ["my-profile"], queryFn: () => profilesService.myProfile() });

  if (query.isPending) return <LoadingState label="Loading your profile" />;
  if (query.isError || !query.data) return <ErrorState onRetry={() => void query.refetch()} />;

  const profile = query.data;
  const completionPercentage = user?.profileCompletion ?? 75;

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-20">
      {/* Top Header matching Screen 3 */}
      <div className="flex items-center justify-between py-2">
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

      {activeTab === "completion" ? (
        /* Screen 3 Layout: Responsive 2-column on desktop (md:grid-cols-12), stacked on mobile */
        <div className="md:grid md:grid-cols-12 md:gap-8 items-start space-y-6 md:space-y-0">
          {/* Left Column: Circular Gauge & Continue Button */}
          <div className="md:col-span-5 md:sticky md:top-24 rounded-3xl bg-white p-6 border border-border shadow-card flex flex-col items-center text-center">
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
                  className="flex items-center justify-between rounded-2xl border border-border bg-white p-4 shadow-xs hover:shadow-md hover:border-[#D92662]/40 transition-all cursor-pointer group"
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
                    <span className="flex size-7 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                      <CheckCircle2 className="size-5 fill-emerald-500 text-white" />
                    </span>
                  ) : (
                    <span className="flex size-7 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                      <AlertCircle className="size-5 fill-amber-500 text-white" />
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      ) : (
        /* Profile Preview Mode: Responsive 2-column on desktop */
        <div className="md:grid md:grid-cols-12 md:gap-8 items-start space-y-6 md:space-y-0">
          <div className="md:col-span-5 md:sticky md:top-24 space-y-3">
            <img
              src={profile.photos[0]}
              alt={profile.fullName}
              width={640}
              height={800}
              className="aspect-[4/5] w-full rounded-3xl object-cover shadow-card"
            />
            <Button asChild variant="outline" className="w-full rounded-2xl h-12 cursor-pointer">
              <Link to="/app/my-profile/edit">
                <Pencil className="mr-2 size-4" /> Edit Profile & Photos
              </Link>
            </Button>
          </div>

          <div className="md:col-span-7 space-y-5 rounded-3xl border border-border bg-white p-6 shadow-card">
            <div className="flex items-center gap-2">
              <h2 className="font-display text-2xl font-bold text-foreground">
                {profile.fullName}, {profile.age}
              </h2>
              {profile.verified ? <BadgeCheck className="size-5 text-[#C59B27]" /> : null}
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">{profile.about}</p>

            <div className="pt-2 border-t border-border">
              <h3 className="font-display text-lg font-bold text-foreground mb-2">Basic Details</h3>
              <dl className="space-y-1">
                <Detail label="Height" value={profile.height} />
                <Detail label="Marital Status" value={profile.maritalStatus.replace(/_/g, " ")} />
                <Detail label="Mother Tongue" value={profile.motherTongue} />
                <Detail label="Religion" value={profile.religion} />
                <Detail label="Caste" value={profile.caste} />
              </dl>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
