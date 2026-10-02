/**
 * Access limit tracker — Fix 6
 * Enforces daily profile view limits and monthly interest limits
 * set by the admin in the package configuration.
 * Uses localStorage as a persistent counter in mock mode;
 * in production the backend enforces this server-side.
 */

const PREFIX = "yfj.limits";

/** Parse a limit string like "50 / day" → 50, or "Unlimited" → Infinity */
function parseLimit(raw: string | undefined): number {
  if (!raw) return Infinity;
  const lower = raw.toLowerCase().trim();
  if (lower === "unlimited" || lower === "—") return Infinity;
  const match = lower.match(/(\d+)/);
  return match ? parseInt(match[1]!, 10) : Infinity;
}

function todayKey() {
  return new Date().toISOString().split("T")[0]!;
}

function thisMonthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function getCount(key: string): number {
  if (typeof window === "undefined") return 0;
  return parseInt(window.localStorage.getItem(`${PREFIX}.${key}`) ?? "0", 10);
}

function setCount(key: string, count: number): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(`${PREFIX}.${key}`, String(count));
}

// ─── Profile Views (daily) ──────────────────────────────────────────────────

/**
 * Returns how many profiles the current user has viewed today,
 * and whether they have reached their plan limit.
 */
export function getDailyViewUsage(dailyLimitRaw: string | undefined): { used: number; limit: number; exceeded: boolean } {
  const limit = parseLimit(dailyLimitRaw);
  const used = getCount(`views.${todayKey()}`);
  return { used, limit, exceeded: limit !== Infinity && used >= limit };
}

/**
 * Increments the daily profile view counter.
 * Call this whenever a profile detail page is loaded.
 */
export function trackProfileView(): void {
  const key = `views.${todayKey()}`;
  setCount(key, getCount(key) + 1);
}

// ─── Interest Sends (monthly) ────────────────────────────────────────────────

/**
 * Returns how many interests the current user has sent this month,
 * and whether they have reached their plan limit.
 */
export function getMonthlyInterestUsage(monthlyLimitRaw: string | undefined): { used: number; limit: number; exceeded: boolean } {
  const limit = parseLimit(monthlyLimitRaw);
  const used = getCount(`interests.${thisMonthKey()}`);
  return { used, limit, exceeded: limit !== Infinity && used >= limit };
}

/**
 * Increments the monthly interest counter.
 * Call this AFTER a successful interest send API call.
 */
export function trackInterestSent(): void {
  const key = `interests.${thisMonthKey()}`;
  setCount(key, getCount(key) + 1);
}

/** Resets all counters — useful for dev/testing. */
export function resetAllLimits(): void {
  if (typeof window === "undefined") return;
  for (const k of Object.keys(window.localStorage)) {
    if (k.startsWith(PREFIX)) window.localStorage.removeItem(k);
  }
}
