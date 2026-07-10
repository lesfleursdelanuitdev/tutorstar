import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  engagements,
  packages,
  recurringSchedules,
  sessions,
  subjects,
} from "@/db/schema";
import { packageLabel, formatQuantity } from "@/lib/billing";
import { isUuid } from "@/lib/forms";
import { centsToInput, formatCents } from "@/lib/money";
import {
  formatDateTime,
  SESSION_STATUS_META,
  todayIso,
  WEEKDAYS,
} from "@/lib/scheduling";
import { requireRole } from "@/lib/session";
import { subjectNames } from "@/lib/subjects";
import { Flash } from "../../flash";
import { CoverSelect } from "../../sessions/cover-select";
import { SessionControls } from "../../sessions/session-controls";
import { setSessionPackageAction } from "../../sessions/actions";
import {
  createScheduleAction,
  createSessionAction,
  deleteScheduleAction,
  endEngagementAction,
  generateSessionsAction,
  reactivateEngagementAction,
  setScheduleActiveAction,
  updateEngagementAction,
  updateEngagementSubjectsAction,
} from "../actions";

const modeLabel = (mode: string) => (mode === "online" ? "online" : "in person");

export default async function EngagementDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; saved?: string; info?: string }>;
}) {
  await requireRole("tutor");
  const { id } = await params;
  const { error, saved, info } = await searchParams;
  if (!isUuid(id)) notFound();

  const engagement = await db.query.engagements.findFirst({
    where: eq(engagements.id, id),
    with: {
      student: true,
      client: true,
      engagementSubjects: { with: { subject: true } },
    },
  });
  if (!engagement) notFound();

  const [allSubjects, schedules, sessionRows, studentPackages] = await Promise.all([
    db.query.subjects.findMany({ orderBy: [asc(subjects.name)] }),
    db.query.recurringSchedules.findMany({
      where: eq(recurringSchedules.engagementId, id),
      orderBy: [asc(recurringSchedules.weekday), asc(recurringSchedules.startTime)],
    }),
    db.query.sessions.findMany({
      where: eq(sessions.engagementId, id),
      orderBy: [desc(sessions.scheduledAt)],
    }),
    // Packages belong to a student and cover any of their engagements, so load
    // by student, with the sessions already drawing them down for balances.
    db.query.packages.findMany({
      where: eq(packages.studentId, engagement.studentId),
      orderBy: [desc(packages.purchasedAt)],
      with: { sessions: { columns: { durationMinutes: true } } },
    }),
  ]);

  const packageOptions = studentPackages.map((pkg) => {
    const consumed =
      pkg.unit === "hours"
        ? pkg.sessions.reduce((sum, s) => sum + s.durationMinutes / 60, 0)
        : pkg.sessions.length;
    const remaining = Number(pkg.quantity) - consumed;
    return {
      id: pkg.id,
      label: `${packageLabel(pkg.unit, pkg.quantity)} (${formatQuantity(
        String(remaining),
      )} ${pkg.unit} left)`,
    };
  });

  const engagementSubjectNames = subjectNames(engagement.engagementSubjects);
  const currentSubjectIds = new Set(
    engagement.engagementSubjects.map((es) => es.subjectId),
  );

  const here = `/dashboard/engagements/${engagement.id}`;
  const updateAction = updateEngagementAction.bind(null, engagement.id);
  const updateSubjectsAction = updateEngagementSubjectsAction.bind(
    null,
    engagement.id,
  );
  const endAction = endEngagementAction.bind(null, engagement.id);
  const reactivateAction = reactivateEngagementAction.bind(null, engagement.id);
  const addSessionAction = createSessionAction.bind(null, engagement.id);
  const addScheduleAction = createScheduleAction.bind(null, engagement.id);
  const generateAction = generateSessionsAction.bind(null, engagement.id);
  const scheduleActiveAction = setScheduleActiveAction.bind(null, engagement.id);
  const scheduleDeleteAction = deleteScheduleAction.bind(null, engagement.id);
  const coverAction = setSessionPackageAction.bind(null, here);

  // Default horizon for generating sessions: 8 weeks out.
  const through = new Date();
  through.setDate(through.getDate() + 56);
  const throughDefault = `${through.getFullYear()}-${String(
    through.getMonth() + 1,
  ).padStart(2, "0")}-${String(through.getDate()).padStart(2, "0")}`;

  return (
    <>
      <div className="breadcrumbs text-sm">
        <ul>
          <li>
            <Link href="/dashboard/engagements">Engagements</Link>
          </li>
          <li>
            {engagement.student.name} · {engagementSubjectNames}
          </li>
        </ul>
      </div>
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold">
          {engagement.student.name} · {engagementSubjectNames}
        </h1>
        <span
          className={`badge ${
            engagement.status === "active"
              ? "badge-success badge-outline"
              : "badge-ghost"
          }`}
        >
          {engagement.status}
        </span>
      </div>
      <Flash error={error} saved={saved} info={info} />

      <div className="grid gap-6 lg:grid-cols-2 items-start">
        <div className="card bg-base-100 shadow-sm">
          <div className="card-body">
            <h2 className="card-title text-lg">Details</h2>
            <dl className="grid grid-cols-3 gap-y-2 text-sm">
              <dt className="text-base-content/60">Student</dt>
              <dd className="col-span-2">
                <Link
                  href={`/dashboard/students/${engagement.studentId}`}
                  className="link link-hover"
                >
                  {engagement.student.name}
                </Link>
              </dd>
              <dt className="text-base-content/60">
                {engagement.engagementSubjects.length === 1
                  ? "Subject"
                  : "Subjects"}
              </dt>
              <dd className="col-span-2">{engagementSubjectNames}</dd>
              <dt className="text-base-content/60">Client</dt>
              <dd className="col-span-2">
                <Link
                  href={`/dashboard/clients/${engagement.clientId}`}
                  className="link link-hover"
                >
                  {engagement.client.name}
                </Link>
              </dd>
              <dt className="text-base-content/60">Started</dt>
              <dd className="col-span-2">{engagement.startedOn}</dd>
              {engagement.endedOn && (
                <>
                  <dt className="text-base-content/60">Ended</dt>
                  <dd className="col-span-2">{engagement.endedOn}</dd>
                </>
              )}
            </dl>

            <form action={updateAction} className="flex items-end gap-2 pt-3 mt-1 border-t border-base-200">
              <label className="form-control flex-1">
                <span className="label-text mb-1">Hourly rate (USD)</span>
                <input
                  name="hourlyRate"
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  defaultValue={centsToInput(engagement.hourlyRateCents)}
                  className="input input-bordered"
                />
              </label>
              <button type="submit" className="btn btn-primary">
                Save rate
              </button>
            </form>
            <p className="text-xs text-base-content/60">
              Currently {formatCents(engagement.hourlyRateCents)}/hr. Changing
              the rate only affects sessions created afterwards — each session
              keeps the rate it was booked at.
            </p>

            <form
              action={updateSubjectsAction}
              className="flex flex-col gap-2 pt-3 mt-1 border-t border-base-200"
            >
              <span className="label-text">Subjects (one or more)</span>
              <div className="flex max-h-40 flex-col gap-1 overflow-y-auto rounded-lg border border-base-300 p-3">
                {allSubjects.map((s) => (
                  <label
                    key={s.id}
                    className="flex cursor-pointer items-center gap-2"
                  >
                    <input
                      type="checkbox"
                      name="subjectIds"
                      value={s.id}
                      defaultChecked={currentSubjectIds.has(s.id)}
                      className="checkbox checkbox-sm"
                    />
                    <span>{s.name}</span>
                  </label>
                ))}
              </div>
              <button type="submit" className="btn btn-outline btn-sm self-start">
                Save subjects
              </button>
            </form>
          </div>
        </div>

        <div className="card bg-base-100 shadow-sm">
          <div className="card-body">
            <h2 className="card-title text-lg">Status</h2>
            {engagement.status === "active" ? (
              <>
                <p className="text-sm text-base-content/70">
                  This engagement is active. Ending it stops new sessions from
                  being scheduled while keeping all past sessions and invoices.
                </p>
                <form action={endAction}>
                  <button type="submit" className="btn btn-outline btn-warning btn-sm">
                    End engagement
                  </button>
                </form>
              </>
            ) : (
              <>
                <p className="text-sm text-base-content/70">
                  This engagement ended on {engagement.endedOn}. Reactivate it to
                  resume scheduling.
                </p>
                <form action={reactivateAction}>
                  <button type="submit" className="btn btn-outline btn-sm">
                    Reactivate
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Recurring schedules */}
      <div className="card bg-base-100 shadow-sm">
        <div className="card-body">
          <h2 className="card-title text-lg">Recurring schedules</h2>
          <p className="text-sm text-base-content/70">
            A weekly slot you can generate sessions from. Generating is safe to
            repeat — existing sessions are never duplicated.
          </p>

          {schedules.length > 0 && (
            <ul className="flex flex-col divide-y divide-base-200">
              {schedules.map((schedule) => (
                <li
                  key={schedule.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-3"
                >
                  <div>
                    <div className="font-medium">
                      {WEEKDAYS[schedule.weekday]}s · {schedule.startTime.slice(0, 5)} ·{" "}
                      {schedule.durationMinutes} min · {modeLabel(schedule.mode)}
                      {!schedule.active && (
                        <span className="badge badge-ghost badge-sm ml-2">
                          inactive
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-base-content/60">
                      from {schedule.startsOn}
                      {schedule.endsOn ? ` to ${schedule.endsOn}` : ""}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-end gap-1.5">
                    {schedule.active && (
                      <form action={generateAction} className="flex items-end gap-1">
                        <input type="hidden" name="scheduleId" value={schedule.id} />
                        <label className="form-control">
                          <span className="label-text text-xs mb-0.5">
                            Generate through
                          </span>
                          <input
                            type="date"
                            name="through"
                            defaultValue={throughDefault}
                            className="input input-bordered input-xs"
                          />
                        </label>
                        <button type="submit" className="btn btn-primary btn-xs">
                          Generate
                        </button>
                      </form>
                    )}
                    <form action={scheduleActiveAction}>
                      <input type="hidden" name="scheduleId" value={schedule.id} />
                      <input
                        type="hidden"
                        name="active"
                        value={schedule.active ? "0" : "1"}
                      />
                      <button type="submit" className="btn btn-ghost btn-xs">
                        {schedule.active ? "Deactivate" : "Activate"}
                      </button>
                    </form>
                    <form action={scheduleDeleteAction}>
                      <input type="hidden" name="scheduleId" value={schedule.id} />
                      <button type="submit" className="btn btn-ghost btn-xs text-error">
                        Delete
                      </button>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <form
            action={addScheduleAction}
            className="flex flex-wrap items-end gap-2 pt-3 border-t border-base-200"
          >
            <label className="form-control">
              <span className="label-text mb-1">Weekday</span>
              <select
                name="weekday"
                required
                defaultValue=""
                className="select select-bordered"
              >
                <option value="" disabled>
                  Day…
                </option>
                {WEEKDAYS.map((day, i) => (
                  <option key={day} value={i}>
                    {day}
                  </option>
                ))}
              </select>
            </label>
            <label className="form-control">
              <span className="label-text mb-1">Start</span>
              <input
                name="startTime"
                type="time"
                required
                className="input input-bordered"
              />
            </label>
            <label className="form-control w-24">
              <span className="label-text mb-1">Minutes</span>
              <input
                name="durationMinutes"
                type="number"
                min="1"
                required
                defaultValue={60}
                className="input input-bordered"
              />
            </label>
            <label className="form-control">
              <span className="label-text mb-1">Mode</span>
              <select name="mode" defaultValue="online" className="select select-bordered">
                <option value="online">online</option>
                <option value="in_person">in person</option>
              </select>
            </label>
            <label className="form-control">
              <span className="label-text mb-1">Starts on</span>
              <input
                name="startsOn"
                type="date"
                defaultValue={todayIso()}
                className="input input-bordered"
              />
            </label>
            <label className="form-control">
              <span className="label-text mb-1">Ends on (optional)</span>
              <input name="endsOn" type="date" className="input input-bordered" />
            </label>
            <button type="submit" className="btn btn-outline">
              Add schedule
            </button>
          </form>
        </div>
      </div>

      {/* Sessions */}
      <div className="card bg-base-100 shadow-sm">
        <div className="card-body">
          <div className="flex items-center justify-between">
            <h2 className="card-title text-lg">Sessions</h2>
            <span className="text-sm text-base-content/60">
              {sessionRows.length} total
            </span>
          </div>

          <form
            action={addSessionAction}
            className="flex flex-wrap items-end gap-2 pb-3 border-b border-base-200"
          >
            <label className="form-control">
              <span className="label-text mb-1">Date &amp; time</span>
              <input
                name="scheduledAt"
                type="datetime-local"
                required
                className="input input-bordered"
              />
            </label>
            <label className="form-control w-24">
              <span className="label-text mb-1">Minutes</span>
              <input
                name="durationMinutes"
                type="number"
                min="1"
                required
                defaultValue={60}
                className="input input-bordered"
              />
            </label>
            <label className="form-control">
              <span className="label-text mb-1">Mode</span>
              <select name="mode" defaultValue="online" className="select select-bordered">
                <option value="online">online</option>
                <option value="in_person">in person</option>
              </select>
            </label>
            <button type="submit" className="btn btn-primary">
              Book session
            </button>
          </form>

          {sessionRows.length === 0 ? (
            <p className="text-sm text-base-content/70">
              No sessions yet. Book a one-off above, or add a recurring schedule
              and generate them.
            </p>
          ) : (
            <ul className="flex flex-col divide-y divide-base-200">
              {sessionRows.map((session) => {
                const meta = SESSION_STATUS_META[session.status];
                return (
                  <li key={session.id} className="flex flex-col gap-2 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">
                        {formatDateTime(session.scheduledAt)}
                      </span>
                      <span className="text-sm text-base-content/60">
                        {session.durationMinutes} min · {modeLabel(session.mode)} ·{" "}
                        {formatCents(session.rateCents)}/hr
                      </span>
                      <span className={`badge badge-sm ${meta.badge}`}>
                        {meta.label}
                      </span>
                      {session.packageId ? (
                        <span className="badge badge-sm badge-primary badge-outline">
                          package
                        </span>
                      ) : (
                        !session.billable && (
                          <span className="badge badge-sm badge-ghost">
                            non-billable
                          </span>
                        )
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                      <SessionControls
                        sessionId={session.id}
                        status={session.status}
                        billable={session.billable}
                        redirectTo={here}
                      />
                      {packageOptions.length > 0 && (
                        <CoverSelect
                          action={coverAction}
                          sessionId={session.id}
                          current={session.packageId}
                          options={packageOptions}
                        />
                      )}
                    </div>
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
