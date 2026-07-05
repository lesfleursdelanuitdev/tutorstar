// Money is stored as integer cents everywhere; forms deal in dollars. These
// bridge the two.

// Cents -> a value for a number input's defaultValue (e.g. 4500 -> "45.00").
export function centsToInput(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) return "";
  return (cents / 100).toFixed(2);
}

// Parse a dollars amount from a form into cents. Returns null when the field
// is blank or not a non-negative finite number, so callers can enforce
// required-ness themselves.
export function formCents(formData: FormData, key: string): number | null {
  const raw = formData.get(key);
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (trimmed === "") return null;
  const value = Number(trimmed);
  if (!Number.isFinite(value) || value < 0) return null;
  return Math.round(value * 100);
}

// Cents -> a display string (e.g. 4500 -> "$45.00").
export function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}
