import Link from "next/link";
import { GraduationCap } from "lucide-react";
import { requireUser } from "@/lib/session";
import { SignOutButton } from "./sign-out-button";

export default async function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const { user } = await requireUser();

  return (
    <div className="min-h-screen flex flex-col bg-base-200">
      <div className="navbar bg-base-100 border-b border-base-300">
        <div className="navbar-start gap-1">
          <Link href="/dashboard" className="btn btn-ghost text-lg gap-2">
            <GraduationCap className="size-5 text-primary" />
            <span className="font-bold">TutorStar</span>
          </Link>
          <ul className="menu menu-horizontal px-1 hidden sm:flex">
            <li>
              <Link href="/dashboard/clients">Clients</Link>
            </li>
            <li>
              <Link href="/dashboard/students">Students</Link>
            </li>
            <li>
              <Link href="/dashboard/subjects">Subjects</Link>
            </li>
            <li>
              <Link href="/dashboard/engagements">Engagements</Link>
            </li>
            <li>
              <Link href="/dashboard/sessions">Sessions</Link>
            </li>
            <li>
              <Link href="/dashboard/packages">Packages</Link>
            </li>
            <li>
              <Link href="/dashboard/invoices">Invoices</Link>
            </li>
          </ul>
        </div>
        <div className="navbar-end gap-2">
          <Link
            href="/dashboard/settings"
            className="text-sm text-base-content/70 hover:text-base-content hidden sm:inline"
          >
            {user.name}
          </Link>
          <SignOutButton />
        </div>
      </div>

      <main className="flex-1 max-w-5xl w-full mx-auto p-6 flex flex-col gap-6">
        {children}
      </main>
    </div>
  );
}
