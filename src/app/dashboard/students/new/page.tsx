import { requireRole } from "@/lib/session";
import { Flash } from "../../flash";
import { createStudentAction } from "../actions";

export default async function NewStudentPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireRole("tutor");
  const { error } = await searchParams;

  return (
    <>
      <h1 className="text-2xl font-bold">New student</h1>
      <div className="card bg-base-100 shadow-sm max-w-lg">
        <div className="card-body">
          <Flash error={error} />
          <form action={createStudentAction} className="flex flex-col gap-3">
            <label className="form-control">
              <span className="label-text mb-1">Name *</span>
              <input name="name" required className="input input-bordered" />
            </label>
            <label className="form-control">
              <span className="label-text mb-1">Birthdate</span>
              <input name="birthdate" type="date" className="input input-bordered" />
            </label>
            <label className="form-control">
              <span className="label-text mb-1">Grade level</span>
              <input
                name="gradeLevel"
                placeholder="e.g. 8th grade"
                className="input input-bordered"
              />
            </label>
            <label className="form-control">
              <span className="label-text mb-1">Notes</span>
              <textarea name="notes" className="textarea textarea-bordered" rows={3} />
            </label>
            <button type="submit" className="btn btn-primary mt-2">
              Create student
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
