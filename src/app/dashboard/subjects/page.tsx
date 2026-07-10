import { Plus, X } from "lucide-react";
import { asc } from "drizzle-orm";
import { db } from "@/db";
import { subjects } from "@/db/schema";
import { requireRole } from "@/lib/session";
import { Flash } from "../flash";
import { createSubjectAction, deleteSubjectAction } from "./actions";

export default async function SubjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireRole("tutor");
  const { error } = await searchParams;
  const rows = await db.query.subjects.findMany({
    orderBy: [asc(subjects.name)],
    with: { engagementSubjects: { columns: { engagementId: true } } },
  });

  return (
    <>
      <h1 className="text-2xl font-bold">Subjects</h1>
      <Flash error={error} />

      <div className="card bg-base-100 shadow-sm max-w-lg">
        <div className="card-body">
          <form action={createSubjectAction} className="flex items-end gap-2">
            <label className="form-control flex-1">
              <span className="label-text mb-1">Add a subject you teach</span>
              <input
                name="name"
                required
                placeholder="e.g. Algebra II"
                className="input input-bordered"
              />
            </label>
            <button type="submit" className="btn btn-primary gap-1">
              <Plus className="size-4" /> Add
            </button>
          </form>

          {rows.length === 0 ? (
            <p className="text-base-content/70 text-sm mt-2">
              No subjects yet — add the subjects you teach. Engagements will
              reference them.
            </p>
          ) : (
            <ul className="flex flex-col divide-y divide-base-200 mt-2">
              {rows.map((subject) => (
                <li
                  key={subject.id}
                  className="flex items-center justify-between py-2 gap-2"
                >
                  <div>
                    <span className="font-medium">{subject.name}</span>
                    {subject.engagementSubjects.length > 0 && (
                      <span className="badge badge-ghost badge-sm ml-2">
                        {subject.engagementSubjects.length}{" "}
                        {subject.engagementSubjects.length === 1
                          ? "engagement"
                          : "engagements"}
                      </span>
                    )}
                  </div>
                  <form action={deleteSubjectAction}>
                    <input type="hidden" name="id" value={subject.id} />
                    <button
                      type="submit"
                      className="btn btn-ghost btn-xs text-error"
                      aria-label={`Delete ${subject.name}`}
                    >
                      <X className="size-4" />
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}
