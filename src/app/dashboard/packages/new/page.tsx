import Link from "next/link";
import { asc } from "drizzle-orm";
import { db } from "@/db";
import { clients, students } from "@/db/schema";
import { requireRole } from "@/lib/session";
import { Flash } from "../../flash";
import { createPackageAction } from "../actions";

export default async function NewPackagePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireRole("tutor");
  const { error } = await searchParams;

  const [studentRows, clientRows] = await Promise.all([
    db.query.students.findMany({ orderBy: [asc(students.name)] }),
    db.query.clients.findMany({ orderBy: [asc(clients.name)] }),
  ]);

  const missing = [
    studentRows.length === 0 && { label: "a student", href: "/dashboard/students/new" },
    clientRows.length === 0 && { label: "a client", href: "/dashboard/clients/new" },
  ].filter(Boolean) as { label: string; href: string }[];

  return (
    <>
      <div className="breadcrumbs text-sm">
        <ul>
          <li>
            <Link href="/dashboard/packages">Packages</Link>
          </li>
          <li>New</li>
        </ul>
      </div>
      <h1 className="text-2xl font-bold">New package</h1>

      <div className="card bg-base-100 shadow-sm max-w-lg">
        <div className="card-body">
          <Flash error={error} />
          {missing.length > 0 ? (
            <p className="text-base-content/70">
              First create{" "}
              {missing.map((m, i) => (
                <span key={m.href}>
                  {i > 0 && " and "}
                  <Link href={m.href} className="link">
                    {m.label}
                  </Link>
                </span>
              ))}
              .
            </p>
          ) : (
            <form action={createPackageAction} className="flex flex-col gap-3">
              <label className="form-control">
                <span className="label-text mb-1">Student (beneficiary) *</span>
                <select name="studentId" required defaultValue="" className="select select-bordered">
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
              <label className="form-control">
                <span className="label-text mb-1">Paying client *</span>
                <select name="clientId" required defaultValue="" className="select select-bordered">
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
              <div className="flex gap-3">
                <label className="form-control flex-1">
                  <span className="label-text mb-1">Unit *</span>
                  <select name="unit" required defaultValue="sessions" className="select select-bordered">
                    <option value="sessions">sessions</option>
                    <option value="hours">hours</option>
                  </select>
                </label>
                <label className="form-control flex-1">
                  <span className="label-text mb-1">Quantity *</span>
                  <input
                    name="quantity"
                    type="number"
                    min="0.01"
                    step="0.01"
                    required
                    placeholder="10"
                    className="input input-bordered"
                  />
                </label>
              </div>
              <label className="form-control">
                <span className="label-text mb-1">Price (USD) *</span>
                <input
                  name="price"
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  placeholder="400.00"
                  className="input input-bordered"
                />
              </label>
              <label className="form-control">
                <span className="label-text mb-1">Notes</span>
                <textarea name="notes" rows={2} className="textarea textarea-bordered" />
              </label>
              <button type="submit" className="btn btn-primary mt-2">
                Create package
              </button>
            </form>
          )}
        </div>
      </div>
    </>
  );
}
