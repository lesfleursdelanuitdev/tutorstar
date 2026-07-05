import Link from "next/link";
import { CalendarDays, Users, Wallet, GraduationCap, ArrowRight } from "lucide-react";
import { IconBrandGithub, IconChartBar, IconSparkles } from "@tabler/icons-react";

const features = [
  {
    icon: Users,
    title: "Student management",
    description: "Keep every student's contact details, subjects, and progress notes in one tidy place.",
  },
  {
    icon: CalendarDays,
    title: "Smart scheduling",
    description: "Book recurring lessons, avoid clashes, and send automatic reminders to families.",
  },
  {
    icon: Wallet,
    title: "Invoicing & payments",
    description: "Generate invoices from lessons and track who has paid — without the spreadsheets.",
  },
  {
    icon: IconChartBar,
    title: "Progress insights",
    description: "See attendance, hours taught, and earnings at a glance with clear dashboards.",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-base-100 text-base-content">
      {/* Navbar */}
      <div className="navbar bg-base-100/80 backdrop-blur border-b border-base-200 sticky top-0 z-50">
        <div className="navbar-start">
          <Link href="/" className="btn btn-ghost text-xl gap-2">
            <GraduationCap className="size-6 text-primary" />
            <span className="font-bold">TutorStar</span>
          </Link>
        </div>
        <div className="navbar-center hidden lg:flex">
          <ul className="menu menu-horizontal px-1">
            <li><a href="#features">Features</a></li>
            <li><a href="#pricing">Pricing</a></li>
            <li><a href="#about">About</a></li>
          </ul>
        </div>
        <div className="navbar-end gap-2">
          <Link href="/login" className="btn btn-ghost">Log in</Link>
          <Link href="/login" className="btn btn-primary gap-2">
            Get started <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>

      {/* Hero */}
      <section className="hero py-20 lg:py-28">
        <div className="hero-content text-center max-w-3xl">
          <div className="flex flex-col items-center gap-6">
            <div className="badge badge-primary badge-outline gap-1 py-3">
              <IconSparkles className="size-4" />
              Built for independent tutors
            </div>
            <h1 className="text-4xl lg:text-6xl font-bold tracking-tight">
              Tutoring, finally <span className="text-primary">organised</span>.
            </h1>
            <p className="text-lg text-base-content/70 max-w-xl">
              TutorStar brings your students, schedule, and payments together so you can
              spend less time on admin and more time teaching.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <a className="btn btn-primary btn-lg gap-2">
                Start free trial <ArrowRight className="size-5" />
              </a>
              <a className="btn btn-outline btn-lg gap-2">
                <IconBrandGithub className="size-5" />
                View on GitHub
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-16 bg-base-200">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold">Everything you need to run your tutoring</h2>
            <p className="text-base-content/70 mt-2">One calm home for the whole business.</p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {features.map(({ icon: Icon, title, description }) => (
              <div key={title} className="card bg-base-100 shadow-sm hover:shadow-md transition-shadow">
                <div className="card-body">
                  <div className="rounded-xl bg-primary/10 text-primary size-12 flex items-center justify-center">
                    <Icon className="size-6" />
                  </div>
                  <h3 className="card-title text-lg mt-2">{title}</h3>
                  <p className="text-sm text-base-content/70">{description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section id="pricing" className="py-20">
        <div className="max-w-4xl mx-auto px-4">
          <div className="card bg-primary text-primary-content shadow-lg">
            <div className="card-body items-center text-center gap-4">
              <h2 className="text-3xl font-bold">Ready to get your evenings back?</h2>
              <p className="opacity-90 max-w-md">
                Join tutors who ditched the spreadsheets. Free for your first 5 students.
              </p>
              <a className="btn btn-lg bg-base-100 text-primary hover:bg-base-200 border-0 gap-2">
                Create your account <ArrowRight className="size-5" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer id="about" className="footer footer-center bg-base-200 text-base-content p-8 mt-auto">
        <aside className="flex items-center gap-2">
          <GraduationCap className="size-5 text-primary" />
          <p className="font-semibold">TutorStar</p>
          <span className="text-base-content/60">© 2026 — Tutoring, organised.</span>
        </aside>
      </footer>
    </div>
  );
}
