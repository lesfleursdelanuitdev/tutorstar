import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { clients, students } from "@/db/schema";
import { isUuid } from "@/lib/forms";
import { requireRole } from "@/lib/session";
import {
  linkClientStudentAction,
  unlinkClientStudentAction,
} from "../../actions";
import { Flash } from "../../flash";
import {
  removeStudentLoginAction,
  setStudentLoginAction,
  updateStudentAction,
} from "../actions";

export default async function StudentDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  await requireRole("tutor");
  const { id } = await params;
  const { error, saved } = await searchParams;
  if (!isUuid(id)) notFound();

  const student = await db.query.students.findFirst({
    where: eq(students.id, id),
    with: { clientsStudents: { with: { client: true } }, user: true },
  });
  if (!student) notFound();

  const allClients = await db.query.clients.findMany({
    orderBy: [asc(clients.name)],
  });
  const linkedIds = new Set(student.clientsStudents.map((l) => l.clientId));
  const unlinked = allClients.filter((c) => !linkedIds.has(c.id));

  const here = `/dashboard/students/${student.id}`;
  const updateAction = updateStudentAction.bind(null, student.id);
  const linkAction = linkClientStudentAction.bind(null, here);
  const unlinkAction = unlinkClientStudentAction.bind(null, here);
  const setLoginAction = setStudentLoginAction.bind(null, student.id);
  const removeLoginAction = removeStudentLoginAction.bind(null, student.id);

  return (
    <>
      <div className="breadcrumbs text-sm">
        <ul>
          <li>
            <Link href="/dashboard/students">Students</Link>
          </li>
          <li>{student.name}</li>
        </ul>
      </div>
      <h1 className="text-2xl font-bold">{student.name}</h1>
      <Flash error={error} saved={saved} />

      <div className="grid gap-6 lg:grid-cols-2 items-start">
        <div className="card bg-base-100 shadow-sm">
          <div className="card-body">
            <h2 className="card-title text-lg">Details</h2>
            <form action={updateAction} className="flex flex-col gap-3">
              <label className="form-control">
                <span className="label-text mb-1">Name *</span>
                <input
                  name="name"
                  required
                  defaultValue={student.name}
                  className="input input-bordered"
                />
              </label>
              <label className="form-control">
                <span className="label-text mb-1">Birthdate</span>
                <input
                  name="birthdate"
                  type="date"
                  defaultValue={student.birthdate ?? ""}
                  className="input input-bordered"
                />
              </label>
              <label className="form-control">
                <span className="label-text mb-1">Grade level</span>
                <input
                  name="gradeLevel"
                  defaultValue={student.gradeLevel ?? ""}
                  className="input input-bordered"
                />
              </label>
              <label className="form-control">
                <span className="label-text mb-1">Notes</span>
                <textarea
                  name="notes"
                  rows={3}
                  defaultValue={student.notes ?? ""}
                  className="textarea textarea-bordered"
                />
              </label>
              <button type="submit" className="btn btn-primary mt-2 self-start">
                Save changes
              </button>
            </form>
          </div>
        </div>

        <div className="card bg-base-100 shadow-sm">
          <div className="card-body">
            <h2 className="card-title text-lg">Clients</h2>
            {student.clientsStudents.length === 0 ? (
              <p className="text-base-content/70 text-sm">
                No clients linked yet.
              </p>
            ) : (
              <ul className="flex flex-col divide-y divide-base-200">
                {student.clientsStudents.map((link) => (
                  <li
                    key={link.clientId}
                    className="flex items-center justify-between py-2 gap-2"
                  >
                    <div>
                      <Link
                        href={`/dashboard/clients/${link.clientId}`}
                        className="link link-hover font-medium"
                      >
                        {link.client.name}
                      </Link>
                      {link.relationship && (
                        <span className="badge badge-ghost badge-sm ml-2">
                          {link.relationship}
                        </span>
                      )}
                    </div>
                    <form action={unlinkAction}>
                      <input type="hidden" name="clientId" value={link.clientId} />
                      <input type="hidden" name="studentId" value={student.id} />
                      <button type="submit" className="btn btn-ghost btn-xs">
                        Unlink
                      </button>
                    </form>
                  </li>
                ))}
              </ul>
            )}

            {unlinked.length > 0 ? (
              <form
                action={linkAction}
                className="flex flex-wrap items-end gap-2 pt-2 border-t border-base-200"
              >
                <input type="hidden" name="studentId" value={student.id} />
                <label className="form-control flex-1 min-w-40">
                  <span className="label-text mb-1">Link a client</span>
                  <select
                    name="clientId"
                    required
                    defaultValue=""
                    className="select select-bordered"
                  >
                    <option value="" disabled>
                      Choose…
                    </option>
                    {unlinked.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="form-control flex-1 min-w-32">
                  <span className="label-text mb-1">Relationship</span>
                  <input
                    name="relationship"
                    placeholder="e.g. mother"
                    className="input input-bordered"
                  />
                </label>
                <button type="submit" className="btn btn-outline">
                  Link
                </button>
              </form>
            ) : allClients.length === 0 ? (
              <p className="text-sm text-base-content/70 pt-2 border-t border-base-200">
                No clients exist yet —{" "}
                <Link href="/dashboard/clients/new" className="link">
                  create one
                </Link>{" "}
                to link it here.
              </p>
            ) : null}
          </div>
        </div>

        <div className="card bg-base-100 shadow-sm">
          <div className="card-body">
            <h2 className="card-title text-lg">Portal login</h2>
            <p className="text-base-content/70 text-sm">
              Lets the student sign in to see their own schedule and shared
              notes. Optional — young learners usually don&apos;t need one.
            </p>
            {student.user ? (
              <div className="flex items-center justify-between py-2 gap-2">
                <div>
                  <span className="font-medium">{student.user.name}</span>
                  <span className="text-base-content/70 text-sm ml-2">
                    {student.user.email}
                  </span>
                </div>
                <form action={removeLoginAction}>
                  <button type="submit" className="btn btn-ghost btn-xs">
                    Remove
                  </button>
                </form>
              </div>
            ) : (
              <form
                action={setLoginAction}
                className="flex flex-col gap-3 pt-2 border-t border-base-200"
              >
                <label className="form-control">
                  <span className="label-text mb-1">Name</span>
                  <input
                    name="name"
                    defaultValue={student.name}
                    className="input input-bordered"
                  />
                </label>
                <label className="form-control">
                  <span className="label-text mb-1">Email *</span>
                  <input
                    name="email"
                    type="email"
                    required
                    className="input input-bordered"
                  />
                </label>
                <label className="form-control">
                  <span className="label-text mb-1">Temporary password</span>
                  <input
                    name="password"
                    type="text"
                    minLength={8}
                    placeholder="at least 8 characters"
                    className="input input-bordered"
                  />
                  <span className="label-text-alt text-base-content/60 mt-1">
                    Share it with them to sign in; they can change it later.
                  </span>
                </label>
                <button type="submit" className="btn btn-outline self-start">
                  Create login
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
