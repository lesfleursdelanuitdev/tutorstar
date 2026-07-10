"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { PG_UNIQUE_VIOLATION, pgErrorCode } from "@/db/errors";
import { invoiceLineItems, invoices, payments } from "@/db/schema";
import { invoiceEmail, sendEmail } from "@/lib/email";
import { formString, isUuid } from "@/lib/forms";
import { formCents } from "@/lib/money";
import { packageLabel } from "@/lib/billing";
import { formatDateTime } from "@/lib/scheduling";
import { requireRole } from "@/lib/session";
import { getBillablePackages, getBillableSessions } from "./queries";

function detailPath(invoiceId: string) {
  return `/dashboard/invoices/${invoiceId}`;
}

function failNew(clientId: string, message: string): never {
  redirect(
    `/dashboard/invoices/new?clientId=${clientId}&error=${encodeURIComponent(
      message,
    )}`,
  );
}

function failDetail(invoiceId: string, message: string): never {
  redirect(`${detailPath(invoiceId)}?error=${encodeURIComponent(message)}`);
}

// The selected UUIDs for a repeated checkbox field.
function uuidList(formData: FormData, key: string): string[] {
  return formData
    .getAll(key)
    .filter((v): v is string => typeof v === "string" && isUuid(v));
}

// Re-derive line items server-side from the currently-billable items, keeping
// only the selected ones. Amounts and descriptions never come from the form.
async function buildLineItems(
  invoiceId: string,
  clientId: string,
  sessionIds: string[],
  packageIds: string[],
) {
  const [availSessions, availPackages] = await Promise.all([
    getBillableSessions(clientId),
    getBillablePackages(clientId),
  ]);
  const wantSessions = new Set(sessionIds);
  const wantPackages = new Set(packageIds);

  return [
    ...availSessions
      .filter((s) => wantSessions.has(s.id))
      .map((s) => ({
        invoiceId,
        sessionId: s.id,
        description: `${s.studentName} · ${s.subjectNames} — ${formatDateTime(
          s.scheduledAt,
        )} (${s.durationMinutes} min)`,
        amountCents: s.amountCents,
      })),
    ...availPackages
      .filter((p) => wantPackages.has(p.id))
      .map((p) => ({
        invoiceId,
        packageId: p.id,
        description: `${packageLabel(p.unit, p.quantity)} package — ${p.studentName}`,
        amountCents: p.priceCents,
      })),
  ];
}

export async function createInvoiceAction(formData: FormData) {
  await requireRole("tutor");
  const clientId = formString(formData, "clientId");
  if (!isUuid(clientId)) redirect("/dashboard/invoices/new");

  const sessionIds = uuidList(formData, "sessionId");
  const packageIds = uuidList(formData, "packageId");
  if (sessionIds.length + packageIds.length === 0) {
    failNew(clientId, "Select at least one item to bill.");
  }

  let invoiceId: string;
  try {
    invoiceId = await db.transaction(async (tx) => {
      const [invoice] = await tx
        .insert(invoices)
        .values({ clientId })
        .returning({ id: invoices.id });
      const items = await buildLineItems(
        invoice.id,
        clientId,
        sessionIds,
        packageIds,
      );
      if (items.length === 0) {
        // Everything selected was billed by someone else in the meantime.
        throw new Error("STALE_SELECTION");
      }
      await tx.insert(invoiceLineItems).values(items);
      return invoice.id;
    });
  } catch (err) {
    if (err instanceof Error && err.message === "STALE_SELECTION") {
      failNew(clientId, "Those items are no longer billable. Try again.");
    }
    if (pgErrorCode(err) === PG_UNIQUE_VIOLATION) {
      failNew(clientId, "One of those items was just billed on another invoice.");
    }
    throw err;
  }

  revalidatePath("/dashboard/invoices");
  redirect(detailPath(invoiceId));
}

export async function addLineItemsAction(
  invoiceId: string,
  formData: FormData,
) {
  await requireRole("tutor");
  const invoice = await db.query.invoices.findFirst({
    where: eq(invoices.id, invoiceId),
    columns: { id: true, clientId: true, status: true },
  });
  if (!invoice) redirect("/dashboard/invoices");
  if (invoice.status !== "draft") {
    failDetail(invoiceId, "Only draft invoices can be edited.");
  }

  const items = await buildLineItems(
    invoiceId,
    invoice.clientId,
    uuidList(formData, "sessionId"),
    uuidList(formData, "packageId"),
  );
  if (items.length === 0) failDetail(invoiceId, "Nothing to add.");

  try {
    await db.insert(invoiceLineItems).values(items);
  } catch (err) {
    if (pgErrorCode(err) === PG_UNIQUE_VIOLATION) {
      failDetail(invoiceId, "One of those items was just billed elsewhere.");
    }
    throw err;
  }

  revalidatePath(detailPath(invoiceId));
  redirect(`${detailPath(invoiceId)}?saved=1`);
}

export async function removeLineItemAction(
  invoiceId: string,
  formData: FormData,
) {
  await requireRole("tutor");
  const lineItemId = formString(formData, "lineItemId");
  const invoice = await db.query.invoices.findFirst({
    where: eq(invoices.id, invoiceId),
    columns: { status: true },
  });
  if (!invoice) redirect("/dashboard/invoices");
  if (invoice.status !== "draft") {
    failDetail(invoiceId, "Only draft invoices can be edited.");
  }
  if (!isUuid(lineItemId)) redirect(detailPath(invoiceId));

  await db
    .delete(invoiceLineItems)
    .where(
      and(
        eq(invoiceLineItems.id, lineItemId),
        eq(invoiceLineItems.invoiceId, invoiceId),
      ),
    );

  revalidatePath(detailPath(invoiceId));
  redirect(detailPath(invoiceId));
}

