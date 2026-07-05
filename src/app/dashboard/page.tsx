import Link from "next/link";
import {
  Users,
  GraduationCap,
  BookOpen,
  Link2,
  CalendarClock,
  Receipt,
} from "lucide-react";
import { eq, gte } from "drizzle-orm";
import { db } from "@/db";
import {
  clients,
  engagements,
  invoices,
  sessions,
  students,
  subjects,
} from "@/db/schema";
import { requireRole } from "@/lib/session";

export default async function DashboardPage() {
  const { user } = await requireRole("tutor");
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const [
    clientRows,
    studentRows,
    subjectRows,
    engagementRows,
    sessionRows,
    invoiceRows,
  ] = await Promise.all([
    db.select({ id: clients.id }).from(clients),
    db.select({ id: students.id }).from(students),
    db.select({ id: subjects.id }).from(subjects),
    db.select({ id: engagements.id }).from(engagements),
    db
      .select({ id: sessions.id })
      .from(sessions)
      .where(gte(sessions.scheduledAt, startOfToday)),
    db.select({ id: invoices.id }).from(invoices).where(eq(invoices.status, "sent")),
  ]);

  return (
    <>
      <div>
        <h1 className="text-2xl font-bold">Welcome, {user.name}</h1>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          href="/dashboard/clients"
          className="card bg-base-100 shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="card-body flex-row items-center gap-4">
            <div className="rounded-xl bg-primary/10 text-primary size-12 flex items-center justify-center">
              <Users className="size-6" />
            </div>
            <div>
              <div className="text-3xl font-bold">{clientRows.length}</div>
              <div className="text-base-content/70">
                {clientRows.length === 1 ? "Client" : "Clients"}
              </div>
            </div>
          </div>
        </Link>
        <Link
          href="/dashboard/students"
          className="card bg-base-100 shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="card-body flex-row items-center gap-4">
            <div className="rounded-xl bg-primary/10 text-primary size-12 flex items-center justify-center">
              <GraduationCap className="size-6" />
            </div>
            <div>
              <div className="text-3xl font-bold">{studentRows.length}</div>
              <div className="text-base-content/70">
                {studentRows.length === 1 ? "Student" : "Students"}
              </div>
            </div>
          </div>
        </Link>
        <Link
          href="/dashboard/subjects"
          className="card bg-base-100 shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="card-body flex-row items-center gap-4">
            <div className="rounded-xl bg-primary/10 text-primary size-12 flex items-center justify-center">
              <BookOpen className="size-6" />
            </div>
            <div>
              <div className="text-3xl font-bold">{subjectRows.length}</div>
              <div className="text-base-content/70">
                {subjectRows.length === 1 ? "Subject" : "Subjects"}
              </div>
            </div>
          </div>
        </Link>
        <Link
          href="/dashboard/engagements"
          className="card bg-base-100 shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="card-body flex-row items-center gap-4">
            <div className="rounded-xl bg-primary/10 text-primary size-12 flex items-center justify-center">
              <Link2 className="size-6" />
            </div>
            <div>
              <div className="text-3xl font-bold">{engagementRows.length}</div>
              <div className="text-base-content/70">
                {engagementRows.length === 1 ? "Engagement" : "Engagements"}
              </div>
            </div>
          </div>
        </Link>
        <Link
          href="/dashboard/sessions"
          className="card bg-base-100 shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="card-body flex-row items-center gap-4">
            <div className="rounded-xl bg-primary/10 text-primary size-12 flex items-center justify-center">
              <CalendarClock className="size-6" />
            </div>
            <div>
              <div className="text-3xl font-bold">{sessionRows.length}</div>
              <div className="text-base-content/70">Upcoming sessions</div>
            </div>
          </div>
        </Link>
        <Link
          href="/dashboard/invoices"
          className="card bg-base-100 shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="card-body flex-row items-center gap-4">
            <div className="rounded-xl bg-primary/10 text-primary size-12 flex items-center justify-center">
              <Receipt className="size-6" />
            </div>
            <div>
              <div className="text-3xl font-bold">{invoiceRows.length}</div>
              <div className="text-base-content/70">Unpaid invoices</div>
            </div>
          </div>
        </Link>
      </div>
    </>
  );
}
