import Link from "next/link";
import { GraduationCap } from "lucide-react";
import { requirePortalUser } from "@/lib/session";
import { SignOutButton } from "../dashboard/sign-out-button";

export default async function PortalLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // Client/student surface. Pure tutors are redirected to their dashboard.
  const { user } = await requirePortalUser();

  return (
    <div className="min-h-screen flex flex-col bg-base-200">
      <div className="navbar bg-base-100 border-b border-base-300">
        <div className="navbar-start gap-1">
          <Link href="/portal" className="btn btn-ghost text-lg gap-2">
            <GraduationCap className="size-5 text-primary" />
            <span className="font-bold">TutorStar</span>
          </Link>
        </div>
        <div className="navbar-end gap-2">
          <span className="text-sm text-base-content/70 hidden sm:inline">
            {user.name}
          </span>
          <SignOutButton />
        </div>
      </div>

      <main className="flex-1 max-w-3xl w-full mx-auto p-6 flex flex-col gap-6">
        {children}
      </main>
    </div>
  );
}
