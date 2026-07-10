import {
  CalendarClock,
  Package,
  Receipt,
  StickyNote,
  Target,
  ChartColumn,
} from "lucide-react";
import { and, asc, desc, eq, gte, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  assessmentSeries,
  assessments,
  clientsStudents,
  engagements,
  goalSteps,
  goals,
  invoices,
  packages,
  sessionNotes,
  sessions,
  students,
  usersClients,
} from "@/db/schema";
import {
  formatQuantity,
  INVOICE_STATUS_META,
  packageLabel,
  type InvoiceStatus,
} from "@/lib/billing";
import { formatCents } from "@/lib/money";
import {
  formatScore,
  goalProgressLabel,
  isGoalComplete,
} from "@/lib/progress";
import { formatDateTime } from "@/lib/scheduling";
import { requirePortalUser } from "@/lib/session";
import { subjectNamesSql } from "@/lib/subjects";

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

  const [upcoming, sharedNotes, pkgRows, invoiceRows, sharedGoals, sharedSeries] =
    await Promise.all([
    // Upcoming schedule: still-scheduled sessions for visible students.
    studentIds.length
      ? db
          .select({
            id: sessions.id,
            scheduledAt: sessions.scheduledAt,
            durationMinutes: sessions.durationMinutes,
            mode: sessions.mode,
            studentName: students.name,
            subjectNames: subjectNamesSql,
          })
          .from(sessions)
          .innerJoin(engagements, eq(sessions.engagementId, engagements.id))
          .innerJoin(students, eq(engagements.studentId, students.id))
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
            subjectNames: subjectNamesSql,
          })
          .from(sessionNotes)
          .innerJoin(sessions, eq(sessionNotes.sessionId, sessions.id))
          .innerJoin(engagements, eq(sessions.engagementId, engagements.id))
          .innerJoin(students, eq(engagements.studentId, students.id))
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
    studentIds.length
      ? db.query.goals.findMany({
          where: and(
            inArray(goals.studentId, studentIds),
            eq(goals.visibility, "shared"),
            eq(goals.status, "active"),
          ),
          orderBy: [asc(goals.orderIndex)],
          with: {
            subject: { columns: { name: true } },
            student: { columns: { name: true } },
            steps: { orderBy: [asc(goalSteps.orderIndex)] },
          },
        })
      : [],
    studentIds.length
      ? db.query.assessmentSeries.findMany({
          where: and(
            inArray(assessmentSeries.studentId, studentIds),
            eq(assessmentSeries.visibility, "shared"),
          ),
          orderBy: [asc(assessmentSeries.name)],
          with: {
            subject: { columns: { name: true } },
            student: { columns: { name: true } },
            assessments: {
              orderBy: [asc(assessments.takenOn)],
              columns: {
                id: true,
                takenOn: true,
                rawScore: true,
                maxScore: true,
              },
            },
          },
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
                        {s.subjectNames}
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
                    {note.subjectNames}
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

      {/* Shared goals / lesson plan */}
      {sharedGoals.length > 0 && (
        <section className="card bg-base-100 shadow-sm">
          <div className="card-body gap-4">
            <h2 className="card-title text-lg gap-2">
              <Target className="size-5 text-primary" />
              Learning goals
            </h2>
            <ul className="flex flex-col gap-3">
              {sharedGoals.map((goal) => {
                const complete = isGoalComplete(goal.steps);
                return (
                  <li
                    key={goal.id}
                    className="rounded-xl bg-base-200/50 p-3"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">{goal.title}</span>
                      {goal.subject && (
                        <span className="text-sm text-base-content/60">
                          · {goal.subject.name}
                        </span>
                      )}
                      {studentIds.length > 1 && (
                        <span className="text-sm text-base-content/60">
                          · {goal.student.name}
                        </span>
                      )}
                      <span className="badge badge-ghost badge-sm">
                        {goalProgressLabel(goal.steps)}
                      </span>
                      {complete && (
                        <span className="badge badge-success badge-sm">
                          Complete
                        </span>
                      )}
                    </div>
                    {goal.description && (
                      <p className="mt-1 text-sm text-base-content/70">
                        {goal.description}
                      </p>
                    )}
                    <ul className="mt-2 flex flex-col gap-1">
                      {goal.steps.map((step) => (
                        <li
                          key={step.id}
                          className={`text-sm ${
                            step.completedAt
                              ? "line-through text-base-content/50"
                              : ""
                          }`}
                        >
                          {step.completedAt ? "✓" : "○"} {step.title}
                        </li>
                      ))}
                    </ul>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
      )}

      {/* Shared assessment trends */}
      {sharedSeries.some((s) => s.assessments.length > 0) && (
        <section className="card bg-base-100 shadow-sm">
          <div className="card-body gap-4">
            <h2 className="card-title text-lg gap-2">
              <ChartColumn className="size-5 text-primary" />
              Assessment progress
            </h2>
            <ul className="flex flex-col gap-4">
              {sharedSeries
                .filter((s) => s.assessments.length > 0)
                .map((series) => {
                  const maxPct = Math.max(
                    ...series.assessments.map((a) =>
                      Number(a.maxScore) > 0
                        ? (Number(a.rawScore) / Number(a.maxScore)) * 100
                        : 0,
                    ),
                    1,
                  );
                  return (
                    <li key={series.id}>
                      <div className="mb-2 font-semibold">
                        {series.name}
                        {series.subject && (
                          <span className="text-sm font-normal text-base-content/60">
                            {" "}
                            · {series.subject.name}
                          </span>
                        )}
                        {studentIds.length > 1 && (
                          <span className="text-sm font-normal text-base-content/60">
                            {" "}
                            · {series.student.name}
                          </span>
                        )}
                      </div>
                      <div className="flex h-16 items-end gap-1.5">
                        {series.assessments.map((a) => {
                          const pct =
                            Number(a.maxScore) > 0
                              ? (Number(a.rawScore) / Number(a.maxScore)) * 100
                              : 0;
                          const height = Math.max((pct / maxPct) * 100, 8);
                          return (
                            <div
                              key={a.id}
                              className="flex flex-1 flex-col items-center gap-1"
                              title={`${a.takenOn}: ${formatScore(a.rawScore, a.maxScore)}`}
                            >
                              <div
                                className="w-full rounded-t-md bg-primary"
                                style={{ height: `${height}%` }}
                              />
                              <span className="text-[10px] text-base-content/60">
                                {a.takenOn.slice(5)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                      <ul className="mt-2 text-xs text-base-content/70">
                        {series.assessments.map((a) => (
                          <li key={`${a.id}-lbl`}>
                            {a.takenOn}: {formatScore(a.rawScore, a.maxScore)}
                          </li>
                        ))}
                      </ul>
                    </li>
                  );
                })}
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
