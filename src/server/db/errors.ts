// D1 reports constraint failures as error messages, sometimes wrapped by Drizzle.
export function isUniqueViolation(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return error.message.includes("UNIQUE constraint failed") || isUniqueViolation(error.cause);
}
