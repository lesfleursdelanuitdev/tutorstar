"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  PG_FOREIGN_KEY_VIOLATION,
  pgErrorCode,
} from "@/db/errors";
import {
  engagements,
  engagementSubjects,
  recurringSchedules,
  sessions,
} from "@/db/schema";
import { formString, isUuid } from "@/lib/forms";
import { formCents } from "@/lib/money";
import { generateOccurrences, todayIso } from "@/lib/scheduling";
import { requireRole } from "@/lib/session";

// Parse a positive integer from a form field; null when absent or invalid.
function formInt(formData: FormData, key: string): number | null {
  const raw = formString(formData, key);
  if (raw === null) return null;
  const value = Number(raw);
  return Number.isInteger(value) ? value : null;
}

function newFail(message: string): never {
  redirect(`/dashboard/engagements/new?error=${encodeURIComponent(message)}`);
}

// The checked subject checkboxes, deduped; null when any value is malformed.
function formSubjectIds(formData: FormData): string[] | null {
  const ids = Array.from(
    new Set(formData.getAll("subjectIds").map((v) => String(v))),
  );
  return ids.every(isUuid) ? ids : null;
}

// Redirect back to an engagement's detail page with an error banner. A module
// function (not an inline arrow) so its `never` return narrows guarded values.
function failTo(here: string, message: string): never {
  redirect(`${here}?error=${encodeURIComponent(message)}`);
}

export async function createEngagementAction(formData: FormData) {
  await requireRole("tutor");
  const studentId = formString(formData, "studentId");
  const subjectIds = formSubjectIds(formData);
  const clientId = formString(formData, "clientId");
  if (!isUuid(studentId)) newFail("Select a student.");
  if (subjectIds === null || subjectIds.length === 0) {
    newFail("Select at least one subject.");
  }
  if (!isUuid(clientId)) newFail("Select a paying client.");

  const hourlyRateCents = formCents(formData, "hourlyRate");
  if (hourlyRateCents === null) newFail("Enter a valid hourly rate.");

  const startedOn = formString(formData, "startedOn");

  const row = await db.transaction(async (tx) => {
    const [created] = await tx
      .insert(engagements)
      .values({
        studentId,
        clientId,
        hourlyRateCents,
        ...(startedOn ? { startedOn } : {}),
      })
      .returning({ id: engagements.id });
    await tx.insert(engagementSubjects).values(
      subjectIds.map((subjectId) => ({ engagementId: created.id, subjectId })),
    );
    return created;
  });

  revalidatePath("/dashboard/engagements");
  redirect(`/dashboard/engagements/${row.id}`);
}

// Replace the engagement's subject set (at least one — an engagement without
// a subject is meaningless).
export async function updateEngagementSubjectsAction(
  engagementId: string,
  formData: FormData,
) {
  await requireRole("tutor");
  const here = `/dashboard/engagements/${engagementId}`;

  const subjectIds = formSubjectIds(formData);
  if (subjectIds === null || subjectIds.length === 0) {
    failTo(here, "Select at least one subject.");
  }

  await db.transaction(async (tx) => {
    await tx
      .delete(engagementSubjects)
      .where(eq(engagementSubjects.engagementId, engagementId));
    await tx.insert(engagementSubjects).values(
      subjectIds.map((subjectId) => ({ engagementId, subjectId })),
    );
  });

  revalidatePath("/dashboard/engagements");
  revalidatePath(here);
  redirect(`${here}?saved=1`);
}

export async function updateEngagementAction(
  engagementId: string,
  formData: FormData,
) {
  await requireRole("tutor");
  const here = `/dashboard/engagements/${engagementId}`;

  const hourlyRateCents = formCents(formData, "hourlyRate");
  if (hourlyRateCents === null) {
    redirect(`${here}?error=${encodeURIComponent("Enter a valid hourly rate.")}`);
  }

  await db
    .update(engagements)
    .set({ hourlyRateCents })
    .where(eq(engagements.id, engagementId));

  revalidatePath("/dashboard/engagements");
  revalidatePath(here);
  redirect(`${here}?saved=1`);
}

// End an active engagement: mark it ended and stamp today. New sessions
// shouldn't be generated for it, but its history stays intact.
export async function endEngagementAction(engagementId: string) {
  await requireRole("tutor");
  const today = new Date().toISOString().slice(0, 10);
  await db
    .update(engagements)
    .set({ status: "ended", endedOn: today })
    .where(eq(engagements.id, engagementId));

  revalidatePath("/dashboard/engagements");
  revalidatePath(`/dashboard/engagements/${engagementId}`);
  redirect(`/dashboard/engagements/${engagementId}?saved=1`);
}

export async function reactivateEngagementAction(engagementId: string) {
  await requireRole("tutor");
  await db
    .update(engagements)
    .set({ status: "active", endedOn: null })
    .where(eq(engagements.id, engagementId));

  revalidatePath("/dashboard/engagements");
  revalidatePath(`/dashboard/engagements/${engagementId}`);
  redirect(`/dashboard/engagements/${engagementId}?saved=1`);
}

// ---------------------------------------------------------------------------
// Sessions & recurring schedules (both scoped to a single engagement)
// ---------------------------------------------------------------------------

const mode = (value: string | null) =>
  value === "in_person" ? "in_person" : "online";

