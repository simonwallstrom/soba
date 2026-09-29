export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function isAllowlisted(email: string, allowlist: string) {
  const normalizedEmail = normalizeEmail(email);
  return allowlist.split(",").some((allowed) => normalizeEmail(allowed) === normalizedEmail);
}
