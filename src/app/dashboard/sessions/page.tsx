import Link from "next/link";
import { asc, gte } from "drizzle-orm";
import { db } from "@/db";
import { sessions } from "@/db/schema";
import { formatCents } from "@/lib/money";
import { formatDateTime, SESSION_STATUS_META } from "@/lib/scheduling";
import { requireRole } from "@/lib/session";
import { Flash } from "../flash";
import { SessionControls } from "./session-controls";

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

  const rows = await db.query.sessions.findMany({
    where: gte(sessions.scheduledAt, startOfToday),
    orderBy: [asc(sessions.scheduledAt)],
    with: { engagement: { with: { student: true, subject: true } } },
  });

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Upcoming sessions</h1>
        <Link href="/dashboard/engagements" className="btn btn-ghost btn-sm">
          Engagements
        </Link>
      </div>
      <Flash error={error} />

      <div className="card bg-base-100 shadow-sm">
        <div className="card-body p-0">
          {rows.length === 0 ? (
            <p className="p-6 text-base-content/70">
              Nothing scheduled from today onward. Book sessions from an{" "}
              <Link href="/dashboard/engagements" className="link">
                engagement
              </Link>
              .
            </p>
          ) : (
            <ul className="flex flex-col divide-y divide-base-200">
              {rows.map((session) => {
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
                        {session.durationMinutes} min · {modeLabel(session.mode)} ·{" "}
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
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}
