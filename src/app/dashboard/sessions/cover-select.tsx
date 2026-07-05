"use client";

// A tiny package picker for one session. Submits its form on change so there's
// no separate save button. `action` is a server action bound to the page's
// redirect target by the caller.
export function CoverSelect({
  action,
  sessionId,
  current,
  options,
}: {
  action: (formData: FormData) => void;
  sessionId: string;
  current: string | null;
  options: { id: string; label: string }[];
}) {
  return (
    <form action={action} className="flex items-center gap-1">
      <input type="hidden" name="sessionId" value={sessionId} />
      <select
        name="packageId"
        defaultValue={current ?? ""}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="select select-bordered select-xs"
        aria-label="Cover with package"
      >
        <option value="">Invoice separately</option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </select>
    </form>
  );
}
