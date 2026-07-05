"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import { PG_FOREIGN_KEY_VIOLATION, pgErrorCode } from "@/db/errors";
import { packages, sessions } from "@/db/schema";
import { formString, isUuid } from "@/lib/forms";
import {
  defaultBillable,
  isCancelled,
  isSessionStatus,
} from "@/lib/scheduling";
import { requireRole } from "@/lib/session";

// These are shared by the engagement detail page and the sessions agenda, so
// the caller binds `redirectTo` to send the tutor back where they were.

function revalidate(redirectTo: string) {
  // redirectTo is a clean path (no query); also refresh the agenda and the
  // engagement list counts.
  revalidatePath(redirectTo);
  revalidatePath("/dashboard/sessions");
  revalidatePath("/dashboard/engagements");
}

// Module function (not an inline arrow) so its `never` return narrows guards.
function failTo(redirectTo: string, message: string): never {
  redirect(`${redirectTo}?error=${encodeURIComponent(message)}`);
}

export async function setSessionStatusAction(
  redirectTo: string,
  formData: FormData,
) {
  await requireRole("tutor");
  const sessionId = formString(formData, "sessionId");
  const status = formString(formData, "status");
  if (!isUuid(sessionId) || !isSessionStatus(status)) redirect(redirectTo);

  await db
    .update(sessions)
    .set({
      status,
      // Reset billable to the policy default for the new status; the tutor can
      // still override afterwards with the billable toggle.
      billable: defaultBillable(status),
      cancelledAt: isCancelled(status) ? new Date() : null,
      updatedAt: new Date(),
    })
    .where(eq(sessions.id, sessionId));

  revalidate(redirectTo);
  redirect(redirectTo);
}

export async function toggleSessionBillableAction(
  redirectTo: string,
  formData: FormData,
) {
  await requireRole("tutor");
  const sessionId = formString(formData, "sessionId");
  const billable = formString(formData, "billable") === "1";
  if (!isUuid(sessionId)) redirect(redirectTo);

  await db
    .update(sessions)
    .set({ billable, updatedAt: new Date() })
    .where(eq(sessions.id, sessionId));

  revalidate(redirectTo);
  redirect(redirectTo);
}

// Draw a session from a prepaid package (or clear it back to pay-as-you-go).
// A drawn session leaves the per-session invoice flow — it's covered by the
// package purchase instead. Enforces that the package belongs to the same
// student and still has enough balance.
export async function setSessionPackageAction(
  redirectTo: string,
  formData: FormData,
) {
  await requireRole("tutor");
  const sessionId = formString(formData, "sessionId");
  if (!isUuid(sessionId)) redirect(redirectTo);

  const packageId = formString(formData, "packageId");

  // Empty selection → back to pay-as-you-go.
  if (packageId === null) {
    await db
      .update(sessions)
      .set({ packageId: null, updatedAt: new Date() })
      .where(eq(sessions.id, sessionId));
    revalidate(redirectTo);
    redirect(redirectTo);
  }
  if (!isUuid(packageId)) redirect(redirectTo);

  const session = await db.query.sessions.findFirst({
    where: eq(sessions.id, sessionId),
    columns: { durationMinutes: true },
    with: { engagement: { columns: { studentId: true } } },
  });
  if (!session) redirect(redirectTo);

  const pkg = await db.query.packages.findFirst({
    where: eq(packages.id, packageId),
  });
  if (!pkg) failTo(redirectTo, "Package not found.");
  if (pkg.studentId !== session.engagement.studentId) {
    failTo(redirectTo, "That package belongs to a different student.");
  }

  // Balance left, not counting this session (so re-selecting the same package
  // is idempotent).
  const others = await db.query.sessions.findMany({
    where: and(eq(sessions.packageId, packageId), ne(sessions.id, sessionId)),
    columns: { durationMinutes: true },
  });
  const consumedByOthers =
    pkg.unit === "hours"
      ? others.reduce((sum, s) => sum + s.durationMinutes / 60, 0)
      : others.length;
  const thisConsumption =
    pkg.unit === "hours" ? session.durationMinutes / 60 : 1;
  if (thisConsumption > Number(pkg.quantity) - consumedByOthers) {
    failTo(redirectTo, "That package doesn't have enough balance left for this session.");
  }

  await db
    .update(sessions)
    .set({ packageId, updatedAt: new Date() })
    .where(eq(sessions.id, sessionId));

  revalidate(redirectTo);
  revalidatePath("/dashboard/packages");
  redirect(redirectTo);
}

export async function deleteSessionAction(
  redirectTo: string,
  formData: FormData,
) {
  await requireRole("tutor");
  const sessionId = formString(formData, "sessionId");
  if (!isUuid(sessionId)) redirect(redirectTo);

  try {
    await db.delete(sessions).where(eq(sessions.id, sessionId));
  } catch (err) {
    // FK violation: an invoice line item, note, or attachment references it.
    if (pgErrorCode(err) === PG_FOREIGN_KEY_VIOLATION) {
      redirect(
        `${redirectTo}?error=${encodeURIComponent(
          "This session is billed or has notes and can't be deleted. Cancel it instead.",
        )}`,
      );
    }
    throw err;
  }

  revalidate(redirectTo);
  redirect(redirectTo);
}
