/**
 * Canonical contracts and oracles derived from PROJECT.md
 */

/**
 * Sequential Profile ID Mathematical Oracle
 * PROJECT.md § 1. Sequential Profile ID Contract:
 * - 1 <= N <= 100: "P" + N (e.g. P1, P2, ..., P100)
 * - N > 100:
 *     Q = Math.floor((N - 101) / 100)
 *     R = ((N - 101) % 100) + 1
 *     Prefix = String.fromCharCode(65 + Q)
 *     Display ID = "P" + Prefix + R
 */
export function calculateProfileId(n: number): string {
  if (n <= 0) {
    throw new Error(`Profile sequence number must be >= 1, received: ${n}`);
  }
  if (n <= 100) {
    return `P${n}`;
  }
  const adjusted = n - 101;
  const q = Math.floor(adjusted / 100);
  const r = (adjusted % 100) + 1;
  const prefix = String.fromCharCode(65 + q);
  return `P${prefix}${r}`;
}

export const PROFILE_ID_REGEX = /^P([A-Z]*[0-9]+)$/;
export const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Known seed UUIDs to be purged (Feature F1)
 */
export const SEED_ACCOUNT_IDS = [
  "11111111-1111-1111-1111-111111111111", // Ananya Iyer
  "22222222-2222-2222-2222-222222222222", // Rohan Deshpande
  "33333333-3333-3333-3333-333333333333", // Meera Nair
  "44444444-4444-4444-4444-444444444444", // Aditya Verma
];

/**
 * 6 Canonical Profile Sections and 22 Fields (Feature F3)
 */
export const PROFILE_SECTIONS = {
  basic: ["height", "dateOfBirth", "maritalStatus"],
  community: ["religion", "caste", "motherTongue"],
  career: ["education", "occupation", "employmentStatus", "incomeRange"],
  location: ["city", "state", "country", "whatsapp"],
  family: ["fatherOccupation", "motherOccupation", "siblings", "familyType", "familyValues"],
  about: ["about", "avatarUrl", "photos"],
};

/**
 * Plan Quota Constants (Feature F9)
 */
export const PLAN_LIMITS = {
  free: {
    dailyProfileViews: 50,
    monthlyInterests: 5,
    messaging: false,
    contactViews: 0,
  },
  silver: {
    dailyProfileViews: 200,
    monthlyInterests: 30,
    messaging: "mutual",
    contactViews: 15,
  },
  gold: {
    dailyProfileViews: Infinity,
    monthlyInterests: Infinity,
    messaging: "unlimited",
    contactViews: 50,
  },
  platinum: {
    dailyProfileViews: Infinity,
    monthlyInterests: Infinity,
    messaging: "unlimited",
    contactViews: Infinity,
  },
};

/**
 * Quota Error Codes
 */
export const QUOTA_ERROR_CODES = {
  DAILY_VIEW_QUOTA_EXCEEDED: "DAILY_VIEW_QUOTA_EXCEEDED",
  MONTHLY_INTERESTS_EXCEEDED: "MONTHLY_INTERESTS_EXCEEDED",
  MESSAGING_DISABLED_ON_FREE_PLAN: "MESSAGING_DISABLED_ON_FREE_PLAN",
  CONTACT_QUOTA_EXCEEDED: "CONTACT_QUOTA_EXCEEDED",
} as const;
