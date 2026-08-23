/**
 * Sign-up input handling.
 *
 * Kept free of any PocketBase import so it stays unit-testable — vitest only
 * picks up `lib/**` and cannot load the native storage/network modules.
 */

/**
 * Canonical form of an invite code: upper-case, alphanumeric only, so a code
 * can be written down with spaces or hyphens and still match.
 *
 * `server/pb_hooks/utils.js` holds a copy of this. The duplication is
 * unavoidable — the PocketBase JSVM cannot import TypeScript — so if you
 * change one, change the other. The tests pin the contract both rely on.
 */
export function normaliseInviteCode(raw: string): string {
  return (raw || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export interface SignupInput {
  email: string;
  password: string;
  passwordConfirm: string;
  code: string;
}

/**
 * Check what the user typed before it reaches the server. Returns a message to
 * show inline, or null when the input is worth sending.
 *
 * The server validates all of this again — this only saves a round trip and
 * gives a faster, more specific answer.
 */
export function validateSignupInput({
  email,
  password,
  passwordConfirm,
  code,
}: SignupInput): string | null {
  const trimmedEmail = (email || "").trim();
  if (!trimmedEmail) return "Please enter your email address.";
  // Deliberately loose: the server does proper validation, and an
  // over-strict pattern here would reject addresses that are actually fine.
  if (trimmedEmail.indexOf("@") < 1 || trimmedEmail.endsWith("@")) {
    return "Please enter a valid email address.";
  }
  if (!password) return "Please choose a password.";
  if (password.length < 8) {
    return "Please choose a password of at least 8 characters.";
  }
  if (password !== passwordConfirm) return "The two passwords do not match.";
  if (!normaliseInviteCode(code)) return "Please enter your invite code.";
  return null;
}
