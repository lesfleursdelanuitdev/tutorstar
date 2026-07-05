import { formatCents } from "@/lib/money";
import { packageLabel } from "@/lib/billing";
import { formatDateTime } from "@/lib/scheduling";
import type { BillablePackage, BillableSession } from "./queries";

// Checkbox lists of a client's unbilled sessions and package purchases. Renders
// no <form> — the caller wraps it and supplies the submit button — so it works
// for both "new invoice" and "add items to a draft".
export function ItemPicker({
  sessions,
  packages,
}: {
  sessions: BillableSession[];
  packages: BillablePackage[];
}) {
  return (
    <div className="flex flex-col gap-4">
      {sessions.length > 0 && (
        <fieldset>
          <legend className="text-sm font-medium mb-1">Sessions</legend>
          <ul className="flex flex-col divide-y divide-base-200">
            {sessions.map((s) => (
              <li key={s.id}>
                <label className="flex items-center gap-3 py-2 cursor-pointer">
                  <input
                    type="checkbox"
                    name="sessionId"
                    value={s.id}
                    defaultChecked
                    className="checkbox checkbox-sm"
                  />
                  <span className="flex-1">
                    {s.studentName} · {s.subjectName}
                    <span className="text-base-content/60 text-sm">
                      {" "}
                      — {formatDateTime(s.scheduledAt)} ({s.durationMinutes} min)
                    </span>
                  </span>
                  <span className="font-medium">{formatCents(s.amountCents)}</span>
                </label>
              </li>
            ))}
          </ul>
        </fieldset>
      )}

      {packages.length > 0 && (
        <fieldset>
          <legend className="text-sm font-medium mb-1">Package purchases</legend>
          <ul className="flex flex-col divide-y divide-base-200">
            {packages.map((p) => (
              <li key={p.id}>
                <label className="flex items-center gap-3 py-2 cursor-pointer">
                  <input
                    type="checkbox"
                    name="packageId"
                    value={p.id}
                    defaultChecked
                    className="checkbox checkbox-sm"
                  />
                  <span className="flex-1">
                    {packageLabel(p.unit, p.quantity)} package
                    <span className="text-base-content/60 text-sm">
                      {" "}
                      — {p.studentName}
                    </span>
                  </span>
                  <span className="font-medium">{formatCents(p.priceCents)}</span>
                </label>
              </li>
            ))}
          </ul>
        </fieldset>
      )}
    </div>
  );
}
