import {
  SESSION_STATUSES,
  SESSION_STATUS_META,
  type SessionStatus,
} from "@/lib/scheduling";
import {
  deleteSessionAction,
  setSessionStatusAction,
  toggleSessionBillableAction,
} from "./actions";

// Status select + billable toggle + delete for one session. Server component:
// it binds the shared actions to `redirectTo` so the tutor returns here after
// each change. Used on both the engagement detail page and the agenda.
export function SessionControls({
  sessionId,
  status,
  billable,
  redirectTo,
}: {
  sessionId: string;
  status: SessionStatus;
  billable: boolean;
  redirectTo: string;
}) {
  const setStatus = setSessionStatusAction.bind(null, redirectTo);
  const toggleBillable = toggleSessionBillableAction.bind(null, redirectTo);
  const deleteSession = deleteSessionAction.bind(null, redirectTo);

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <form action={setStatus} className="flex items-center gap-1">
        <input type="hidden" name="sessionId" value={sessionId} />
        <select
          name="status"
          defaultValue={status}
          className="select select-bordered select-xs"
        >
          {SESSION_STATUSES.map((s) => (
            <option key={s} value={s}>
              {SESSION_STATUS_META[s].label}
            </option>
          ))}
        </select>
        <button type="submit" className="btn btn-xs">
          Update
        </button>
      </form>
      <form action={toggleBillable}>
        <input type="hidden" name="sessionId" value={sessionId} />
        <input type="hidden" name="billable" value={billable ? "0" : "1"} />
        <button type="submit" className="btn btn-ghost btn-xs">
          {billable ? "Make non-billable" : "Make billable"}
        </button>
      </form>
      <form action={deleteSession}>
        <input type="hidden" name="sessionId" value={sessionId} />
        <button type="submit" className="btn btn-ghost btn-xs text-error">
          Delete
        </button>
      </form>
    </div>
  );
}
