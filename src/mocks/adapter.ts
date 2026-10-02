import type { Profile, ProfileFilters } from "@/types";
import { mockProfiles } from "./data";

/** Small helper so mock responses behave like real async API calls. */
export function delay<T>(value: T, ms = 320): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

const shortlisted = new Set<string>(["p-3"]);
const interests = new Set<string>(["p-2"]);
/** Profiles whose interest was accepted — the user is now connected/friends with them. */
const connected = new Set<string>(["p-2", "p-6"]);
/** Maps a profile id to the conversation id shared with the current user. */
const conversationIds: Record<string, string> = { "p-2": "c-1", "p-6": "c-2" };

export const mockState = {
  isShortlisted: (id: string) => shortlisted.has(id),
  toggleShortlist(id: string) {
    if (shortlisted.has(id)) shortlisted.delete(id);
    else shortlisted.add(id);
    return shortlisted.has(id);
  },
  hasInterest: (id: string) => interests.has(id),
  sendInterest(id: string) {
    interests.add(id);
  },
  isConnected: (id: string) => connected.has(id),
  getConversationId: (id: string) => conversationIds[id],
  shortlistedIds: () => [...shortlisted],
};

function decorate(profile: Profile): Profile {
  const convId = mockState.getConversationId(profile.id);
  return {
    ...profile,
    shortlisted: mockState.isShortlisted(profile.id),
    interestSent: mockState.hasInterest(profile.id),
    isConnected: mockState.isConnected(profile.id),
    ...(convId !== undefined ? { conversationId: convId } : {}),
  };
}

export function filterProfiles(filters: ProfileFilters) {
  const {
    query,
    gender,
    ageMin,
    ageMax,
    religion,
    caste,
    maritalStatus,
    education,
    occupation,
    incomeRange,
    city,
    sort = "recent",
    page = 1,
    pageSize = 12,
  } = filters;

  // FIX 1: Only show profiles approved by admin. Profiles without a status (old data) are allowed.
  let items = mockProfiles
    .filter((p) => !p.profileStatus || p.profileStatus === "approved")
    .map(decorate);

  if (query) {
    const q = query.toLowerCase();
    items = items.filter(
      (p) => p.fullName.toLowerCase().includes(q) || p.id.toLowerCase().includes(q),
    );
  }
  if (gender) items = items.filter((p) => p.gender === gender);
  if (ageMin) items = items.filter((p) => p.age >= ageMin);
  if (ageMax) items = items.filter((p) => p.age <= ageMax);
  if (religion) items = items.filter((p) => p.religion === religion);
  if (caste) items = items.filter((p) => p.caste === caste);
  if (maritalStatus) items = items.filter((p) => p.maritalStatus === maritalStatus);
  if (education) items = items.filter((p) => p.education.includes(education));
  if (occupation) items = items.filter((p) => p.occupation === occupation);
  if (incomeRange) items = items.filter((p) => p.incomeRange === incomeRange);
  if (city) items = items.filter((p) => p.city === city);

  if (sort === "age_asc") items = [...items].sort((a, b) => a.age - b.age);
  else if (sort === "age_desc") items = [...items].sort((a, b) => b.age - a.age);
  else {
    // FIX 5: VIP/highlighted profiles always sort to the top within any sort mode
    items = [...items].sort((a, b) => (b.isVip ? 1 : 0) - (a.isVip ? 1 : 0));
  }

  const total = items.length;
  const start = (page - 1) * pageSize;
  return { items: items.slice(start, start + pageSize), page, pageSize, total };
}

export function findProfile(id: string): Profile | undefined {
  const profile = mockProfiles.find((p) => p.id === id);
  return profile ? decorate(profile) : undefined;
}

export function shortlistedProfiles(): Profile[] {
  return mockProfiles.filter((p) => mockState.isShortlisted(p.id)).map(decorate);
}

export function recommendedProfiles(user?: { gender?: string } | null): Profile[] {
  // If user is female, recommend male profiles; if male, recommend female profiles
  const userGender = user?.gender?.toLowerCase() || "female";
  const targetGender = userGender === "female" ? "male" : "female";

  // FIX 1: Only approved profiles appear in recommendations
  const candidates = mockProfiles.filter(
    (p) => p.gender.toLowerCase() === targetGender && (!p.profileStatus || p.profileStatus === "approved"),
  );

  const scored = candidates.map((p) => {
    let score = 55; // Base baseline

    // Religion & Community
    if (p.religion === "Hindu") score += 15;
    if (p.caste && p.caste !== "—") score += 5;

    // Mother Tongue
    if (p.motherTongue === "Hindi") score += 10;
    else score += 5;

    // Age alignment
    const userAge = 26;
    const diff = p.age - userAge;
    if (targetGender === "male") {
      if (diff >= 1 && diff <= 4) score += 15;
      else if (diff >= -1 && diff <= 6) score += 10;
      else score += 5;
    } else {
      if (diff <= 1 && diff >= -4) score += 15;
      else if (diff <= 3 && diff >= -6) score += 10;
      else score += 5;
    }

    // Verification boost
    if (p.verified) score += 5;

    const matchScore = Math.min(98, Math.max(68, score));
    return {
      ...decorate(p),
      matchScore,
    };
  });

  scored.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));
  return scored.slice(0, 6);
}
