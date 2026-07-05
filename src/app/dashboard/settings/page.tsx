import { eq } from "drizzle-orm";
import { db } from "@/db";
import { tutors } from "@/db/schema";
import { centsToInput } from "@/lib/money";
import { requireRole } from "@/lib/session";
import { Flash } from "../flash";
import { updateTutorSettingsAction } from "./actions";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const { user } = await requireRole("tutor");
  const { error, saved } = await searchParams;

  const tutor = await db.query.tutors.findFirst({
    where: eq(tutors.userId, user.id),
    columns: { bio: true, defaultHourlyRateCents: true },
  });

  return (
    <>
      <h1 className="text-2xl font-bold">Settings</h1>
      <Flash error={error} saved={saved} />

      <div className="card bg-base-100 shadow-sm max-w-lg">
        <div className="card-body">
          <h2 className="card-title text-lg">Your profile</h2>
          <form
            action={updateTutorSettingsAction}
            className="flex flex-col gap-3"
          >
            <label className="form-control">
              <span className="label-text mb-1">Name *</span>
              <input
                name="name"
                required
                defaultValue={user.name}
                className="input input-bordered"
              />
            </label>
            <label className="form-control">
              <span className="label-text mb-1">Email</span>
              <input
                type="email"
                defaultValue={user.email}
                disabled
                className="input input-bordered"
              />
              <span className="label-text-alt text-base-content/60 mt-1">
                Sign-in email can&apos;t be changed here yet.
              </span>
            </label>
            <label className="form-control">
              <span className="label-text mb-1">Default hourly rate</span>
              <label className="input input-bordered flex items-center gap-2">
                <span className="text-base-content/60">$</span>
                <input
                  name="defaultHourlyRate"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={centsToInput(tutor?.defaultHourlyRateCents)}
                  className="grow"
                  placeholder="0.00"
                />
              </label>
              <span className="label-text-alt text-base-content/60 mt-1">
                Prefills the rate when you start a new engagement. Leave blank
                for none.
              </span>
            </label>
            <label className="form-control">
              <span className="label-text mb-1">Bio</span>
              <textarea
                name="bio"
                rows={4}
                defaultValue={tutor?.bio ?? ""}
                className="textarea textarea-bordered"
                placeholder="A short description clients might see."
              />
            </label>
            <button type="submit" className="btn btn-primary mt-2 self-start">
              Save changes
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
