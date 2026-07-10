import Link from "next/link";
import { and, asc, desc, eq, gte, inArray, lt } from "drizzle-orm";
import { db } from "@/db";
import {
  assessmentSeries,
  assessments,
  goalSteps,
  goals,
  sessions,
} from "@/db/schema";
import { formatCents } from "@/lib/money";
import { formatDateTime, SESSION_STATUS_META } from "@/lib/scheduling";
import { requireRole } from "@/lib/session";
import { subjectNames } from "@/lib/subjects";
import { Flash } from "../flash";
import { SessionControls } from "./session-controls";
import { SessionNotes } from "./session-notes";
import { SessionProgress } from "./session-progress";

const modeLabel = (mode: string) => (mode === "online" ? "online" : "in person");

export default async function SessionsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  await requireRole("tutor");
  const { error, saved } = await searchParams;

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const thirtyDaysAgo = new Date(startOfToday);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [upcoming, recent] = await Promise.all([
    db.query.sessions.findMany({
      where: gte(sessions.scheduledAt, startOfToday),
      orderBy: [asc(sessions.scheduledAt)],
      with: {
        engagement: {
          with: {
            student: true,
            engagementSubjects: { with: { subject: true } },
          },
        },
        notes: { orderBy: (n, { asc }) => [asc(n.createdAt)] },
        assessments: {
          with: { series: { columns: { name: true } } },
          orderBy: [desc(assessments.takenOn)],
        },
        stepsCompleted: {
          columns: { id: true, title: true, completedAt: true },
          with: { goal: { columns: { title: true, studentId: true } } },
        },
      },
    }),
    db.query.sessions.findMany({
      where: and(
        lt(sessions.scheduledAt, startOfToday),
        gte(sessions.scheduledAt, thirtyDaysAgo),
      ),
      orderBy: [desc(sessions.scheduledAt)],
      with: {
        engagement: {
          with: {
            student: true,
            engagementSubjects: { with: { subject: true } },
          },
        },
        notes: { orderBy: (n, { asc }) => [asc(n.createdAt)] },
        assessments: {
          with: { series: { columns: { name: true } } },
          orderBy: [desc(assessments.takenOn)],
        },
        stepsCompleted: {
          columns: { id: true, title: true, completedAt: true },
          with: { goal: { columns: { title: true, studentId: true } } },
        },
      },
    }),
  ]);

  const studentIds = Array.from(
    new Set(
      [...upcoming, ...recent].map((s) => s.engagement.student.id),
    ),
  );

  const [activeGoals, seriesForStudents] = studentIds.length
    ? await Promise.all([
        db.query.goals.findMany({
          where: and(
            inArray(goals.studentId, studentIds),
            eq(goals.status, "active"),
          ),
          with: {
            steps: { orderBy: [asc(goalSteps.orderIndex)] },
          },
        }),
        db.query.assessmentSeries.findMany({
          where: inArray(assessmentSeries.studentId, studentIds),
          columns: { id: true, name: true, studentId: true },
          orderBy: [asc(assessmentSeries.name)],
        }),
      ])
    : [[], []];

  const goalsByStudent = new Map<string, typeof activeGoals>();
  for (const g of activeGoals) {
    const list = goalsByStudent.get(g.studentId) ?? [];
    list.push(g);
    goalsByStudent.set(g.studentId, list);
  }
  const seriesByStudent = new Map<string, typeof seriesForStudents>();
  for (const s of seriesForStudents) {
    const list = seriesByStudent.get(s.studentId) ?? [];
    list.push(s);
    seriesByStudent.set(s.studentId, list);
  }

  const groups = [
    {
      title: "Upcoming",
      rows: upcoming,
      empty: (
        <p className="p-6 text-base-content/70">
          Nothing scheduled from today onward. Book sessions from an{" "}
          <Link href="/dashboard/engagements" className="link">
            engagement
          </Link>
          .
        </p>
      ),
    },
    {
      title: "Recent (last 30 days)",
      rows: recent,
      empty: (
        <p className="p-6 text-base-content/70">
          No sessions in the last 30 days.
        </p>
      ),
    },
  ];

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Sessions</h1>
        <Link href="/dashboard/engagements" className="btn btn-ghost btn-sm">
          Engagements
        </Link>
      </div>
      <Flash error={error} saved={saved} />

      {groups.map((group) => (
        <section key={group.title} className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">{group.title}</h2>
          <div className="card bg-base-100 shadow-sm">
            <div className="card-body p-0">
              {group.rows.length === 0 ? (
                group.empty
              ) : (
                <ul className="flex flex-col divide-y divide-base-200">
                  {group.rows.map((session) => {
                    const meta = SESSION_STATUS_META[session.status];
                    const studentId = session.engagement.student.id;
                    const studentGoals = goalsByStudent.get(studentId) ?? [];
                    const openSteps = studentGoals.flatMap((g) =>
                      g.steps
                        .filter((s) => s.completedAt === null)
                        .map((s) => ({
                          id: s.id,
                          title: s.title,
                          goalTitle: g.title,
                          completedAt: s.completedAt,
                        })),
                    );
                    // Also show steps completed in this session so they can be unchecked.
                    const completedHere = session.stepsCompleted.map((s) => ({
                      id: s.id,
                      title: s.title,
                      goalTitle: s.goal.title,
                      completedAt: s.completedAt,
                    }));
                    const stepIds = new Set(openSteps.map((s) => s.id));
                    const mergedSteps = [
                      ...completedHere.filter((s) => !stepIds.has(s.id)),
                      ...openSteps,
                    ];

                    return (
                      <li key={session.id} className="flex flex-col gap-2 p-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium">
                            {formatDateTime(session.scheduledAt)}
                          </span>
                          <Link
                            href={`/dashboard/engagements/${session.engagementId}`}
                            className="link link-hover text-sm"
                          >
                            {session.engagement.student.name} ·{" "}
                            {subjectNames(session.engagement.engagementSubjects)}
                          </Link>
                          <span className="text-sm text-base-content/60">
                            {session.durationMinutes} min ·{" "}
                            {modeLabel(session.mode)} ·{" "}
                            {formatCents(session.rateCents)}/hr
                          </span>
                          <span className={`badge badge-sm ${meta.badge}`}>
                            {meta.label}
                          </span>
                          {!session.billable && (
                            <span className="badge badge-sm badge-ghost">
                              non-billable
                            </span>
                          )}
                        </div>
                        <SessionControls
                          sessionId={session.id}
                          status={session.status}
                          billable={session.billable}
                          redirectTo="/dashboard/sessions"
                        />
                        <SessionNotes
                          sessionId={session.id}
                          notes={session.notes}
                          redirectTo="/dashboard/sessions"
                        />
                        <SessionProgress
                          sessionId={session.id}
                          studentId={studentId}
                          openSteps={mergedSteps}
                          series={(seriesByStudent.get(studentId) ?? []).map(
                            (s) => ({ id: s.id, name: s.name }),
                          )}
                          recentAssessments={session.assessments.map((a) => ({
                            id: a.id,
                            takenOn: a.takenOn,
                            rawScore: a.rawScore,
                            maxScore: a.maxScore,
                            seriesName: a.series.name,
                          }))}
                          redirectTo="/dashboard/sessions"
                        />
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </section>
      ))}
    </>
  );
}
