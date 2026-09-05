import type { Profile, ProfileFilters } from "@/types";
import { mockProfiles } from "./data";

/** Small helper so mock responses behave like real async API calls. */
export function delay<T>(value: T, ms = 320): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

const shortlisted = new Set<string>(["p-3"]);
const interests = new Set<string>(["p-2"]);

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
  shortlistedIds: () => [...shortlisted],
};

function decorate(profile: Profile): Profile {
  return {
    ...profile,
    shortlisted: mockState.isShortlisted(profile.id),
    interestSent: mockState.hasInterest(profile.id),
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

  let items = mockProfiles.map(decorate);

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
  if (sort === "age_desc") items = [...items].sort((a, b) => b.age - a.age);

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
