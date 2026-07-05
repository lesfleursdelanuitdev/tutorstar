// Invoicing helpers shared by the invoice pages and actions.

export type PackageUnit = "hours" | "sessions";

export type InvoiceStatus = "draft" | "sent" | "paid" | "void";

export const INVOICE_STATUS_META: Record<
  InvoiceStatus,
  { label: string; badge: string }
> = {
  draft: { label: "Draft", badge: "badge-ghost" },
  sent: { label: "Sent", badge: "badge-info badge-outline" },
  paid: { label: "Paid", badge: "badge-success" },
  void: { label: "Void", badge: "badge-ghost" },
};

// What a pay-as-you-go session costs: its snapshot rate prorated by length.
export function sessionAmountCents(
  rateCents: number,
  durationMinutes: number,
): number {
  return Math.round((rateCents * durationMinutes) / 60);
}

// numeric(6,2) comes back as a string like "10.00" / "12.50"; show it tidily.
export function formatQuantity(quantity: string): string {
  return String(Number(quantity));
}

export function packageLabel(unit: PackageUnit, quantity: string): string {
  return `${formatQuantity(quantity)} ${unit}`;
}
