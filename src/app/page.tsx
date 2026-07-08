import Link from "next/link";
import { Users, CalendarDays, Wallet, BarChart3 } from "lucide-react";
import { AxolotlMark } from "@/components/axolotl-mark";
import { ThemeToggle } from "@/components/theme-toggle";

const features = [
  {
    icon: Users,
    title: "Student management",
    description:
      "Keep every student's contact details, subjects, and progress notes in one tidy place.",
    tint: "aqua",
  },
  {
    icon: CalendarDays,
    title: "Smart scheduling",
    description:
      "Book recurring lessons, avoid clashes, and send automatic reminders to families.",
    tint: "pink",
  },
  {
    icon: Wallet,
    title: "Invoicing & payments",
    description:
      "Generate invoices from lessons and track who has paid — without the spreadsheets.",
    tint: "aqua",
  },
  {
    icon: BarChart3,
    title: "Progress insights",
    description:
      "See attendance, hours taught, and earnings at a glance with clear dashboards.",
    tint: "pink",
  },
] as const;

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-base-200 text-base-content">
      {/* Navbar */}
      <header className="sticky top-0 z-50 border-b border-[color:var(--axo-border)] bg-base-200/90 backdrop-blur">
        <nav className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
          <Link href="/" className="flex items-center gap-2">
            <AxolotlMark size={38} title="TutorStar" />
            <span className="font-display text-2xl font-extrabold">TutorStar</span>
          </Link>
          <div className="hidden items-center gap-7 md:flex">
            <a href="#features" className="font-semibold text-[color:var(--axo-muted)] transition hover:text-primary">
              Features
            </a>
            <a href="#pricing" className="font-semibold text-[color:var(--axo-muted)] transition hover:text-primary">
              Pricing
            </a>
            <a href="#about" className="font-semibold text-[color:var(--axo-muted)] transition hover:text-primary">
              About
            </a>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <ThemeToggle />
            <Link href="/login" className="btn btn-ghost font-extrabold">
              Log in
            </Link>
            <Link
              href="/login"
              className="btn btn-primary btn-chunky chunky-aqua font-extrabold"
            >
              Get started →
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden px-6 pb-20 pt-16 text-center sm:pb-24 sm:pt-20">
        <div
          aria-hidden
          className="pointer-events-none absolute -left-24 -top-20 size-[260px] rounded-full"
          style={{ background: "var(--axo-aqua-tint-2)" }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-28 -right-20 size-[300px] rounded-full"
          style={{ background: "var(--axo-pink-tint-2)" }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute right-[12%] top-[22%] size-6 rounded-full"
          style={{ background: "var(--axo-aqua-blob)" }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute right-[8%] top-[36%] size-3.5 rounded-full opacity-60"
          style={{ background: "var(--axo-pink-soft)" }}
        />
        <div className="relative mx-auto flex max-w-3xl flex-col items-center gap-5">
          <AxolotlMark size={110} title="Axel the axolotl" />
          <span
            className="rounded-full px-4 py-2 text-sm font-extrabold"
            style={{ background: "var(--axo-pink-tint-2)", color: "var(--axo-pink)" }}
          >
            ✦ Built for independent tutors
          </span>
          <h1 className="font-display text-5xl font-extrabold leading-[1.05] sm:text-6xl">
            Tutoring, finally <span className="text-primary">organised</span>.
          </h1>
          <p className="max-w-xl text-lg leading-relaxed text-[color:var(--axo-muted)]">
            TutorStar brings your students, schedule, and payments together so
            you can spend less time on admin and more time teaching.
          </p>
          <div className="mt-2 flex flex-wrap justify-center gap-3.5">
            <Link
              href="/login"
              className="btn btn-primary btn-lg btn-chunky chunky-aqua font-extrabold"
            >
              Start free trial →
            </Link>
            <a
              href="#features"
              className="btn btn-lg btn-outline border-2 border-[color:var(--axo-border)] bg-base-100 font-extrabold text-base-content hover:border-primary hover:bg-base-100"
            >
              See how it works
            </a>
          </div>
        </div>
      </section>

      {/* Features band — scoops up over the hero */}
      <section
        id="features"
        className="scoop-top relative z-10 -mt-6 bg-base-100 px-6 py-16 sm:px-10"
      >
        <div className="mx-auto max-w-6xl">
          <div className="mb-10 text-center">
            <h2 className="font-display text-3xl font-extrabold sm:text-4xl">
              Everything you need to run your tutoring
            </h2>
            <p className="mt-2 text-[color:var(--axo-muted)]">
              One calm home for the whole business.
            </p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {features.map(({ icon: Icon, title, description, tint }) => (
              <div
                key={title}
                className="flex flex-col gap-3 rounded-3xl p-6 transition hover:-translate-y-1"
                style={{
                  background:
                    tint === "aqua"
                      ? "var(--axo-aqua-tint)"
                      : "var(--axo-pink-tint)",
                }}
              >
                <div
                  className="flex size-13 items-center justify-center rounded-[18px]"
                  style={{
                    background:
                      tint === "aqua" ? "var(--axo-aqua)" : "var(--axo-pink)",
                    width: 52,
                    height: 52,
                  }}
                >
                  <Icon className="size-6 text-white" strokeWidth={2} />
                </div>
                <h3 className="font-display text-lg font-bold">{title}</h3>
                <p className="text-sm leading-relaxed text-[color:var(--axo-muted)]">
                  {description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section id="pricing" className="bg-base-100 px-6 pb-20 pt-4 sm:px-10">
        <div className="mx-auto max-w-6xl">
          <div
            className="relative flex flex-col items-start justify-between gap-6 overflow-hidden rounded-[32px] p-10 sm:flex-row sm:items-center sm:p-13"
            style={{ background: "var(--axo-ink)", padding: 52 }}
          >
            <div
              aria-hidden
              className="pointer-events-none absolute -right-10 -top-10 size-44 rounded-full"
              style={{ background: "var(--axo-aqua-tint-2)" }}
            />
            <div className="relative flex flex-col gap-2.5">
              <h2 className="font-display text-3xl font-extrabold text-white">
                Ready to get your evenings back?
              </h2>
              <p className="max-w-md text-[color:var(--axo-muted)]">
                Join tutors who ditched the spreadsheets. Free for your first 5
                students.
              </p>
            </div>
            <Link
              href="/login"
              className="btn btn-lg btn-chunky chunky-pink relative whitespace-nowrap border-none font-extrabold"
              style={{ background: "var(--axo-pink-soft)", color: "#16343a" }}
            >
              Create your account →
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer
        id="about"
        className="mt-auto flex items-center justify-center gap-2.5 px-6 py-7 text-sm font-semibold"
        style={{ background: "var(--axo-aqua-tint)", color: "var(--axo-muted)" }}
      >
        <AxolotlMark size={20} gills={false} />
        <span className="font-display font-extrabold text-base-content">
          TutorStar
        </span>
        <span>© 2026 — Tutoring, organised.</span>
      </footer>
    </div>
  );
}
