export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

/** Whether a comma-separated list of emails, like ADMIN_EMAILS, includes this one. */
export function isListed(email: string, list: string) {
  const normalizedEmail = normalizeEmail(email);
  return list.split(",").some((listed) => normalizeEmail(listed) === normalizedEmail);
}

export const MAX_USER_NAME_LENGTH = 80;

/** A new account's name: Google's, or the start of the email when Google has none. */
export function signUpName(name: string | null | undefined, email: string) {
  return name?.trim() || normalizeEmail(email).split("@")[0] || "Cook";
}

/**
 * What a user may change about themselves: their name, trimmed. The photo stays the one Google
 * gave at sign-up, so the app never shows an image from an address a user typed in.
 */
export function cleanUserUpdate<T extends Record<string, unknown>>(
  data: T,
): { ok: true; data: Omit<T, "image"> } | { ok: false; error: string } {
  const { image: _image, ...rest } = data;
  if (rest["name"] === undefined) return { ok: true, data: rest };
  const name = typeof rest["name"] === "string" ? rest["name"].trim() : "";
  if (!name) return { ok: false, error: "Enter your name" };
  if (name.length > MAX_USER_NAME_LENGTH) {
    return { ok: false, error: `Use at most ${MAX_USER_NAME_LENGTH} characters` };
  }
  return { ok: true, data: { ...rest, name } };
}
