// Session scheduling: turning a weekly recurring slot into concrete session
// instants, plus the status metadata/policy the UI and actions share.

export const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

// Mirrors the session_status pgEnum in src/db/schema.ts.
export const SESSION_STATUSES = [
  "scheduled",
  "completed",
  "cancelled_by_client",
  "cancelled_by_tutor",
  "no_show",
] as const;

export type SessionStatus = (typeof SESSION_STATUSES)[number];

export function isSessionStatus(value: string | null): value is SessionStatus {
  return value !== null && (SESSION_STATUSES as readonly string[]).includes(value);
}

export const SESSION_STATUS_META: Record<
  SessionStatus,
  { label: string; badge: string }
> = {
  scheduled: { label: "Scheduled", badge: "badge-info badge-outline" },
  completed: { label: "Completed", badge: "badge-success" },
  cancelled_by_client: { label: "Cancelled — client", badge: "badge-ghost" },
  cancelled_by_tutor: { label: "Cancelled — tutor", badge: "badge-ghost" },
  no_show: { label: "No-show", badge: "badge-warning" },
};

export function isCancelled(status: SessionStatus): boolean {
  return status === "cancelled_by_client" || status === "cancelled_by_tutor";
}

// Policy defaults for whether a session is chargeable, applied when its status
// changes. The tutor can still override per session (schema: sessions.billable).
export function defaultBillable(status: SessionStatus): boolean {
  switch (status) {
    case "completed":
    case "no_show":
    case "scheduled":
      return true;
    case "cancelled_by_client":
    case "cancelled_by_tutor":
      return false;
  }
}

// The larger / smaller of two ISO "YYYY-MM-DD" dates — safe as plain string
// compares because ISO date order is lexicographic.
const maxDate = (a: string, b: string) => (a >= b ? a : b);
const minDate = (a: string, b: string) => (a <= b ? a : b);

export type OccurrenceSlot = {
  weekday: number; // 0 = Sunday … 6 = Saturday
  startTime: string; // "HH:MM" or "HH:MM:SS"
  startsOn: string; // "YYYY-MM-DD"
  endsOn: string | null; // "YYYY-MM-DD"
};

// Every start instant for a weekly slot within [from, to] (inclusive dates),
// clamped to the slot's own [startsOn, endsOn] window.
//
// Dates are iterated on a UTC midnight anchor (UTC has no DST, so a fixed +24h
// step never skips or repeats a day), but each occurrence's instant is built
// from local Y-M-D + wall-clock time — matching how a manual datetime-local
// booking is parsed. Both paths therefore land on the same wall time.
export function generateOccurrences(
  slot: OccurrenceSlot,
  from: string,
  to: string,
): Date[] {
  const start = maxDate(slot.startsOn, from);
  const end = slot.endsOn ? minDate(slot.endsOn, to) : to;
  if (start > end) return [];

  const [hh, mm, ss] = slot.startTime.split(":").map(Number);
  const result: Date[] = [];

  const endAnchor = new Date(`${end}T00:00:00Z`).getTime();
  for (
    let anchor = new Date(`${start}T00:00:00Z`);
    anchor.getTime() <= endAnchor;
    anchor = new Date(anchor.getTime() + 24 * 60 * 60 * 1000)
  ) {
    if (anchor.getUTCDay() !== slot.weekday) continue;
    result.push(
      new Date(
        anchor.getUTCFullYear(),
        anchor.getUTCMonth(),
        anchor.getUTCDate(),
        hh,
        mm,
        ss || 0,
        0,
      ),
    );
  }
  return result;
}

// Server-local YYYY-MM-DD for today, used as the default "generate from" bound.
export function todayIso(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function formatDateTime(d: Date): string {
  return d.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
