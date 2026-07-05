"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { PG_FOREIGN_KEY_VIOLATION, pgErrorCode } from "@/db/errors";
import { packages } from "@/db/schema";
import { formString, isUuid } from "@/lib/forms";
import { formCents } from "@/lib/money";
import { requireRole } from "@/lib/session";

function newFail(message: string): never {
  redirect(`/dashboard/packages/new?error=${encodeURIComponent(message)}`);
}

export async function createPackageAction(formData: FormData) {
  await requireRole("tutor");
  const studentId = formString(formData, "studentId");
  const clientId = formString(formData, "clientId");
  if (!isUuid(studentId)) newFail("Select a student.");
  if (!isUuid(clientId)) newFail("Select a paying client.");

  const unitRaw = formString(formData, "unit");
  const unit = unitRaw === "hours" || unitRaw === "sessions" ? unitRaw : null;
  if (!unit) newFail("Choose a unit.");

  const quantityRaw = formString(formData, "quantity");
  const quantity = quantityRaw === null ? NaN : Number(quantityRaw);
  if (!Number.isFinite(quantity) || quantity <= 0) {
    newFail("Enter a valid quantity.");
  }

  const priceCents = formCents(formData, "price");
  if (priceCents === null) newFail("Enter a valid price.");

  await db.insert(packages).values({
    studentId,
    clientId,
    unit,
    quantity: quantityRaw!,
    priceCents,
    notes: formString(formData, "notes"),
  });

  revalidatePath("/dashboard/packages");
  redirect("/dashboard/packages");
}

export async function deletePackageAction(formData: FormData) {
  await requireRole("tutor");
  const id = formString(formData, "id");
  if (!isUuid(id)) redirect("/dashboard/packages");

  try {
    await db.delete(packages).where(eq(packages.id, id));
  } catch (err) {
    // FK violation: an invoice line item or a drawn-down session references it.
    if (pgErrorCode(err) === PG_FOREIGN_KEY_VIOLATION) {
      redirect(
        `/dashboard/packages?error=${encodeURIComponent(
          "This package is invoiced or in use and can't be deleted.",
        )}`,
      );
    }
    throw err;
  }

  revalidatePath("/dashboard/packages");
  redirect("/dashboard/packages");
}
