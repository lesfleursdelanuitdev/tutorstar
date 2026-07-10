import Link from "next/link";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { invoices } from "@/db/schema";
import { requireRole } from "@/lib/session";
import { AxolotlMark } from "@/components/axolotl-mark";
import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { DashboardMobileMenu } from "@/components/dashboard-mobile-menu";
import { ThemeToggle } from "@/components/theme-toggle";
import { SignOutButton } from "./sign-out-button";

function userInitial(name: string) {
  return (name.trim()[0] ?? "?").toUpperCase();
}

export default async function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const { user } = await requireRole("tutor");

  const draftRows = await db
    .select({ id: invoices.id })
    .from(invoices)
    .where(eq(invoices.status, "draft"));

  const draftInvoiceCount = draftRows.length;

  return (
    <div className="flex min-h-screen bg-base-200">
      <DashboardSidebar
        draftInvoiceCount={draftInvoiceCount}
        className="fixed inset-y-0 left-0 z-30 hidden lg:flex"
      />

      <div className="flex min-w-0 flex-1 flex-col lg:ml-[230px]">
        <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-[color:var(--axo-border)] bg-base-200/90 px-4 py-3 backdrop-blur sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <DashboardMobileMenu draftInvoiceCount={draftInvoiceCount} />
            <Link href="/dashboard" className="flex items-center gap-2 lg:hidden">
              <AxolotlMark size={32} gills={false} title="TutorStar" />
              <span className="font-display text-lg font-extrabold">TutorStar</span>
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link
              href="/dashboard/sessions"
              className="btn btn-sm border-2 border-[color:var(--axo-border)] bg-base-100 font-extrabold text-base-content hover:border-primary"
            >
              + New lesson
            </Link>
            <div
              className="flex size-[42px] items-center justify-center rounded-full font-extrabold"
              style={{ background: "var(--axo-pink-soft)", color: "#16343a" }}
              title={user.name}
            >
              {userInitial(user.name)}
            </div>
            <SignOutButton />
          </div>
        </header>

        <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
