// Drizzle wraps driver errors (DrizzleQueryError -> cause: PostgresError),
// so walk the cause chain to find the Postgres error code.
export function pgErrorCode(err: unknown): string | undefined {
  if (typeof err !== "object" || err === null) return undefined;
  const { code, cause } = err as { code?: unknown; cause?: unknown };
  if (typeof code === "string") return code;
  return pgErrorCode(cause);
}

export const PG_UNIQUE_VIOLATION = "23505";
export const PG_FOREIGN_KEY_VIOLATION = "23503";
