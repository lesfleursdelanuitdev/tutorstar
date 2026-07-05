import Link from "next/link";
import { Plus, Tags } from "lucide-react";
import { desc } from "drizzle-orm";
import { db } from "@/db";
import { packages } from "@/db/schema";
import { formatQuantity, packageLabel } from "@/lib/billing";
import { formatCents } from "@/lib/money";
import { requireRole } from "@/lib/session";
import { Flash } from "../flash";
import { deletePackageAction } from "./actions";

export default async function PackagesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireRole("tutor");
  const { error } = await searchParams;

  const rows = await db.query.packages.findMany({
    orderBy: [desc(packages.purchasedAt)],
    with: {
      student: true,
      client: true,
      sessions: { columns: { durationMinutes: true } },
    },
  });

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Packages</h1>
        <div className="flex gap-2">
          <Link
            href="/dashboard/packages/offerings"
            className="btn btn-ghost btn-sm gap-2"
          >
            <Tags className="size-4" /> Offerings
          </Link>
          <Link href="/dashboard/packages/new" className="btn btn-primary btn-sm gap-2">
            <Plus className="size-4" /> New package
          </Link>
        </div>
      </div>
      <Flash error={error} />

      <div className="card bg-base-100 shadow-sm">
        <div className="card-body p-0">
          {rows.length === 0 ? (
            <p className="p-6 text-base-content/70">
              No packages yet. A package is a prepaid block of hours or sessions
              bought for a student — create one to bill it on an invoice.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Client</th>
                    <th>Package</th>
                    <th className="text-right">Price</th>
                    <th className="text-right">Remaining</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((pkg) => {
                    const consumed =
                      pkg.unit === "hours"
                        ? pkg.sessions.reduce(
                            (sum, s) => sum + s.durationMinutes / 60,
                            0,
                          )
                        : pkg.sessions.length;
                    const remaining = Number(pkg.quantity) - consumed;
                    return (
                      <tr key={pkg.id} className="hover">
                        <td>{pkg.student.name}</td>
                        <td>{pkg.client.name}</td>
                        <td>{packageLabel(pkg.unit, pkg.quantity)}</td>
                        <td className="text-right">{formatCents(pkg.priceCents)}</td>
                        <td className="text-right">
                          {formatQuantity(String(remaining))} {pkg.unit}
                        </td>
                        <td className="text-right w-0">
                          <form action={deletePackageAction}>
                            <input type="hidden" name="id" value={pkg.id} />
                            <button
                              type="submit"
                              className="btn btn-ghost btn-xs text-error"
                            >
                              Delete
                            </button>
                          </form>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
