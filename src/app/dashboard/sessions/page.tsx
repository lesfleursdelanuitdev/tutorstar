import Link from "next/link";
import { and, asc, desc, gte, lt } from "drizzle-orm";
import { db } from "@/db";
import { sessions } from "@/db/schema";
import { formatCents } from "@/lib/money";
import { formatDateTime, SESSION_STATUS_META } from "@/lib/scheduling";
import { requireRole } from "@/lib/session";
import { Flash } from "../flash";
import { SessionControls } from "./session-controls";
import { SessionNotes } from "./session-notes";

const modeLabel = (mode: string) => (mode === "online" ? "online" : "in person");

export default async function SessionsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireRole("tutor");
  const { error } = await searchParams;

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const thirtyDaysAgo = new Date(startOfToday);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Upcoming feeds the agenda; recent (last 30 days) is where notes usually
  // get written, so completed sessions stay reachable without a separate page.
  const [upcoming, recent] = await Promise.all([
    db.query.sessions.findMany({
      where: gte(sessions.scheduledAt, startOfToday),
      orderBy: [asc(sessions.scheduledAt)],
      with: {
        engagement: { with: { student: true, subject: true } },
        notes: { orderBy: (n, { asc }) => [asc(n.createdAt)] },
      },
    }),
    db.query.sessions.findMany({
      where: and(
        lt(sessions.scheduledAt, startOfToday),
        gte(sessions.scheduledAt, thirtyDaysAgo),
      ),
      orderBy: [desc(sessions.scheduledAt)],
      with: {
        engagement: { with: { student: true, subject: true } },
        notes: { orderBy: (n, { asc }) => [asc(n.createdAt)] },
      },
    }),
  ]);

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
      <Flash error={error} />

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
                            {session.engagement.subject.name}
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
