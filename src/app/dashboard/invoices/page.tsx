import Link from "next/link";
import { Plus } from "lucide-react";
import { desc } from "drizzle-orm";
import { db } from "@/db";
import { invoices } from "@/db/schema";
import { INVOICE_STATUS_META, type InvoiceStatus } from "@/lib/billing";
import { formatCents } from "@/lib/money";
import { requireRole } from "@/lib/session";

export default async function InvoicesPage() {
  await requireRole("tutor");
  const rows = await db.query.invoices.findMany({
    orderBy: [desc(invoices.createdAt)],
    with: {
      client: true,
      lineItems: { columns: { amountCents: true } },
      payments: { columns: { amountCents: true } },
    },
  });

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Invoices</h1>
        <Link href="/dashboard/invoices/new" className="btn btn-primary btn-sm gap-2">
          <Plus className="size-4" /> New invoice
        </Link>
      </div>

      <div className="card bg-base-100 shadow-sm">
        <div className="card-body p-0">
          {rows.length === 0 ? (
            <p className="p-6 text-base-content/70">
              No invoices yet. Create one to bill a client for their sessions or
              package purchases.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Client</th>
                    <th>Status</th>
                    <th className="text-right">Total</th>
                    <th className="text-right">Balance</th>
                    <th>Issued</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((invoice) => {
                    const total = invoice.lineItems.reduce(
                      (sum, li) => sum + li.amountCents,
                      0,
                    );
                    const paid = invoice.payments.reduce(
                      (sum, p) => sum + p.amountCents,
                      0,
                    );
                    const meta = INVOICE_STATUS_META[invoice.status as InvoiceStatus];
                    return (
                      <tr key={invoice.id} className="hover">
                        <td>
                          <Link
                            href={`/dashboard/invoices/${invoice.id}`}
                            className="link link-hover font-medium"
                          >
                            {invoice.number}
                          </Link>
                        </td>
                        <td>{invoice.client.name}</td>
                        <td>
                          <span className={`badge badge-sm ${meta.badge}`}>
                            {meta.label}
                          </span>
                        </td>
                        <td className="text-right">{formatCents(total)}</td>
                        <td className="text-right">
                          {invoice.status === "paid" || invoice.status === "void"
                            ? "—"
                            : formatCents(Math.max(total - paid, 0))}
                        </td>
                        <td>{invoice.issuedOn ?? "—"}</td>
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
