import { db } from "../config/db.js";

/** Standard UUID v4 regex (case-insensitive) */
export const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Display ID regex: 'P' followed by optional series letters and 1 or more digits */
export const DISPLAY_ID_REGEX = /^P([A-Z]*)(\d+)$/i;

/**
 * Checks whether an identifier string is a valid UUID.
 */
export function isUuid(identifier: string): boolean {
  if (!identifier || typeof identifier !== "string") return false;
  return UUID_REGEX.test(identifier.trim());
}

/**
 * Converts a positive sequence number into human-friendly Profile ID.
 * Examples: 1 -> P1, 100 -> P100, 101 -> PA1, 200 -> PA100, 201 -> PB1, 2701 -> PAA1
 */
export function formatDisplayId(seq: number): string {
  if (!seq || typeof seq !== "number" || seq < 1 || !Number.isInteger(seq)) {
    throw new Error(`Invalid sequence number: ${seq}. Must be a positive integer.`);
  }

  if (seq <= 100) {
    return `P${seq}`;
  }

  const k = seq - 101;
  const q = Math.floor(k / 100);
  const r = (k % 100) + 1;

  let prefix = "";
  let temp = q;
  while (true) {
    const rem = temp % 26;
    prefix = String.fromCharCode(65 + rem) + prefix;
    temp = Math.floor(temp / 26) - 1;
    if (temp < 0) break;
  }

  return `P${prefix}${r}`;
}

/**
 * Parses a profile display ID back into its numeric sequence number.
 * Returns null if the format is invalid.
 */
export function parseDisplayId(displayId: string): number | null {
  if (!displayId || typeof displayId !== "string") return null;
  const clean = displayId.trim().toUpperCase();

  const match = clean.match(DISPLAY_ID_REGEX);
  if (!match) return null;

  const letters = match[1];
  const num = parseInt(match[2], 10);
  if (isNaN(num) || num < 1 || num > 100) return null;

  // Case 1: P1 to P100 (no series letter)
  if (letters === "") {
    return num <= 100 ? num : null;
  }

  let q = 0;
  for (let i = 0; i < letters.length; i++) {
    const val = letters.charCodeAt(i) - 64;
    if (val < 1 || val > 26) return null;
    q = q * 26 + val;
  }
  q -= 1;

  return 101 + q * 100 + (num - 1);
}

/**
 * Checks whether an identifier string matches the matrimonial display ID pattern.
 */
export function isDisplayId(identifier: string): boolean {
  if (!identifier || typeof identifier !== "string") return false;
  return parseDisplayId(identifier) !== null;
}

/**
 * Resolves a route parameter or identifier (either UUID or Display ID like 'P1', 'PA1')
 * to the underlying user canonical UUID.
 *
 * Guaranteed to return the canonical UUID if the record exists in the database,
 * or null if no matching active user exists.
 */
export async function resolveUserId(identifier: string): Promise<string | null> {
  if (!identifier || typeof identifier !== "string") return null;
  const clean = identifier.trim();

  // If already a valid UUID format, verify existence in users table
  if (isUuid(clean)) {
    const res = await db.query<{ id: string }>(
      "SELECT id FROM users WHERE id = $1 LIMIT 1",
      [clean],
    );
    return res.rows[0]?.id || null;
  }

  // If display ID format, query case-insensitively by display_id
  const res = await db.query<{ id: string }>(
    "SELECT id FROM users WHERE display_id ILIKE $1 LIMIT 1",
    [clean],
  );
  return res.rows[0]?.id || null;
}