// Book a one-off session against the engagement, snapshotting its current rate.
export async function createSessionAction(
  engagementId: string,
  formData: FormData,
) {
  await requireRole("tutor");
  const here = `/dashboard/engagements/${engagementId}`;

  const engagement = await db.query.engagements.findFirst({
    where: eq(engagements.id, engagementId),
    columns: { hourlyRateCents: true },
  });
  if (!engagement) redirect("/dashboard/engagements");

  const at = formString(formData, "scheduledAt");
  const scheduledAt = at ? new Date(at) : null;
  if (!scheduledAt || Number.isNaN(scheduledAt.getTime())) {
    failTo(here, "Pick a date and time for the session.");
  }

  const durationMinutes = formInt(formData, "durationMinutes");
  if (durationMinutes === null || durationMinutes <= 0) {
    failTo(here, "Enter a valid duration in minutes.");
  }

  await db.insert(sessions).values({
    engagementId,
    scheduledAt,
    durationMinutes,
    mode: mode(formString(formData, "mode")),
    rateCents: engagement.hourlyRateCents,
  });

  revalidatePath(here);
  revalidatePath("/dashboard/sessions");
  redirect(`${here}?saved=1`);
}

export async function createScheduleAction(
  engagementId: string,
  formData: FormData,
) {
  await requireRole("tutor");
  const here = `/dashboard/engagements/${engagementId}`;

  const weekday = formInt(formData, "weekday");
  if (weekday === null || weekday < 0 || weekday > 6) failTo(here, "Pick a weekday.");

  const startTime = formString(formData, "startTime");
  if (!startTime) failTo(here, "Pick a start time.");

  const durationMinutes = formInt(formData, "durationMinutes");
  if (durationMinutes === null || durationMinutes <= 0) {
    failTo(here, "Enter a valid duration in minutes.");
  }

  const startsOn = formString(formData, "startsOn") ?? todayIso();
  const endsOn = formString(formData, "endsOn");
  if (endsOn && endsOn < startsOn) failTo(here, "End date can't be before the start date.");

  await db.insert(recurringSchedules).values({
    engagementId,
    weekday,
    startTime,
    durationMinutes,
    mode: mode(formString(formData, "mode")),
    startsOn,
    endsOn,
  });

  revalidatePath(here);
  redirect(`${here}?saved=1`);
}

// Materialise sessions from a weekly slot up to a target date. Idempotent: an
// occurrence that already has a session for this schedule is skipped, so the
// tutor can safely extend the horizon by generating again later.
export async function generateSessionsAction(
  engagementId: string,
  formData: FormData,
) {
  await requireRole("tutor");
  const here = `/dashboard/engagements/${engagementId}`;

  const scheduleId = formString(formData, "scheduleId");
  if (!isUuid(scheduleId)) failTo(here, "Invalid schedule.");

  const through = formString(formData, "through");
  if (!through) failTo(here, "Pick a date to generate through.");

  const [schedule, engagement] = await Promise.all([
    db.query.recurringSchedules.findFirst({
      where: and(
        eq(recurringSchedules.id, scheduleId),
        eq(recurringSchedules.engagementId, engagementId),
      ),
    }),
    db.query.engagements.findFirst({
      where: eq(engagements.id, engagementId),
      columns: { hourlyRateCents: true },
    }),
  ]);
  if (!schedule || !engagement) failTo(here, "Schedule not found.");

  const from = schedule.startsOn > todayIso() ? schedule.startsOn : todayIso();
  const occurrences = generateOccurrences(
    {
      weekday: schedule.weekday,
      startTime: schedule.startTime,
      startsOn: schedule.startsOn,
      endsOn: schedule.endsOn,
    },
    from,
    through,
  );

  // Skip occurrences that already exist for this schedule.
  const existing = await db.query.sessions.findMany({
    where: eq(sessions.recurringScheduleId, scheduleId),
    columns: { scheduledAt: true },
  });
  const taken = new Set(existing.map((s) => s.scheduledAt.getTime()));
  const fresh = occurrences.filter((d) => !taken.has(d.getTime()));

  if (fresh.length > 0) {
    await db.insert(sessions).values(
      fresh.map((scheduledAt) => ({
        engagementId,
        recurringScheduleId: scheduleId,
        scheduledAt,
        durationMinutes: schedule.durationMinutes,
        mode: schedule.mode,
        rateCents: engagement.hourlyRateCents,
      })),
    );
  }

  revalidatePath(here);
  revalidatePath("/dashboard/sessions");
  const noun = fresh.length === 1 ? "session" : "sessions";
  redirect(
    `${here}?info=${encodeURIComponent(`Generated ${fresh.length} ${noun}.`)}`,
  );
}

export async function setScheduleActiveAction(
  engagementId: string,
  formData: FormData,
) {
  await requireRole("tutor");
  const scheduleId = formString(formData, "scheduleId");
  const active = formString(formData, "active") === "1";
  const here = `/dashboard/engagements/${engagementId}`;
  if (!isUuid(scheduleId)) redirect(here);

  await db
    .update(recurringSchedules)
    .set({ active })
    .where(
      and(
        eq(recurringSchedules.id, scheduleId),
        eq(recurringSchedules.engagementId, engagementId),
      ),
    );

  revalidatePath(here);
  redirect(here);
}

export async function deleteScheduleAction(
  engagementId: string,
  formData: FormData,
) {
  await requireRole("tutor");
  const scheduleId = formString(formData, "scheduleId");
  const here = `/dashboard/engagements/${engagementId}`;
  if (!isUuid(scheduleId)) redirect(here);

  try {
    await db
      .delete(recurringSchedules)
      .where(
        and(
          eq(recurringSchedules.id, scheduleId),
          eq(recurringSchedules.engagementId, engagementId),
        ),
      );
  } catch (err) {
    // FK violation: generated sessions still reference this schedule.
    if (pgErrorCode(err) === PG_FOREIGN_KEY_VIOLATION) {
      redirect(
        `${here}?error=${encodeURIComponent(
          "This schedule has generated sessions. Deactivate it instead.",
        )}`,
      );
    }
    throw err;
  }

  revalidatePath(here);
  redirect(here);
}
