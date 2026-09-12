import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Camera, CheckCircle2, HeartHandshake, Sparkles, ArrowRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/useAuth";

const POPUP_DISMISS_KEY = "yfj_dismiss_profile_popup";

export function CompleteProfileDialog() {
  const { user, status } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // Only check if user is authenticated
    if (status !== "authenticated" || !user) return;

    // Show popup if profile completion is under 80% and not already dismissed in this session
    const isDismissed = sessionStorage.getItem(POPUP_DISMISS_KEY) === "true";
    const completion = user.profileCompletion ?? 40;

    if (!isDismissed && completion < 80) {
      // Small timeout for smooth entry animation after login page transition
      const timer = setTimeout(() => {
        setOpen(true);
      }, 600);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [status, user]);

  const handleDismiss = () => {
    sessionStorage.setItem(POPUP_DISMISS_KEY, "true");
    setOpen(false);
  };

  const handleCompleteNow = () => {
    sessionStorage.setItem(POPUP_DISMISS_KEY, "true");
    setOpen(false);
    void navigate({ to: "/app/my-profile/edit" });
  };

  if (!user) return null;

  const completion = user.profileCompletion ?? 40;
  const firstName = user.fullName ? user.fullName.split(" ")[0] : "there";

  return (
    <Dialog open={open} onOpenChange={(val) => (!val ? handleDismiss() : setOpen(val))}>
      <DialogContent className="sm:max-w-md rounded-3xl p-6 sm:p-7 border-rose-100 shadow-2xl">
        <DialogHeader className="text-center sm:text-center space-y-2">
          <div className="mx-auto size-14 rounded-2xl bg-rose-50 border border-rose-100 text-[#D92662] flex items-center justify-center shadow-inner mb-1">
            <HeartHandshake className="size-7" />
          </div>
          <div className="inline-flex items-center justify-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200/70 text-amber-900 text-xs font-semibold mx-auto">
            <Sparkles className="size-3.5 text-amber-600" />
            <span>Profile {completion}% Complete</span>
          </div>
          <DialogTitle className="font-display text-2xl sm:text-[26px] font-bold text-foreground">
            Complete your profile, {firstName}!
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground leading-relaxed max-w-sm mx-auto">
            Profiles with photos and complete details receive up to{" "}
            <span className="font-semibold text-[#D92662]">3× more interest responses</span> from
            verified families.
          </DialogDescription>
        </DialogHeader>

        <div className="my-2 space-y-3">
          {/* Progress bar */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-semibold text-muted-foreground">
              <span>Profile Strength</span>
              <span className="text-[#D92662]">{completion}%</span>
            </div>
            <Progress value={completion} className="h-2.5 bg-rose-100/60" />
          </div>

          {/* Quick checklist of advantages */}
          <div className="rounded-2xl bg-muted/40 p-3.5 border border-border/60 space-y-2 text-xs">
            <div className="flex items-center gap-2.5 text-foreground">
              <Camera className="size-4 text-[#D92662] shrink-0" />
              <span>Add recent photos to gain instant trust</span>
            </div>
            <div className="flex items-center gap-2.5 text-foreground">
              <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
              <span>Fill in education & career to match partner criteria</span>
            </div>
            <div className="flex items-center gap-2.5 text-foreground">
              <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
              <span>Tell families about your values and lifestyle</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2 pt-1">
          <Button
            size="lg"
            onClick={handleCompleteNow}
            className="h-12 w-full rounded-2xl bg-[#D92662] hover:bg-[#C2185B] text-white font-semibold text-sm shadow-md shadow-rose-950/15 cursor-pointer"
          >
            <span>Complete Profile Now</span>
            <ArrowRight className="ml-1.5 size-4" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="text-xs text-muted-foreground hover:text-foreground cursor-pointer rounded-xl h-9"
          >
            I'll do this later
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
