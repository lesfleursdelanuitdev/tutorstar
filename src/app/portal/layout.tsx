import Link from "next/link";
import { requirePortalUser } from "@/lib/session";
import { AxolotlMark } from "@/components/axolotl-mark";
import { ThemeToggle } from "@/components/theme-toggle";
import { SignOutButton } from "../dashboard/sign-out-button";

export default async function PortalLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const { user } = await requirePortalUser();

  return (
    <div className="flex min-h-screen flex-col bg-base-200">
      <header className="sticky top-0 z-20 border-b border-[color:var(--axo-border)] bg-base-200/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link href="/portal" className="flex items-center gap-2">
            <AxolotlMark size={32} gills={false} title="TutorStar" />
            <span className="font-display text-lg font-extrabold">TutorStar</span>
          </Link>
          <div className="flex items-center gap-2">
            <span className="hidden text-sm font-semibold text-[color:var(--axo-muted)] sm:inline">
              {user.name}
            </span>
            <ThemeToggle />
            <SignOutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-4 sm:p-6">
        {children}
      </main>
    </div>
  );
}
