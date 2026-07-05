"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { PG_UNIQUE_VIOLATION, pgErrorCode } from "@/db/errors";
import { students } from "@/db/schema";
import { formString, isEmail, isUuid } from "@/lib/forms";
import {
  MIN_PASSWORD_LENGTH,
  createLogin,
  findUserByEmail,
} from "@/lib/provision";
import { requireRole } from "@/lib/session";

export async function createStudentAction(formData: FormData) {
  await requireRole("tutor");
  const name = formString(formData, "name");
  if (!name) {
    redirect(`/dashboard/students/new?error=${encodeURIComponent("Name is required.")}`);
  }

  const [row] = await db
    .insert(students)
    .values({
      name,
      birthdate: formString(formData, "birthdate"),
      gradeLevel: formString(formData, "gradeLevel"),
      notes: formString(formData, "notes"),
    })
    .returning({ id: students.id });

  revalidatePath("/dashboard/students");
  redirect(`/dashboard/students/${row.id}`);
}

export async function updateStudentAction(
  studentId: string,
  formData: FormData,
) {
  await requireRole("tutor");
  const name = formString(formData, "name");
  if (!name) {
    redirect(`/dashboard/students/${studentId}?error=${encodeURIComponent("Name is required.")}`);
  }

  await db
    .update(students)
    .set({
      name,
      birthdate: formString(formData, "birthdate"),
      gradeLevel: formString(formData, "gradeLevel"),
      notes: formString(formData, "notes"),
      updatedAt: new Date(),
    })
    .where(eq(students.id, studentId));

  revalidatePath("/dashboard/students");
  revalidatePath(`/dashboard/students/${studentId}`);
  redirect(`/dashboard/students/${studentId}?saved=1`);
}

// Give a student their own portal login. A student has at most one (students
// .userId is unique). If the email already has a login, we attach it; else we
// create one. Handles the "client who is also a student" case: the same person
// can be a student login here and a client login via addClientLoginAction.
export async function setStudentLoginAction(
  studentId: string,
  formData: FormData,
) {
  await requireRole("tutor");
  const here = `/dashboard/students/${studentId}`;
  function fail(message: string): never {
    redirect(`${here}?error=${encodeURIComponent(message)}`);
  }

  if (!isUuid(studentId)) redirect("/dashboard/students");

  const student = await db.query.students.findFirst({
    where: eq(students.id, studentId),
    columns: { userId: true },
  });
  if (!student) redirect("/dashboard/students");
  if (student.userId) fail("This student already has a login.");

  const email = formString(formData, "email");
  if (!isEmail(email)) fail("Enter a valid email address.");

  let userId: string;
  const existing = await findUserByEmail(email);
  if (existing) {
    userId = existing.id;
  } else {
    const name = formString(formData, "name");
    if (!name) fail("Enter the student's name.");
    const password = formString(formData, "password");
    if (!password || password.length < MIN_PASSWORD_LENGTH) {
      fail(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
    }
    try {
      userId = await createLogin({ name, email, password });
    } catch {
      const raced = await findUserByEmail(email);
      if (!raced) fail("Could not create that login. Try again.");
      userId = raced.id;
    }
  }

  try {
    await db.update(students).set({ userId }).where(eq(students.id, studentId));
  } catch (err) {
    // That user is already the login for a different student.
    if (pgErrorCode(err) === PG_UNIQUE_VIOLATION) {
      fail("That login already belongs to another student.");
    }
    throw err;
  }

  revalidatePath(here);
  redirect(`${here}?saved=1`);
}

export async function removeStudentLoginAction(studentId: string) {
  await requireRole("tutor");
  const here = `/dashboard/students/${studentId}`;
  if (!isUuid(studentId)) redirect("/dashboard/students");

  // Detach the login from the student; the user account is left intact.
  await db
    .update(students)
    .set({ userId: null })
    .where(eq(students.id, studentId));

  revalidatePath(here);
  redirect(`${here}?saved=1`);
}
