"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { clientsStudents } from "@/db/schema";
import { formString, isUuid } from "@/lib/forms";
import { requireRole } from "@/lib/session";

// Shared by the client and student detail pages (linking is symmetric).
// `redirectTo` is bound by the calling page so the user stays where they were.

export async function linkClientStudentAction(
  redirectTo: string,
  formData: FormData,
) {
  await requireRole("tutor");
  const clientId = formString(formData, "clientId");
  const studentId = formString(formData, "studentId");
  if (!isUuid(clientId) || !isUuid(studentId)) {
    redirect(`${redirectTo}?error=${encodeURIComponent("Select an entry to link.")}`);
  }

  await db
    .insert(clientsStudents)
    .values({
      clientId,
      studentId,
      relationship: formString(formData, "relationship"),
    })
    .onConflictDoNothing();

  revalidatePath(`/dashboard/clients/${clientId}`);
  revalidatePath(`/dashboard/students/${studentId}`);
  redirect(redirectTo);
}

export async function unlinkClientStudentAction(
  redirectTo: string,
  formData: FormData,
) {
  await requireRole("tutor");
  const clientId = formString(formData, "clientId");
  const studentId = formString(formData, "studentId");
  if (!isUuid(clientId) || !isUuid(studentId)) redirect(redirectTo);

  await db
    .delete(clientsStudents)
    .where(
      and(
        eq(clientsStudents.clientId, clientId),
        eq(clientsStudents.studentId, studentId),
      ),
    );

  revalidatePath(`/dashboard/clients/${clientId}`);
  revalidatePath(`/dashboard/students/${studentId}`);
  redirect(redirectTo);
}
