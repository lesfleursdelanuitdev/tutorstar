"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { PG_FOREIGN_KEY_VIOLATION, pgErrorCode } from "@/db/errors";
import { packageTemplates } from "@/db/schema";
import { formString, isUuid } from "@/lib/forms";
import { formCents } from "@/lib/money";
import { requireRole } from "@/lib/session";

const LIST = "/dashboard/packages/offerings";

function fail(message: string): never {
  redirect(`${LIST}?error=${encodeURIComponent(message)}`);
}

export async function createOfferingAction(formData: FormData) {
  await requireRole("tutor");

  const name = formString(formData, "name");
  if (!name) fail("Give the offering a name.");

  const unitRaw = formString(formData, "unit");
  const unit = unitRaw === "hours" || unitRaw === "sessions" ? unitRaw : null;
  if (!unit) fail("Choose a unit.");

  const quantityRaw = formString(formData, "quantity");
  const quantity = quantityRaw === null ? NaN : Number(quantityRaw);
  if (!Number.isFinite(quantity) || quantity <= 0) {
    fail("Enter a valid quantity.");
  }

  const priceCents = formCents(formData, "price");
  if (priceCents === null) fail("Enter a valid price.");

  // Optional subject scope; blank means "any subject".
  const subjectId = formString(formData, "subjectId");
  if (subjectId !== null && !isUuid(subjectId)) fail("Choose a valid subject.");

  await db.insert(packageTemplates).values({
    name,
    subjectId,
    unit,
    quantity: quantityRaw!,
    priceCents,
  });

  revalidatePath(LIST);
  redirect(LIST);
}

export async function setOfferingActiveAction(formData: FormData) {
  await requireRole("tutor");
  const id = formString(formData, "id");
  if (!isUuid(id)) fail("Invalid offering.");
  const active = formString(formData, "active") === "true";

  await db
    .update(packageTemplates)
    .set({ active })
    .where(eq(packageTemplates.id, id));

  revalidatePath(LIST);
  redirect(LIST);
}

export async function deleteOfferingAction(formData: FormData) {
  await requireRole("tutor");
  const id = formString(formData, "id");
  if (!isUuid(id)) fail("Invalid offering.");

  try {
    await db.delete(packageTemplates).where(eq(packageTemplates.id, id));
  } catch (err) {
    // FK violation: a sold package points at this offering. Deactivating hides
    // it from new sales without rewriting history.
    if (pgErrorCode(err) === PG_FOREIGN_KEY_VIOLATION) {
      fail("This offering has been sold and can't be deleted. Deactivate it instead.");
    }
    throw err;
  }

  revalidatePath(LIST);
  redirect(LIST);
}
