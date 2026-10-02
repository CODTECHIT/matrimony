import { Link, useNavigate } from "@tanstack/react-router";
import { BadgeCheck, MessageCircle, Trash2, UserMinus } from "lucide-react";
import { toast } from "sonner";
import type { Interest } from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getProfileAvatar, handleImageError } from "@/lib/images";
import { messagesService } from "@/services";

const statusLabel: Record<Interest["status"], string> = {
  pending: "Awaiting reply",
  accepted: "Accepted",
  declined: "Declined",
};

export function InterestList({
  interests,
  mode,
  onRespond,
  onUnfriend,
  onDelete,
}: {
  interests: Interest[];
  mode: "sent" | "received";
  onRespond?: (interest: Interest, action: "accept" | "decline") => void;
  onUnfriend?: (interest: Interest) => void;
  onDelete?: (interest: Interest) => void;
}) {
  const navigate = useNavigate();

  const handleMessage = async (interest: Interest) => {
    try {
      let convId = interest.conversationId || interest.profile.conversationId;
      if (!convId) {
        const res = await messagesService.start(
          interest.profile.id,
          interest.profile.fullName,
          interest.profile.photos,
        );
        convId = res.id;
      }
      void navigate({
        to: "/app/messages/$conversationId",
        params: { conversationId: convId },
      });
    } catch {
      toast.error("Could not open chat with this member");
    }
  };
  return (
    <ul className="space-y-3">
      {interests.map((interest) => (
        <li
          key={interest.id}
          className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3 rounded-2xl border border-border bg-card p-3 shadow-card sm:flex sm:justify-between"
        >
          <Link
            to="/app/profiles/$profileId"
            params={{ profileId: interest.profile.displayId || interest.profile.id }}
            className="contents sm:flex sm:min-w-0 sm:items-center sm:gap-3"
          >
            <img
              src={getProfileAvatar(interest.profile.photos?.[0], interest.profile.gender)}
              alt={interest.profile.fullName}
              loading="lazy"
              width={120}
              height={120}
              onError={(e) => handleImageError(e, interest.profile.gender)}
              className="size-16 shrink-0 rounded-xl object-cover"
            />
            <span className="min-w-0">
              <span className="flex items-center gap-1.5">
                <span className="truncate font-display text-lg font-semibold">
                  {interest.profile.fullName}, {interest.profile.age}
                </span>
                <span className="inline-flex items-center rounded-md bg-amber-500/10 border border-amber-400/30 px-1.5 py-0.5 text-[0.65rem] font-bold text-amber-700 dark:text-amber-300 shrink-0">
                  {interest.profile.displayId || interest.profile.id.slice(0, 8)}
                </span>
                {interest.profile.verified ? (
                  <BadgeCheck className="size-4 shrink-0 text-primary" />
                ) : null}
              </span>
              <span className="block truncate text-xs text-muted-foreground">
                {interest.profile.occupation} · {interest.profile.city}
              </span>
            </span>
          </Link>

          <div className="col-span-2 flex items-center justify-between gap-2 sm:col-auto sm:shrink-0">
            <Badge
              variant={
                interest.status === "accepted"
                  ? "default"
                  : interest.status === "declined"
                    ? "destructive"
                    : "secondary"
              }
            >
              {statusLabel[interest.status]}
            </Badge>
            {interest.status === "accepted" && (
              <Button
                size="sm"
                onClick={() => void handleMessage(interest)}
                className="rounded-full text-xs h-8 px-3 bg-[#D92662] hover:bg-[#C2185B] text-white font-semibold shadow-xs cursor-pointer gap-1.5"
                title="Send message"
              >
                <MessageCircle className="size-3.5" />
                Message
              </Button>
            )}
            {mode === "received" && interest.status === "pending" && onRespond ? (
              <div className="flex gap-2">
                <Button size="sm" variant="neutral" onClick={() => onRespond(interest, "decline")}>
                  Decline
                </Button>
                <Button size="sm" onClick={() => onRespond(interest, "accept")}>
                  Accept
                </Button>
              </div>
            ) : null}
            {interest.status === "accepted" && onUnfriend ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onUnfriend(interest)}
                className="rounded-full text-xs h-8 px-2.5 border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:border-rose-900/50 dark:text-rose-400 cursor-pointer"
                title="Unfriend and disconnect"
              >
                <UserMinus className="size-3.5 mr-1" />
                Unfriend
              </Button>
            ) : null}
            {(interest.status === "declined" || mode === "sent") && onDelete ? (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onDelete(interest)}
                className="rounded-full text-xs h-8 px-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                title="Delete from list"
              >
                <Trash2 className="size-3.5 mr-1" />
                {mode === "sent" && interest.status === "pending" ? "Cancel" : "Delete"}
              </Button>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}
