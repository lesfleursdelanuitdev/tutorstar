import Link from "next/link";
import { asc } from "drizzle-orm";
import { db } from "@/db";
import { clients } from "@/db/schema";
import { isUuid } from "@/lib/forms";
import { requireRole } from "@/lib/session";
import { Flash } from "../../flash";
import { createInvoiceAction } from "../actions";
import { ItemPicker } from "../item-picker";
import { getBillablePackages, getBillableSessions } from "../queries";

export default async function NewInvoicePage({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string; error?: string }>;
}) {
  await requireRole("tutor");
  const { clientId, error } = await searchParams;
  const selectedClient = isUuid(clientId ?? null) ? clientId! : null;

  const clientRows = await db.query.clients.findMany({
    orderBy: [asc(clients.name)],
  });

  const [sessions, packages] = selectedClient
    ? await Promise.all([
        getBillableSessions(selectedClient),
        getBillablePackages(selectedClient),
      ])
    : [[], []];
  const hasItems = sessions.length + packages.length > 0;

  return (
    <>
      <div className="breadcrumbs text-sm">
        <ul>
          <li>
            <Link href="/dashboard/invoices">Invoices</Link>
          </li>
          <li>New</li>
        </ul>
      </div>
      <h1 className="text-2xl font-bold">New invoice</h1>

      <div className="card bg-base-100 shadow-sm max-w-xl">
        <div className="card-body">
          <Flash error={error} />

          {clientRows.length === 0 ? (
            <p className="text-base-content/70">
              No clients yet —{" "}
              <Link href="/dashboard/clients/new" className="link">
                create one
              </Link>{" "}
              first.
            </p>
          ) : (
            <form method="get" className="flex items-end gap-2">
              <label className="form-control flex-1">
                <span className="label-text mb-1">Client</span>
                <select
                  name="clientId"
                  defaultValue={selectedClient ?? ""}
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
              <button type="submit" className="btn btn-outline">
                Load items
              </button>
            </form>
          )}

          {selectedClient &&
            (hasItems ? (
              <form
                action={createInvoiceAction}
                className="flex flex-col gap-4 pt-4 mt-2 border-t border-base-200"
              >
                <input type="hidden" name="clientId" value={selectedClient} />
                <ItemPicker sessions={sessions} packages={packages} />
                <button type="submit" className="btn btn-primary self-start">
                  Create draft invoice
                </button>
              </form>
            ) : (
              <p className="text-base-content/70 pt-4 mt-2 border-t border-base-200">
                Nothing to bill for this client — no completed billable sessions
                or unbilled packages.
              </p>
            ))}
        </div>
      </div>
    </>
  );
}
