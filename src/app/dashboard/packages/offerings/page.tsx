import Link from "next/link";
import { Plus } from "lucide-react";
import { asc, desc } from "drizzle-orm";
import { db } from "@/db";
import { packageTemplates, subjects } from "@/db/schema";
import { packageLabel } from "@/lib/billing";
import { formatCents } from "@/lib/money";
import { requireRole } from "@/lib/session";
import { Flash } from "../../flash";
import {
  createOfferingAction,
  deleteOfferingAction,
  setOfferingActiveAction,
} from "./actions";

export default async function OfferingsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireRole("tutor");
  const { error } = await searchParams;

  const [rows, subjectRows] = await Promise.all([
    db.query.packageTemplates.findMany({
      orderBy: [desc(packageTemplates.active), asc(packageTemplates.name)],
      with: { subject: true, packages: { columns: { id: true } } },
    }),
    db.query.subjects.findMany({ orderBy: [asc(subjects.name)] }),
  ]);

  return (
    <>
      <div className="breadcrumbs text-sm">
        <ul>
          <li>
            <Link href="/dashboard/packages">Packages</Link>
          </li>
          <li>Offerings</li>
        </ul>
      </div>
      <h1 className="text-2xl font-bold">Package offerings</h1>
      <p className="text-base-content/70">
        The packages you sell. Selling one to a client creates a package on their
        account; editing or deactivating an offering never changes past sales.
      </p>
      <Flash error={error} />

      <div className="card bg-base-100 shadow-sm">
        <div className="card-body">
          <h2 className="card-title text-lg">New offering</h2>
          <form
            action={createOfferingAction}
            className="flex flex-wrap items-end gap-3"
          >
            <label className="form-control flex-1 min-w-48">
              <span className="label-text mb-1">Name *</span>
              <input
                name="name"
                required
                placeholder="e.g. 10-session block"
                className="input input-bordered"
              />
            </label>
            <label className="form-control min-w-40">
              <span className="label-text mb-1">Subject</span>
              <select
                name="subjectId"
                defaultValue=""
                className="select select-bordered"
              >
                <option value="">Any subject</option>
                {subjectRows.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="form-control min-w-32">
              <span className="label-text mb-1">Unit *</span>
              <select
                name="unit"
                required
                defaultValue="sessions"
                className="select select-bordered"
              >
                <option value="sessions">Sessions</option>
                <option value="hours">Hours</option>
              </select>
            </label>
            <label className="form-control w-28">
              <span className="label-text mb-1">Quantity *</span>
              <input
                name="quantity"
                type="number"
                min="0"
                step="0.01"
                required
                placeholder="10"
                className="input input-bordered"
              />
            </label>
            <label className="form-control w-32">
              <span className="label-text mb-1">Price (USD) *</span>
              <input
                name="price"
                type="number"
                min="0"
                step="0.01"
                required
                placeholder="500.00"
                className="input input-bordered"
              />
            </label>
            <button type="submit" className="btn btn-primary gap-1">
              <Plus className="size-4" /> Add
            </button>
          </form>
        </div>
      </div>

      <div className="card bg-base-100 shadow-sm">
        <div className="card-body p-0">
          {rows.length === 0 ? (
            <p className="p-6 text-base-content/70">
              No offerings yet. Add the packages you sell so you can offer them to
              clients in one click.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Subject</th>
                    <th>Package</th>
                    <th className="text-right">Price</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((t) => (
                    <tr
                      key={t.id}
                      className={`hover ${t.active ? "" : "opacity-60"}`}
                    >
                      <td className="font-medium">{t.name}</td>
                      <td>{t.subject?.name ?? "Any"}</td>
                      <td>{packageLabel(t.unit, t.quantity)}</td>
                      <td className="text-right">{formatCents(t.priceCents)}</td>
                      <td>
                        {t.active ? (
                          <span className="badge badge-success badge-sm">
                            Active
                          </span>
                        ) : (
                          <span className="badge badge-ghost badge-sm">
                            Inactive
                          </span>
                        )}
                      </td>
                      <td className="text-right w-0 whitespace-nowrap">
                        <form
                          action={setOfferingActiveAction}
                          className="inline"
                        >
                          <input type="hidden" name="id" value={t.id} />
                          <input
                            type="hidden"
                            name="active"
                            value={t.active ? "false" : "true"}
                          />
                          <button type="submit" className="btn btn-ghost btn-xs">
                            {t.active ? "Deactivate" : "Activate"}
                          </button>
                        </form>
                        {t.packages.length === 0 && (
                          <form action={deleteOfferingAction} className="inline">
                            <input type="hidden" name="id" value={t.id} />
                            <button
                              type="submit"
                              className="btn btn-ghost btn-xs text-error"
                            >
                              Delete
                            </button>
                          </form>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
