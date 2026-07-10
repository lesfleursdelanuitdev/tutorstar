import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { clients, students, subjects, tutors } from "@/db/schema";
import { centsToInput } from "@/lib/money";
import { requireRole } from "@/lib/session";
import { Flash } from "../../flash";
import { createEngagementAction } from "../actions";

export default async function NewEngagementPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
    studentId?: string;
    subjectId?: string;
    clientId?: string;
  }>;
}) {
  const { user } = await requireRole("tutor");
  const { error, studentId, subjectId, clientId } = await searchParams;

  const [studentRows, subjectRows, clientRows, tutor] = await Promise.all([
    db.query.students.findMany({ orderBy: [asc(students.name)] }),
    db.query.subjects.findMany({ orderBy: [asc(subjects.name)] }),
    db.query.clients.findMany({ orderBy: [asc(clients.name)] }),
    db.query.tutors.findFirst({
      where: eq(tutors.userId, user.id),
      columns: { defaultHourlyRateCents: true },
    }),
  ]);

  // An engagement needs one of each. If any is missing, point the tutor at the
  // gap rather than showing a form that can't be submitted.
  const missing = [
    studentRows.length === 0 && { label: "a student", href: "/dashboard/students/new" },
    subjectRows.length === 0 && { label: "a subject", href: "/dashboard/subjects" },
    clientRows.length === 0 && { label: "a client", href: "/dashboard/clients/new" },
  ].filter(Boolean) as { label: string; href: string }[];

  return (
    <>
      <div className="breadcrumbs text-sm">
        <ul>
          <li>
            <Link href="/dashboard/engagements">Engagements</Link>
          </li>
          <li>New</li>
        </ul>
      </div>
      <h1 className="text-2xl font-bold">New engagement</h1>

      <div className="card bg-base-100 shadow-sm max-w-lg">
        <div className="card-body">
          <Flash error={error} />
          {missing.length > 0 ? (
            <p className="text-base-content/70">
              First create{" "}
              {missing.map((m, i) => (
                <span key={m.href}>
                  {i > 0 && (i === missing.length - 1 ? " and " : ", ")}
                  <Link href={m.href} className="link">
                    {m.label}
                  </Link>
                </span>
              ))}
              . An engagement links them together.
            </p>
          ) : (
            <form action={createEngagementAction} className="flex flex-col gap-3">
              <label className="form-control">
                <span className="label-text mb-1">Student *</span>
                <select
                  name="studentId"
                  required
                  defaultValue={studentId ?? ""}
                  className="select select-bordered"
                >
                  <option value="" disabled>
                    Choose…
                  </option>
                  {studentRows.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>
              <fieldset className="form-control">
                <span className="label-text mb-1">Subjects * (one or more)</span>
                <div className="flex max-h-48 flex-col gap-1 overflow-y-auto rounded-lg border border-base-300 p-3">
                  {subjectRows.map((s) => (
                    <label
                      key={s.id}
                      className="flex cursor-pointer items-center gap-2"
                    >
                      <input
                        type="checkbox"
                        name="subjectIds"
                        value={s.id}
                        defaultChecked={s.id === subjectId}
                        className="checkbox checkbox-sm"
                      />
                      <span>{s.name}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <label className="form-control">
                <span className="label-text mb-1">Paying client *</span>
                <select
                  name="clientId"
                  required
                  defaultValue={clientId ?? ""}
                  className="select select-bordered"
                >
                  <option value="" disabled>
                    Choose…
                  </option>
                  {clientRows.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="form-control">
                <span className="label-text mb-1">Hourly rate (USD) *</span>
                <input
                  name="hourlyRate"
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  defaultValue={centsToInput(tutor?.defaultHourlyRateCents)}
                  placeholder="45.00"
                  className="input input-bordered"
                />
              </label>
              <label className="form-control">
                <span className="label-text mb-1">Started on</span>
                <input
                  name="startedOn"
                  type="date"
                  className="input input-bordered"
                />
                <span className="label-text-alt mt-1 text-base-content/60">
                  Defaults to today if left blank.
                </span>
              </label>
              <button type="submit" className="btn btn-primary mt-2">
                Create engagement
              </button>
            </form>
          )}
        </div>
      </div>
    </>
  );
}
