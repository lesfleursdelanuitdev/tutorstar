import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { invoiceLineItems, invoices, payments } from "@/db/schema";
import { INVOICE_STATUS_META, type InvoiceStatus } from "@/lib/billing";
import { isUuid } from "@/lib/forms";
import { formatCents } from "@/lib/money";
import { requireRole } from "@/lib/session";
import { Flash } from "../../flash";
import {
  addLineItemsAction,
  deleteInvoiceAction,
  recordPaymentAction,
  removeLineItemAction,
  sendInvoiceAction,
  voidInvoiceAction,
} from "../actions";
import { ItemPicker } from "../item-picker";
import { getBillablePackages, getBillableSessions } from "../queries";

export default async function InvoiceDetailPage({
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

  const invoice = await db.query.invoices.findFirst({
    where: eq(invoices.id, id),
    with: {
      client: true,
      lineItems: { orderBy: [asc(invoiceLineItems.description)] },
      payments: { orderBy: [asc(payments.paidAt)] },
    },
  });
  if (!invoice) notFound();

  const status = invoice.status as InvoiceStatus;
  const meta = INVOICE_STATUS_META[status];
  const total = invoice.lineItems.reduce((sum, li) => sum + li.amountCents, 0);
  const paid = invoice.payments.reduce((sum, p) => sum + p.amountCents, 0);
  const balance = Math.max(total - paid, 0);

  // Prefilled email to the client — real delivery without an email provider.
  const emailBody = `Hi ${invoice.client.name},\n\nPlease find invoice #${invoice.number} for ${formatCents(
    total,
  )}${invoice.dueOn ? `, due ${invoice.dueOn}` : ""}.\n\nThank you.`;
  const mailto = invoice.client.email
    ? `mailto:${invoice.client.email}?subject=${encodeURIComponent(
        `Invoice #${invoice.number}`,
      )}&body=${encodeURIComponent(emailBody)}`
    : null;

  // Only a draft can gain more line items; fetch what's still billable.
  const [sessions, packages] =
    status === "draft"
      ? await Promise.all([
          getBillableSessions(invoice.clientId),
          getBillablePackages(invoice.clientId),
        ])
      : [[], []];
  const canAdd = sessions.length + packages.length > 0;

  const addAction = addLineItemsAction.bind(null, invoice.id);
  const removeAction = removeLineItemAction.bind(null, invoice.id);
  const sendAction = sendInvoiceAction.bind(null, invoice.id);
  const voidAction = voidInvoiceAction.bind(null, invoice.id);
  const deleteAction = deleteInvoiceAction.bind(null, invoice.id);
  const paymentAction = recordPaymentAction.bind(null, invoice.id);

  return (
    <>
      <div className="breadcrumbs text-sm">
        <ul>
          <li>
            <Link href="/dashboard/invoices">Invoices</Link>
          </li>
          <li>Invoice #{invoice.number}</li>
        </ul>
      </div>
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold">Invoice #{invoice.number}</h1>
        <span className={`badge ${meta.badge}`}>{meta.label}</span>
      </div>
      <Flash error={error} saved={saved} />

      <div className="grid gap-6 lg:grid-cols-3 items-start">
        {/* Line items + totals */}
        <div className="card bg-base-100 shadow-sm lg:col-span-2">
          <div className="card-body">
            <div className="flex items-center justify-between">
              <h2 className="card-title text-lg">
                {invoice.client.name}
              </h2>
              <div className="text-sm text-base-content/60">
                {invoice.issuedOn ? `Issued ${invoice.issuedOn}` : "Not issued"}
                {invoice.dueOn ? ` · Due ${invoice.dueOn}` : ""}
              </div>
            </div>

            {invoice.lineItems.length === 0 ? (
              <p className="text-base-content/70 text-sm">No line items.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="table">
                  <tbody>
                    {invoice.lineItems.map((li) => (
                      <tr key={li.id}>
                        <td>{li.description}</td>
                        <td className="text-right whitespace-nowrap">
                          {formatCents(li.amountCents)}
                        </td>
                        {status === "draft" && (
                          <td className="text-right w-0">
                            <form action={removeAction}>
                              <input
                                type="hidden"
                                name="lineItemId"
                                value={li.id}
                              />
                              <button
                                type="submit"
                                className="btn btn-ghost btn-xs text-error"
                              >
                                Remove
                              </button>
                            </form>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <th>Total</th>
                      <th className="text-right">{formatCents(total)}</th>
                      {status === "draft" && <th />}
                    </tr>
                    {paid > 0 && (
                      <>
                        <tr>
                          <td className="text-base-content/70">Paid</td>
                          <td className="text-right text-base-content/70">
                            −{formatCents(paid)}
                          </td>
                          {status === "draft" && <td />}
                        </tr>
                        <tr>
                          <th>Balance</th>
                          <th className="text-right">{formatCents(balance)}</th>
                          {status === "draft" && <th />}
                        </tr>
                      </>
                    )}
                  </tfoot>
                </table>
              </div>
            )}

            {status === "draft" && canAdd && (
              <form
                action={addAction}
                className="flex flex-col gap-3 pt-3 border-t border-base-200"
              >
                <span className="text-sm font-medium">Add items</span>
                <ItemPicker sessions={sessions} packages={packages} />
                <button type="submit" className="btn btn-outline btn-sm self-start">
                  Add selected
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Actions column */}
        <div className="flex flex-col gap-6">
          <div className="card bg-base-100 shadow-sm">
            <div className="card-body">
              <h2 className="card-title text-lg">Actions</h2>

              {status === "draft" && (
                <>
                  <form action={sendAction} className="flex flex-col gap-2">
                    <label className="form-control">
                      <span className="label-text mb-1">Due date (optional)</span>
                      <input
                        name="dueOn"
                        type="date"
                        className="input input-bordered input-sm"
                      />
                    </label>
                    <button type="submit" className="btn btn-primary btn-sm">
                      Send invoice
                    </button>
                  </form>
                  <form action={deleteAction}>
                    <button type="submit" className="btn btn-ghost btn-sm text-error">
                      Delete draft
                    </button>
                  </form>
                </>
              )}

              {status === "sent" && (
                <form action={voidAction}>
                  <button type="submit" className="btn btn-ghost btn-sm text-error">
                    Void invoice
                  </button>
                </form>
              )}

              {status === "paid" && (
                <p className="text-sm text-success">Paid in full.</p>
              )}
              {status === "void" && (
                <p className="text-sm text-base-content/70">This invoice is void.</p>
              )}

              <div className="flex flex-col gap-2 pt-2 border-t border-base-200">
                <Link
                  href={`/invoices/${invoice.id}/print`}
                  target="_blank"
                  className="btn btn-outline btn-sm"
                >
                  Print / PDF
                </Link>
                {mailto && (status === "sent" || status === "paid") && (
                  <a href={mailto} className="btn btn-ghost btn-sm">
                    Email to client
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Payments */}
          {(status === "sent" || status === "paid") && (
            <div className="card bg-base-100 shadow-sm">
              <div className="card-body">
                <h2 className="card-title text-lg">Payments</h2>
                {invoice.payments.length === 0 ? (
                  <p className="text-sm text-base-content/70">
                    Nothing recorded yet.
                  </p>
                ) : (
                  <ul className="flex flex-col divide-y divide-base-200 text-sm">
                    {invoice.payments.map((p) => (
                      <li key={p.id} className="flex justify-between py-1.5">
                        <span className="text-base-content/70">
                          {p.method ?? "payment"}
                        </span>
                        <span className="font-medium">
                          {formatCents(p.amountCents)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}

                {status === "sent" && (
                  <form
                    action={paymentAction}
                    className="flex flex-col gap-2 pt-2 border-t border-base-200"
                  >
                    <label className="form-control">
                      <span className="label-text mb-1">Amount (USD)</span>
                      <input
                        name="amount"
                        type="number"
                        min="0"
                        step="0.01"
                        required
                        placeholder={(balance / 100).toFixed(2)}
                        className="input input-bordered input-sm"
                      />
                    </label>
                    <label className="form-control">
                      <span className="label-text mb-1">Method</span>
                      <input
                        name="method"
                        placeholder="cash, zelle…"
                        className="input input-bordered input-sm"
                      />
                    </label>
                    <button type="submit" className="btn btn-primary btn-sm">
                      Record payment
                    </button>
                  </form>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
