import Link from "next/link";
import { TutorstarAxolotlMascot } from "@/components/tutorstar-axolotl-mascot";

export default function MascotPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-base-200 px-6 py-12">
      <div className="w-full max-w-2xl rounded-[32px] bg-base-100 p-8 text-center shadow-[0_24px_80px_-40px_rgba(22,52,58,0.35)] sm:p-12">
        <h1 className="font-display text-3xl font-extrabold text-base-content">
          TutorStar Mascot
        </h1>
        <p className="mt-2 text-sm text-[color:var(--axo-muted)]">
          Pink axolotl in a navy hoodie, waving and holding a smiling yellow star.
        </p>

        <div className="mx-auto mt-8 w-full max-w-md">
          <TutorstarAxolotlMascot className="h-auto w-full" />
        </div>

        <Link
          href="/"
          className="btn btn-ghost mt-8 font-bold text-primary hover:underline"
        >
          ← Back to home
        </Link>
      </div>
    </div>
  );
}
