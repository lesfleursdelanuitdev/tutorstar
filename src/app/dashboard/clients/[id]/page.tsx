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
  addClientLoginAction,
  removeClientLoginAction,
  updateClientAction,
} from "../actions";

export default async function ClientDetailPage({
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

  const client = await db.query.clients.findFirst({
    where: eq(clients.id, id),
    with: {
      clientsStudents: { with: { student: true } },
      usersClients: { with: { user: true } },
    },
  });
  if (!client) notFound();

  const allStudents = await db.query.students.findMany({
    orderBy: [asc(students.name)],
  });
  const linkedIds = new Set(client.clientsStudents.map((l) => l.studentId));
  const unlinked = allStudents.filter((s) => !linkedIds.has(s.id));

  const here = `/dashboard/clients/${client.id}`;
  const updateAction = updateClientAction.bind(null, client.id);
  const linkAction = linkClientStudentAction.bind(null, here);
  const unlinkAction = unlinkClientStudentAction.bind(null, here);
  const addLoginAction = addClientLoginAction.bind(null, client.id);
  const removeLoginAction = removeClientLoginAction.bind(null, client.id);

  return (
    <>
      <div className="breadcrumbs text-sm">
        <ul>
          <li>
            <Link href="/dashboard/clients">Clients</Link>
          </li>
          <li>{client.name}</li>
        </ul>
      </div>
      <h1 className="text-2xl font-bold">{client.name}</h1>
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
                  defaultValue={client.name}
                  className="input input-bordered"
                />
              </label>
              <label className="form-control">
                <span className="label-text mb-1">Email</span>
                <input
                  name="email"
                  type="email"
                  defaultValue={client.email ?? ""}
                  className="input input-bordered"
                />
              </label>
              <label className="form-control">
                <span className="label-text mb-1">Phone</span>
                <input
                  name="phone"
                  type="tel"
                  defaultValue={client.phone ?? ""}
                  className="input input-bordered"
                />
              </label>
              <label className="form-control">
                <span className="label-text mb-1">Notes</span>
                <textarea
                  name="notes"
                  rows={3}
                  defaultValue={client.notes ?? ""}
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
            <h2 className="card-title text-lg">Students</h2>
            {client.clientsStudents.length === 0 ? (
              <p className="text-base-content/70 text-sm">
                No students linked yet.
              </p>
            ) : (
              <ul className="flex flex-col divide-y divide-base-200">
                {client.clientsStudents.map((link) => (
                  <li
                    key={link.studentId}
                    className="flex items-center justify-between py-2 gap-2"
                  >
                    <div>
                      <Link
                        href={`/dashboard/students/${link.studentId}`}
                        className="link link-hover font-medium"
                      >
                        {link.student.name}
                      </Link>
                      {link.relationship && (
                        <span className="badge badge-ghost badge-sm ml-2">
                          {link.relationship}
                        </span>
                      )}
                    </div>
                    <form action={unlinkAction}>
                      <input type="hidden" name="clientId" value={client.id} />
                      <input
                        type="hidden"
                        name="studentId"
                        value={link.studentId}
                      />
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
                <input type="hidden" name="clientId" value={client.id} />
                <label className="form-control flex-1 min-w-40">
                  <span className="label-text mb-1">Link a student</span>
                  <select
                    name="studentId"
                    required
                    defaultValue=""
                    className="select select-bordered"
                  >
                    <option value="" disabled>
                      Choose…
                    </option>
                    {unlinked.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
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
            ) : allStudents.length === 0 ? (
              <p className="text-sm text-base-content/70 pt-2 border-t border-base-200">
                No students exist yet —{" "}
                <Link href="/dashboard/students/new" className="link">
                  create one
                </Link>{" "}
                to link it here.
              </p>
            ) : null}
          </div>
        </div>

        <div className="card bg-base-100 shadow-sm">
          <div className="card-body">
            <h2 className="card-title text-lg">Portal logins</h2>
            <p className="text-base-content/70 text-sm">
              People who can sign in to see this client&apos;s schedule and
              invoices. Two parents sharing one client each get their own login.
            </p>
            {client.usersClients.length === 0 ? (
              <p className="text-base-content/70 text-sm">No logins yet.</p>
            ) : (
              <ul className="flex flex-col divide-y divide-base-200">
                {client.usersClients.map((link) => (
                  <li
                    key={link.userId}
                    className="flex items-center justify-between py-2 gap-2"
                  >
                    <div>
                      <span className="font-medium">{link.user.name}</span>
                      <span className="text-base-content/70 text-sm ml-2">
                        {link.user.email}
                      </span>
                    </div>
                    <form action={removeLoginAction}>
                      <input type="hidden" name="userId" value={link.userId} />
                      <button type="submit" className="btn btn-ghost btn-xs">
                        Remove
                      </button>
                    </form>
                  </li>
                ))}
              </ul>
            )}

            <form
              action={addLoginAction}
              className="flex flex-col gap-3 pt-2 border-t border-base-200"
            >
              <label className="form-control">
                <span className="label-text mb-1">Name</span>
                <input
                  name="name"
                  placeholder="e.g. Jane Doe"
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
                  Share it with them to sign in; they can change it later. If the
                  email already has a login, name and password are ignored.
                </span>
              </label>
              <button type="submit" className="btn btn-outline self-start">
                Add login
              </button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
