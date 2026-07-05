"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { tutors, users } from "@/db/schema";
import { formString } from "@/lib/forms";
import { formCents } from "@/lib/money";
import { requireRole } from "@/lib/session";

export async function updateTutorSettingsAction(formData: FormData) {
  const { user } = await requireRole("tutor");
  function fail(message: string): never {
    redirect(`/dashboard/settings?error=${encodeURIComponent(message)}`);
  }

  const name = formString(formData, "name");
  if (!name) fail("Name is required.");

  // Blank rate clears it; a present-but-invalid rate is a mistake worth
  // flagging rather than silently dropping.
  const rateRaw = formString(formData, "defaultHourlyRate");
  let defaultHourlyRateCents: number | null = null;
  if (rateRaw !== null) {
    defaultHourlyRateCents = formCents(formData, "defaultHourlyRate");
    if (defaultHourlyRateCents === null) fail("Enter a valid hourly rate.");
  }

  await db.transaction(async (tx) => {
    await tx
      .update(users)
      .set({ name, updatedAt: new Date() })
      .where(eq(users.id, user.id));
    await tx
      .update(tutors)
      .set({ bio: formString(formData, "bio"), defaultHourlyRateCents })
      .where(eq(tutors.userId, user.id));
  });

  revalidatePath("/dashboard/settings");
  redirect("/dashboard/settings?saved=1");
}
