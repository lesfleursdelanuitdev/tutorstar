import {
  createNoteAction,
  deleteNoteAction,
  updateNoteAction,
} from "./actions";

type Note = {
  id: string;
  body: string;
  visibility: "private" | "shared";
};

// Notes for one session: an editable form per existing note plus an add form.
// Server component — plain forms bound to the shared note actions with
// `redirectTo`, so the tutor returns to the same list after each change.
export function SessionNotes({
  sessionId,
  notes,
  redirectTo,
}: {
  sessionId: string;
  notes: Note[];
  redirectTo: string;
}) {
  const create = createNoteAction.bind(null, redirectTo);
  const update = updateNoteAction.bind(null, redirectTo);
  const remove = deleteNoteAction.bind(null, redirectTo);

  return (
    <div className="flex flex-col gap-3 rounded-lg bg-base-200/50 p-3">
      {notes.map((note) => (
        <div key={note.id} className="flex flex-col gap-1.5">
          <form action={update} className="flex flex-col gap-1.5">
            <input type="hidden" name="noteId" value={note.id} />
            <textarea
              name="body"
              defaultValue={note.body}
              rows={2}
              className="textarea textarea-bordered textarea-sm w-full"
            />
            <div className="flex flex-wrap items-center gap-1.5">
              <VisibilitySelect defaultValue={note.visibility} />
              <button type="submit" className="btn btn-xs">
                Save
              </button>
            </div>
          </form>
          <form action={remove}>
            <input type="hidden" name="noteId" value={note.id} />
            <button type="submit" className="btn btn-ghost btn-xs text-error">
              Delete
            </button>
          </form>
        </div>
      ))}

      <form action={create} className="flex flex-col gap-1.5">
        <input type="hidden" name="sessionId" value={sessionId} />
        <textarea
          name="body"
          rows={2}
          placeholder="Add a note…"
          className="textarea textarea-bordered textarea-sm w-full"
        />
        <div className="flex flex-wrap items-center gap-1.5">
          <VisibilitySelect defaultValue="private" />
          <button type="submit" className="btn btn-xs btn-primary">
            Add note
          </button>
        </div>
      </form>
    </div>
  );
}

// Shared/private picker. "shared" makes the note visible in the client/student
// portal; "private" keeps it tutor-only.
function VisibilitySelect({
  defaultValue,
}: {
  defaultValue: "private" | "shared";
}) {
  return (
    <select
      name="visibility"
      defaultValue={defaultValue}
      className="select select-bordered select-xs"
    >
      <option value="private">Private</option>
      <option value="shared">Shared with client</option>
    </select>
  );
}
