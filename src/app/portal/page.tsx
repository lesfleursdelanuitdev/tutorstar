import { CalendarClock, Package, Receipt, StickyNote } from "lucide-react";
import { and, asc, desc, eq, gte, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  clientsStudents,
  engagements,
  invoices,
  packages,
  sessionNotes,
  sessions,
  students,
  subjects,
  usersClients,
} from "@/db/schema";
import {
  formatQuantity,
  INVOICE_STATUS_META,
  packageLabel,
  type InvoiceStatus,
} from "@/lib/billing";
import { formatCents } from "@/lib/money";
import { formatDateTime } from "@/lib/scheduling";
import { requirePortalUser } from "@/lib/session";

const MODE_LABEL = { online: "Online", in_person: "In person" } as const;

export default async function PortalPage() {
  const { user } = await requirePortalUser();

  // Who can this viewer see? A student sees themselves; a client sees every
  // student linked to their client record(s). Both feed one "visible students"
  // set that drives the schedule and package balances.
  const [studentSelf, clientLinks] = await Promise.all([
    db.query.students.findFirst({
      where: eq(students.userId, user.id),
      columns: { id: true },
    }),
    db
      .select({ clientId: usersClients.clientId })
      .from(usersClients)
      .where(eq(usersClients.userId, user.id)),
  ]);
  const clientIds = clientLinks.map((c) => c.clientId);

  const linkedStudents = clientIds.length
    ? await db
        .select({ id: clientsStudents.studentId })
        .from(clientsStudents)
        .where(inArray(clientsStudents.clientId, clientIds))
    : [];
  const studentIds = Array.from(
    new Set([
      ...(studentSelf ? [studentSelf.id] : []),
      ...linkedStudents.map((s) => s.id),
    ]),
  );

  const now = new Date();

  const [upcoming, sharedNotes, pkgRows, invoiceRows] = await Promise.all([
    // Upcoming schedule: still-scheduled sessions for visible students.
    studentIds.length
      ? db
          .select({
            id: sessions.id,
            scheduledAt: sessions.scheduledAt,
            durationMinutes: sessions.durationMinutes,
            mode: sessions.mode,
            studentName: students.name,
            subjectName: subjects.name,
          })
          .from(sessions)
          .innerJoin(engagements, eq(sessions.engagementId, engagements.id))
          .innerJoin(students, eq(engagements.studentId, students.id))
          .innerJoin(subjects, eq(engagements.subjectId, subjects.id))
          .where(
            and(
              inArray(engagements.studentId, studentIds),
              gte(sessions.scheduledAt, now),
              eq(sessions.status, "scheduled"),
            ),
          )
          .orderBy(asc(sessions.scheduledAt))
          .limit(20)
      : [],
    // Shared lesson notes: private notes never match, so they never leak.
    studentIds.length
      ? db
          .select({
            id: sessionNotes.id,
            body: sessionNotes.body,
            scheduledAt: sessions.scheduledAt,
            studentName: students.name,
            subjectName: subjects.name,
          })
          .from(sessionNotes)
          .innerJoin(sessions, eq(sessionNotes.sessionId, sessions.id))
          .innerJoin(engagements, eq(sessions.engagementId, engagements.id))
          .innerJoin(students, eq(engagements.studentId, students.id))
          .innerJoin(subjects, eq(engagements.subjectId, subjects.id))
          .where(
            and(
              eq(sessionNotes.visibility, "shared"),
              inArray(engagements.studentId, studentIds),
            ),
          )
          .orderBy(desc(sessions.scheduledAt))
          .limit(20)
      : [],
    // Prepaid package balances (derived, never stored).
    studentIds.length
      ? db.query.packages.findMany({
          where: inArray(packages.studentId, studentIds),
          columns: { id: true, unit: true, quantity: true },
          with: {
            student: { columns: { name: true } },
            sessions: { columns: { durationMinutes: true } },
          },
          orderBy: [desc(packages.purchasedAt)],
        })
      : [],
    // Invoices are a payer concern — clients only, and never drafts.
    clientIds.length
      ? db.query.invoices.findMany({
          where: and(
            inArray(invoices.clientId, clientIds),
            inArray(invoices.status, ["sent", "paid"]),
          ),
          columns: {
            id: true,
            number: true,
            status: true,
            issuedOn: true,
            dueOn: true,
          },
          with: {
            lineItems: { columns: { amountCents: true } },
            payments: { columns: { amountCents: true } },
          },
          orderBy: [desc(invoices.number)],
        })
      : [],
  ]);

  const isLinked = studentIds.length > 0 || clientIds.length > 0;

  return (
    <>
      <div>
        <h1 className="text-2xl font-bold">Welcome, {user.name}</h1>
        <p className="text-base-content/70 mt-1">Your tutoring at a glance.</p>
      </div>

      {!isLinked && (
        <div className="card bg-base-100 shadow-sm">
          <div className="card-body">
            <p className="text-base-content/70">
              Your account isn&apos;t linked to any students yet. Please contact
              your tutor to get set up.
            </p>
          </div>
        </div>
      )}

      {/* Upcoming schedule */}
      {studentIds.length > 0 && (
        <section className="card bg-base-100 shadow-sm">
          <div className="card-body gap-4">
            <h2 className="card-title text-lg gap-2">
              <CalendarClock className="size-5 text-primary" />
              Upcoming sessions
            </h2>
            {upcoming.length === 0 ? (
              <p className="text-base-content/70">
                No upcoming sessions scheduled.
              </p>
            ) : (
              <ul className="flex flex-col divide-y divide-base-200">
                {upcoming.map((s) => (
                  <li
                    key={s.id}
                    className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"
                  >
                    <div>
                      <div className="font-medium">
                        {s.subjectName}
                        {studentIds.length > 1 && (
                          <span className="text-base-content/60">
                            {" "}
                            · {s.studentName}
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-base-content/70">
                        {formatDateTime(s.scheduledAt)} · {s.durationMinutes} min
                      </div>
                    </div>
                    <span className="badge badge-ghost shrink-0">
                      {MODE_LABEL[s.mode]}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      )}

      {/* Shared lesson notes */}
      {studentIds.length > 0 && sharedNotes.length > 0 && (
        <section className="card bg-base-100 shadow-sm">
          <div className="card-body gap-4">
            <h2 className="card-title text-lg gap-2">
              <StickyNote className="size-5 text-primary" />
              Lesson notes
            </h2>
            <ul className="flex flex-col divide-y divide-base-200">
              {sharedNotes.map((note) => (
                <li
                  key={note.id}
                  className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0"
                >
                  <div className="text-sm text-base-content/70">
                    {note.subjectName}
                    {studentIds.length > 1 && (
                      <span> · {note.studentName}</span>
                    )}{" "}
                    · {formatDateTime(note.scheduledAt)}
                  </div>
                  <p className="whitespace-pre-wrap">{note.body}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* Package balances */}
      {pkgRows.length > 0 && (
        <section className="card bg-base-100 shadow-sm">
          <div className="card-body gap-4">
            <h2 className="card-title text-lg gap-2">
              <Package className="size-5 text-primary" />
              Package balances
            </h2>
            <ul className="flex flex-col divide-y divide-base-200">
              {pkgRows.map((pkg) => {
                const consumed =
                  pkg.unit === "hours"
                    ? pkg.sessions.reduce(
                        (sum, s) => sum + s.durationMinutes / 60,
                        0,
                      )
                    : pkg.sessions.length;
                const remaining = Number(pkg.quantity) - consumed;
                return (
                  <li
                    key={pkg.id}
                    className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"
                  >
                    <div>
                      <div className="font-medium">{pkg.student.name}</div>
                      <div className="text-sm text-base-content/70">
                        {packageLabel(pkg.unit, pkg.quantity)} purchased
                      </div>
                    </div>
                    <span className="text-right shrink-0">
                      <span className="font-semibold">
                        {formatQuantity(String(remaining))}
                      </span>{" "}
                      <span className="text-base-content/70">
                        {pkg.unit} left
                      </span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
      )}

      {/* Invoices */}
      {clientIds.length > 0 && (
        <section className="card bg-base-100 shadow-sm">
          <div className="card-body gap-4">
            <h2 className="card-title text-lg gap-2">
              <Receipt className="size-5 text-primary" />
              Invoices
            </h2>
            {invoiceRows.length === 0 ? (
              <p className="text-base-content/70">No invoices yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Invoice</th>
                      <th>Issued</th>
                      <th>Due</th>
                      <th className="text-right">Total</th>
                      <th className="text-right">Balance</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoiceRows.map((inv) => {
                      const total = inv.lineItems.reduce(
                        (sum, li) => sum + li.amountCents,
                        0,
                      );
                      const paid = inv.payments.reduce(
                        (sum, p) => sum + p.amountCents,
                        0,
                      );
                      const balance = Math.max(total - paid, 0);
                      const meta = INVOICE_STATUS_META[inv.status as InvoiceStatus];
                      return (
                        <tr key={inv.id}>
                          <td className="font-medium">#{inv.number}</td>
                          <td>{inv.issuedOn ?? "—"}</td>
                          <td>{inv.dueOn ?? "—"}</td>
                          <td className="text-right">{formatCents(total)}</td>
                          <td className="text-right">{formatCents(balance)}</td>
                          <td className="text-right">
                            <span className={`badge ${meta.badge}`}>
                              {meta.label}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      )}
    </>
  );
}
