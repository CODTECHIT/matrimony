import { Link } from "@tanstack/react-router";
import { BadgeCheck } from "lucide-react";
import type { Interest } from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getProfileAvatar, handleImageError } from "@/lib/images";

const statusLabel: Record<Interest["status"], string> = {
  pending: "Awaiting reply",
  accepted: "Accepted",
  declined: "Declined",
};

export function InterestList({
  interests,
  mode,
  onRespond,
}: {
  interests: Interest[];
  mode: "sent" | "received";
  onRespond?: (interest: Interest, action: "accept" | "decline") => void;
}) {
  return (
    <ul className="space-y-3">
      {interests.map((interest) => (
        <li
          key={interest.id}
          className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3 rounded-2xl border border-border bg-card p-3 shadow-card sm:flex sm:justify-between"
        >
          <Link
            to="/app/profiles/$profileId"
            params={{ profileId: interest.profile.id }}
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
          </div>
        </li>
      ))}
    </ul>
  );
}
