import type { SyntheticEvent } from "react";
import { env } from "@/lib/env";

export const DEFAULT_AVATARS = {
  male: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&auto=format&fit=crop&q=80",
  female: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&auto=format&fit=crop&q=80",
} as const;

export function getProfileAvatar(photo?: string | null, gender?: string): string {
  const isFemale = (gender || "").toLowerCase() === "female";
  const defaultAvatar = isFemale ? DEFAULT_AVATARS.female : DEFAULT_AVATARS.male;

  if (!photo || typeof photo !== "string" || photo.trim() === "") {
    return defaultAvatar;
  }

  if (photo.startsWith("http://") || photo.startsWith("https://") || photo.startsWith("data:")) {
    return photo;
  }

  if (photo.startsWith("/uploads/") || photo.startsWith("uploads/")) {
    const cleanPath = photo.startsWith("/") ? photo : `/${photo}`;
    if (env.apiBaseUrl) {
      const apiOrigin = env.apiBaseUrl.replace(/\/api\/?$/, "");
      return `${apiOrigin}${cleanPath}`;
    }
  }

  return photo;
}

export function handleImageError(
  event: SyntheticEvent<HTMLImageElement, Event>,
  gender?: string,
) {
  const target = event.currentTarget;
  const isFemale = (gender || "").toLowerCase() === "female";
  const fallback = isFemale ? DEFAULT_AVATARS.female : DEFAULT_AVATARS.male;
  if (target.src !== fallback) {
    target.src = fallback;
  }
}