export async function sendInvoiceAction(invoiceId: string, formData: FormData) {
  await requireRole("tutor");
  const invoice = await db.query.invoices.findFirst({
    where: eq(invoices.id, invoiceId),
    columns: { status: true, number: true },
    with: {
      client: { columns: { name: true, email: true } },
      lineItems: { columns: { description: true, amountCents: true } },
      payments: { columns: { amountCents: true } },
    },
  });
  if (!invoice) redirect("/dashboard/invoices");
  if (invoice.status !== "draft") {
    failDetail(invoiceId, "This invoice has already been sent.");
  }
  if (invoice.lineItems.length === 0) {
    failDetail(invoiceId, "Add at least one line item before sending.");
  }
  if (!invoice.client.email) {
    failDetail(
      invoiceId,
      "Add an email address to this client before sending the invoice.",
    );
  }

  const total = invoice.lineItems.reduce((sum, li) => sum + li.amountCents, 0);
  const paid = invoice.payments.reduce((sum, p) => sum + p.amountCents, 0);
  const balance = Math.max(total - paid, 0);
  const today = new Date().toISOString().slice(0, 10);
  const dueOn = formString(formData, "dueOn");

  // Email before flipping status: a delivery failure leaves the invoice as a
  // draft the tutor can retry, rather than a "sent" invoice nobody received.
  try {
    await sendEmail({
      ...invoiceEmail({
        number: invoice.number,
        clientName: invoice.client.name,
        lineItems: invoice.lineItems,
        totalCents: total,
        paidCents: paid,
        balanceCents: balance,
        issuedOn: today,
        dueOn,
      }),
      to: invoice.client.email,
    });
  } catch {
    failDetail(invoiceId, "Couldn't send the invoice email. Try again.");
  }

  await db
    .update(invoices)
    .set({ status: "sent", issuedOn: today, dueOn })
    .where(eq(invoices.id, invoiceId));

  revalidatePath("/dashboard/invoices");
  revalidatePath(detailPath(invoiceId));
  redirect(`${detailPath(invoiceId)}?saved=1`);
}

export async function voidInvoiceAction(invoiceId: string) {
  await requireRole("tutor");
  const invoice = await db.query.invoices.findFirst({
    where: eq(invoices.id, invoiceId),
    columns: { status: true },
  });
  if (!invoice) redirect("/dashboard/invoices");
  if (invoice.status === "paid" || invoice.status === "void") {
    failDetail(invoiceId, "This invoice can no longer be voided.");
  }

  await db.update(invoices).set({ status: "void" }).where(eq(invoices.id, invoiceId));
  revalidatePath("/dashboard/invoices");
  revalidatePath(detailPath(invoiceId));
  redirect(`${detailPath(invoiceId)}?saved=1`);
}

export async function deleteInvoiceAction(invoiceId: string) {
  await requireRole("tutor");
  const invoice = await db.query.invoices.findFirst({
    where: eq(invoices.id, invoiceId),
    columns: { status: true },
  });
  if (!invoice) redirect("/dashboard/invoices");
  if (invoice.status !== "draft") {
    failDetail(invoiceId, "Only draft invoices can be deleted. Void it instead.");
  }

  await db.transaction(async (tx) => {
    await tx
      .delete(invoiceLineItems)
      .where(eq(invoiceLineItems.invoiceId, invoiceId));
    await tx.delete(invoices).where(eq(invoices.id, invoiceId));
  });

  revalidatePath("/dashboard/invoices");
  redirect("/dashboard/invoices");
}

export async function recordPaymentAction(
  invoiceId: string,
  formData: FormData,
) {
  await requireRole("tutor");
  const invoice = await db.query.invoices.findFirst({
    where: eq(invoices.id, invoiceId),
    columns: { status: true },
    with: {
      lineItems: { columns: { amountCents: true } },
      payments: { columns: { amountCents: true } },
    },
  });
  if (!invoice) redirect("/dashboard/invoices");
  if (invoice.status !== "sent") {
    failDetail(invoiceId, "Payments can only be recorded on a sent invoice.");
  }

  const amountCents = formCents(formData, "amount");
  if (amountCents === null || amountCents <= 0) {
    failDetail(invoiceId, "Enter a valid payment amount.");
  }

  await db.insert(payments).values({
    invoiceId,
    amountCents,
    method: formString(formData, "method"),
    notes: formString(formData, "notes"),
  });

  // Auto-settle once payments cover the total.
  const total = invoice.lineItems.reduce((sum, li) => sum + li.amountCents, 0);
  const paid =
    invoice.payments.reduce((sum, p) => sum + p.amountCents, 0) + amountCents;
  if (paid >= total) {
    await db
      .update(invoices)
      .set({ status: "paid" })
      .where(eq(invoices.id, invoiceId));
    revalidatePath("/dashboard/invoices");
  }

  revalidatePath(detailPath(invoiceId));
  redirect(`${detailPath(invoiceId)}?saved=1`);
}
