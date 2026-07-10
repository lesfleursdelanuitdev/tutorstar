// Shared "what can still be billed for this client" queries, used by both the
// invoice pages (to show pickable items) and the actions (to re-derive amounts
// and descriptions server-side rather than trusting the form).
import { and, asc, eq, isNull, ne } from "drizzle-orm";
import { db } from "@/db";
import {
  engagements,
  invoiceLineItems,
  packages,
  sessions,
  students,
} from "@/db/schema";
import { sessionAmountCents, type PackageUnit } from "@/lib/billing";
import { subjectNamesSql } from "@/lib/subjects";

export type BillableSession = {
  id: string;
  scheduledAt: Date;
  durationMinutes: number;
  studentName: string;
  subjectNames: string;
  amountCents: number;
};

export type BillablePackage = {
  id: string;
  unit: PackageUnit;
  quantity: string;
  priceCents: number;
  studentName: string;
};

// A session is billable to its engagement's client when it's marked billable,
// isn't drawn from a prepaid package, has actually happened (not still just
// scheduled), and isn't already on an invoice line.
export async function getBillableSessions(
  clientId: string,
): Promise<BillableSession[]> {
  const rows = await db
    .select({
      id: sessions.id,
      scheduledAt: sessions.scheduledAt,
      durationMinutes: sessions.durationMinutes,
      rateCents: sessions.rateCents,
      studentName: students.name,
      subjectNames: subjectNamesSql,
    })
    .from(sessions)
    .innerJoin(engagements, eq(sessions.engagementId, engagements.id))
    .innerJoin(students, eq(engagements.studentId, students.id))
    .leftJoin(invoiceLineItems, eq(invoiceLineItems.sessionId, sessions.id))
    .where(
      and(
        eq(engagements.clientId, clientId),
        eq(sessions.billable, true),
        isNull(sessions.packageId),
        ne(sessions.status, "scheduled"),
        isNull(invoiceLineItems.id),
      ),
    )
    .orderBy(asc(sessions.scheduledAt));

  return rows.map((r) => ({
    id: r.id,
    scheduledAt: r.scheduledAt,
    durationMinutes: r.durationMinutes,
    studentName: r.studentName,
    subjectNames: r.subjectNames,
    amountCents: sessionAmountCents(r.rateCents, r.durationMinutes),
  }));
}

// A package purchase is billable to its payer until it lands on an invoice.
export async function getBillablePackages(
  clientId: string,
): Promise<BillablePackage[]> {
  const rows = await db
    .select({
      id: packages.id,
      unit: packages.unit,
      quantity: packages.quantity,
      priceCents: packages.priceCents,
      studentName: students.name,
    })
    .from(packages)
    .innerJoin(students, eq(packages.studentId, students.id))
    .leftJoin(invoiceLineItems, eq(invoiceLineItems.packageId, packages.id))
    .where(and(eq(packages.clientId, clientId), isNull(invoiceLineItems.id)))
    .orderBy(asc(packages.purchasedAt));

  return rows;
}
