import Link from "next/link";
import { and, asc, desc, eq, gte, lte } from "drizzle-orm";
import { db } from "@/db";
import {
  engagements,
  invoices,
  payments,
  sessions,
  students,
} from "@/db/schema";
import { formatCents } from "@/lib/money";
import { requireRole } from "@/lib/session";

function startOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function startOfWeek(d = new Date()) {
  const x = startOfDay(d);
  const day = x.getDay();
  const diff = day === 0 ? -6 : 1 - day; // Monday-start week
  x.setDate(x.getDate() + diff);
  return x;
}

function endOfWeek(d = new Date()) {
  const x = startOfWeek(d);
  x.setDate(x.getDate() + 6);
  return endOfDay(x);
}

function startOfMonth(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return { text: "Good morning", emoji: "👋" };
  if (h < 18) return { text: "Good afternoon", emoji: "☀️" };
  return { text: "Good evening", emoji: "🌙" };
}

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] ?? name;
}

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function formatTime(d: Date) {
  return d.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function formatLongDate(d: Date) {
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function monthLabel(year: number, month: number) {
  return new Date(year, month, 1).toLocaleDateString(undefined, {
    month: "short",
  });
}

type InvoiceChip = "overdue" | "sent" | "paid" | "draft" | "void";

function invoiceChip(status: string, dueOn: string | null): InvoiceChip {
  if (status === "paid") return "paid";
  if (status === "void") return "void";
  if (status === "draft") return "draft";
  if (status === "sent") {
    const today = new Date().toISOString().slice(0, 10);
    if (dueOn && dueOn < today) return "overdue";
    return "sent";
  }
  return "sent";
}

const CHIP: Record<InvoiceChip, { label: string; bg: string; color: string }> =
  {
  overdue: {
    label: "Overdue",
    bg: "var(--axo-pink-tint-2)",
    color: "var(--axo-pink)",
  },
  sent: {
    label: "Sent",
    bg: "var(--axo-warn-bg)",
    color: "var(--axo-warn-tx)",
  },
  paid: {
    label: "Paid",
    bg: "var(--axo-aqua-tint-2)",
    color: "var(--axo-aqua-pressed)",
  },
  draft: {
    label: "Draft",
    bg: "var(--axo-aqua-tint)",
    color: "var(--axo-muted)",
  },
  void: {
    label: "Void",
    bg: "var(--axo-aqua-tint)",
    color: "var(--axo-muted)",
  },
};

export default async function DashboardPage() {
  const { user } = await requireRole("tutor");
  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const weekStart = startOfWeek(now);
  const weekEnd = endOfWeek(now);
  const monthStart = startOfMonth(now);

  const [
    activeStudentRows,
    newStudentsRows,
    weekSessions,
    monthCompletedSessions,
    todaySessions,
    sentInvoiceRows,
    recentInvoiceRows,
    recentPayments,
  ] = await Promise.all([
    db
      .selectDistinct({ studentId: engagements.studentId })
      .from(engagements)
      .where(eq(engagements.status, "active")),
    db
      .select({ id: students.id })
      .from(students)
      .where(gte(students.createdAt, monthStart)),
    db.query.sessions.findMany({
      where: and(
        gte(sessions.scheduledAt, weekStart),
        lte(sessions.scheduledAt, weekEnd),
      ),
      columns: { id: true, scheduledAt: true, status: true },
    }),
    db.query.sessions.findMany({
      where: and(
        eq(sessions.status, "completed"),
        gte(sessions.scheduledAt, monthStart),
      ),
      columns: { durationMinutes: true },
    }),
    db.query.sessions.findMany({
      where: and(
        gte(sessions.scheduledAt, todayStart),
        lte(sessions.scheduledAt, todayEnd),
      ),
      orderBy: [asc(sessions.scheduledAt)],
      with: {
        engagement: { with: { student: true, subject: true } },
      },
    }),
    db.query.invoices.findMany({
      where: eq(invoices.status, "sent"),
      with: {
        lineItems: { columns: { amountCents: true } },
        payments: { columns: { amountCents: true } },
      },
    }),
    db.query.invoices.findMany({
      orderBy: [desc(invoices.createdAt)],
      limit: 3,
      with: {
        client: true,
        lineItems: { columns: { amountCents: true } },
      },
    }),
    db.query.payments.findMany({
      where: gte(
        payments.paidAt,
        new Date(now.getFullYear(), now.getMonth() - 5, 1),
      ),
      columns: { amountCents: true, paidAt: true },
    }),
  ]);

  const remainingThisWeek = weekSessions.filter(
    (s) => s.status === "scheduled" && s.scheduledAt >= now,
  ).length;

  const hoursTaught =
    monthCompletedSessions.reduce((sum, s) => sum + s.durationMinutes, 0) / 60;

  let unpaidTotalCents = 0;
  let overdueCount = 0;
  for (const inv of sentInvoiceRows) {
    const total = inv.lineItems.reduce((s, li) => s + li.amountCents, 0);
    const paid = inv.payments.reduce((s, p) => s + p.amountCents, 0);
    const balance = total - paid;
    if (balance > 0) {
      unpaidTotalCents += balance;
      if (invoiceChip(inv.status, inv.dueOn) === "overdue") overdueCount++;
    }
  }

  const recentInvoices = recentInvoiceRows;

  // Earnings by month (last 6 calendar months)
  const monthBuckets: { year: number; month: number; cents: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthBuckets.push({ year: d.getFullYear(), month: d.getMonth(), cents: 0 });
  }
  for (const p of recentPayments) {
    const y = p.paidAt.getFullYear();
    const m = p.paidAt.getMonth();
    const bucket = monthBuckets.find((b) => b.year === y && b.month === m);
    if (bucket) bucket.cents += p.amountCents;
  }
  const maxEarnings = Math.max(...monthBuckets.map((b) => b.cents), 1);

  const greet = greeting();

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-[26px] font-extrabold">
            {greet.text}, {firstName(user.name)} {greet.emoji}
          </h1>
          <p className="mt-0.5 text-sm text-[color:var(--axo-muted)]">
            {formatLongDate(now)} — {todaySessions.length}{" "}
            {todaySessions.length === 1 ? "lesson" : "lessons"} today
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Active students"
          value={String(activeStudentRows.length)}
          delta={
            newStudentsRows.length > 0
              ? `+${newStudentsRows.length} this month`
              : undefined
          }
          deltaTone="aqua"
        />
        <StatCard
          label="Lessons this week"
          value={String(weekSessions.length)}
          delta={
            remainingThisWeek > 0
              ? `${remainingThisWeek} remaining`
              : undefined
          }
        />
        <StatCard
          label={`Hours taught (${monthLabel(now.getFullYear(), now.getMonth())})`}
          value={hoursTaught % 1 === 0 ? String(hoursTaught) : hoursTaught.toFixed(1)}
          delta={hoursTaught > 0 ? "on track" : undefined}
          deltaTone="aqua"
        />
        <StatCard
          label="Unpaid invoices"
          value={formatCents(unpaidTotalCents)}
          delta={
            overdueCount > 0 ? `${overdueCount} overdue · chase now →` : undefined
          }
          deltaTone="pink"
          inverted
          href="/dashboard/invoices"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <section className="rounded-[22px] bg-base-100 p-5 sm:p-6">
          <div className="mb-3.5 flex items-baseline justify-between">
            <h2 className="font-display text-lg font-bold">Today&apos;s lessons</h2>
            <Link
              href="/dashboard/sessions"
              className="text-[13px] font-extrabold text-primary hover:underline"
            >
              Full schedule →
            </Link>
          </div>
          {todaySessions.length === 0 ? (
            <p className="text-sm text-[color:var(--axo-muted)]">
              No lessons scheduled for today.
            </p>
          ) : (
            <ul className="flex flex-col gap-2.5">
              {todaySessions.map((session) => {
                const student = session.engagement.student;
                const subject = session.engagement.subject;
                const isAlert =
                  session.status === "cancelled_by_client" ||
                  session.status === "no_show";
                const rowBg = isAlert
                  ? "var(--axo-pink-tint)"
                  : "var(--axo-aqua-tint)";
                const timeColor = isAlert ? "var(--axo-pink)" : "var(--axo-aqua)";
                const statusLabel =
                  session.status === "scheduled"
                    ? "Confirmed"
                    : session.status === "completed"
                      ? "Completed"
                      : session.status === "cancelled_by_client"
                        ? "Awaiting reply"
                        : session.status.replace(/_/g, " ");

                return (
                  <li
                    key={session.id}
                    className="flex items-center gap-3.5 rounded-2xl px-4 py-3.5"
                    style={{ background: rowBg }}
                  >
                    <span
                      className="w-[52px] shrink-0 text-sm font-extrabold"
                      style={{ color: timeColor }}
                    >
                      {formatTime(session.scheduledAt)}
                    </span>
                    <div
                      className="flex size-[38px] shrink-0 items-center justify-center rounded-full text-sm font-extrabold"
                      style={{
                        background: isAlert
                          ? "var(--axo-aqua-blob)"
                          : "var(--axo-pink-soft)",
                        color: "#16343a",
                      }}
                    >
                      {initials(student.name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-extrabold">
                        {student.name}
                      </p>
                      <p className="truncate text-xs text-[color:var(--axo-muted)]">
                        {subject.name} · {session.durationMinutes} min
                      </p>
                    </div>
                    <span
                      className="shrink-0 rounded-full px-3 py-1.5 text-xs font-extrabold"
                      style={{
                        background: isAlert
                          ? "var(--axo-pink-tint-2)"
                          : "var(--axo-aqua-tint-2)",
                        color: isAlert
                          ? "var(--axo-pink)"
                          : "var(--axo-aqua-pressed)",
                      }}
                    >
                      {statusLabel}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <div className="flex flex-col gap-4">
          <section className="rounded-[22px] bg-base-100 p-5 sm:p-6">
            <div className="mb-3 flex items-baseline justify-between">
              <h2 className="font-display text-lg font-bold">Invoices</h2>
              <Link
                href="/dashboard/invoices"
                className="text-[13px] font-extrabold text-primary hover:underline"
              >
                All →
              </Link>
            </div>
            {recentInvoices.length === 0 ? (
              <p className="text-sm text-[color:var(--axo-muted)]">
                No invoices yet.
              </p>
            ) : (
              <ul className="flex flex-col">
                {recentInvoices.map((inv, i) => {
                  const total = inv.lineItems.reduce(
                    (s, li) => s + li.amountCents,
                    0,
                  );
                  const chip = invoiceChip(inv.status, inv.dueOn);
                  const meta = CHIP[chip];
                  return (
                    <li
                      key={inv.id}
                      className={`flex items-center justify-between gap-3 py-2.5 ${
                        i < recentInvoices.length - 1
                          ? "border-b border-[color:var(--axo-aqua-tint)]"
                          : ""
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-extrabold">
                          {inv.client.name}
                        </p>
                        <p className="text-xs text-[color:var(--axo-muted)]">
                          INV-{String(inv.number).padStart(4, "0")} ·{" "}
                          {formatCents(total)}
                        </p>
                      </div>
                      <span
                        className="shrink-0 rounded-full px-2.5 py-1 text-xs font-extrabold"
                        style={{ background: meta.bg, color: meta.color }}
                      >
                        {meta.label}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className="rounded-[22px] bg-base-100 p-5 sm:p-6">
            <h2 className="font-display mb-3 text-lg font-bold">Earnings</h2>
            <div className="flex h-20 items-end gap-2">
              {monthBuckets.map((b, i) => {
                const pct = Math.round((b.cents / maxEarnings) * 100);
                const isCurrent = i === monthBuckets.length - 1;
                const isPeak =
                  b.cents === maxEarnings && b.cents > 0 && !isCurrent;
                return (
                  <div
                    key={`${b.year}-${b.month}`}
                    className="flex-1 rounded-t-lg rounded-b-sm"
                    style={{
                      height: `${Math.max(pct, 8)}%`,
                      background: isCurrent
                        ? "var(--axo-pink-soft)"
                        : isPeak
                          ? "var(--axo-aqua)"
                          : "var(--axo-aqua-blob)",
                    }}
                    title={formatCents(b.cents)}
                  />
                );
              })}
            </div>
            <div className="mt-2 flex justify-between text-[11px] font-bold text-[color:var(--axo-muted)]">
              {monthBuckets.map((b) => (
                <span key={`${b.year}-${b.month}-lbl`}>
                  {monthLabel(b.year, b.month)}
                </span>
              ))}
            </div>
          </section>
        </div>
      </div>
    </>
  );
}

function StatCard({
  label,
  value,
  delta,
  deltaTone,
  inverted,
  href,
}: {
  label: string;
  value: string;
  delta?: string;
  deltaTone?: "aqua" | "pink";
  inverted?: boolean;
  href?: string;
}) {
  const content = (
    <div
      className={`flex flex-col gap-1 rounded-[22px] p-5 transition hover:-translate-y-0.5 ${
        inverted ? "stat-inverted" : "bg-base-100"
      }`}
    >
      <span className="text-[13px] font-bold text-[color:var(--axo-muted)]">
        {label}
      </span>
      <span className="font-display text-[32px] font-extrabold leading-none stat-inverted-value">
        {value}
      </span>
      {delta && (
        <span
          className="text-xs font-bold"
          style={{
            color:
              deltaTone === "pink"
                ? "var(--axo-pink)"
                : deltaTone === "aqua"
                  ? "var(--axo-aqua)"
                  : "var(--axo-muted)",
          }}
        >
          {delta}
        </span>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block">
        {content}
      </Link>
    );
  }
  return content;
}
