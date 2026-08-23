/**
 * Username handling, shared by friend search and onboarding so the two can
 * never disagree about what counts as a username.
 *
 * Kept free of any PocketBase import so it stays unit-testable.
 */

/** The shape the `users.username` field itself enforces. */
export const USERNAME_PATTERN = /^[a-z0-9_]{3,20}$/;

/**
 * Tidy up what someone typed into a username: drop a leading `@`, trim, and
 * lowercase. Returns null when the result could not be a username, so callers
 * can skip the round trip entirely.
 */
export function normaliseUsernameQuery(raw: string): string | null {
  const cleaned = (raw || "").trim().replace(/^@+/, "").trim().toLowerCase();
  return USERNAME_PATTERN.test(cleaned) ? cleaned : null;
}

/**
 * Validate a username someone is choosing for themselves. Returns a message to
 * show, or null when it is fine.
 */
export function validateUsername(raw: string): string | null {
  const cleaned = (raw || "").trim().replace(/^@+/, "").toLowerCase();
  if (!cleaned) return "Please enter a username.";
  if (cleaned.length < 3) return "Usernames need at least 3 characters.";
  if (cleaned.length > 20) return "Usernames can be at most 20 characters.";
  if (!USERNAME_PATTERN.test(cleaned)) {
    return "Usernames can use letters, numbers and underscores only.";
  }
  return null;
}
