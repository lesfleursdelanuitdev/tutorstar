"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import {
  PG_FOREIGN_KEY_VIOLATION,
  PG_UNIQUE_VIOLATION,
  pgErrorCode,
} from "@/db/errors";
import { subjects } from "@/db/schema";
import { formString, isUuid } from "@/lib/forms";
import { requireRole } from "@/lib/session";

function fail(message: string): never {
  redirect(`/dashboard/subjects?error=${encodeURIComponent(message)}`);
}

export async function createSubjectAction(formData: FormData) {
  await requireRole("tutor");
  const name = formString(formData, "name");
  if (!name) fail("Subject name is required.");

  try {
    await db.insert(subjects).values({ name });
  } catch (err) {
    if (pgErrorCode(err) === PG_UNIQUE_VIOLATION) {
      fail(`"${name}" already exists.`);
    }
    throw err;
  }

  revalidatePath("/dashboard/subjects");
  redirect("/dashboard/subjects");
}

export async function deleteSubjectAction(formData: FormData) {
  await requireRole("tutor");
  const id = formString(formData, "id");
  if (!isUuid(id)) fail("Invalid subject.");

  try {
    await db.delete(subjects).where(eq(subjects.id, id));
  } catch (err) {
    // FK violation: the subject is referenced by an engagement.
    if (pgErrorCode(err) === PG_FOREIGN_KEY_VIOLATION) {
      fail("This subject is in use by an engagement and can't be deleted.");
    }
    throw err;
  }

  revalidatePath("/dashboard/subjects");
  redirect("/dashboard/subjects");
}
