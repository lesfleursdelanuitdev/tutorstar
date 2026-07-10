import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { progressReports } from "@/db/schema";
import { isUuid } from "@/lib/forms";
import { formatScore, type ReportContent } from "@/lib/progress";
import { requireRole } from "@/lib/session";
import { Flash } from "../../../../flash";
import {
  deleteProgressReportAction,
  sendProgressReportAction,
} from "../../../progress-actions";

export default async function ProgressReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; reportId: string }>;
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  await requireRole("tutor");
  const { id, reportId } = await params;
  const { error, saved } = await searchParams;
  if (!isUuid(id) || !isUuid(reportId)) notFound();

  const report = await db.query.progressReports.findFirst({
    where: eq(progressReports.id, reportId),
    with: { student: { columns: { id: true, name: true } } },
  });
  if (!report || report.studentId !== id) notFound();

  const content = report.content as ReportContent;
  const send = sendProgressReportAction.bind(null, report.id);
  const remove = deleteProgressReportAction.bind(null, report.id);

  return (
    <>
      <div className="breadcrumbs text-sm">
        <ul>
          <li>
            <Link href="/dashboard/students">Students</Link>
          </li>
          <li>
            <Link href={`/dashboard/students/${id}`}>{report.student.name}</Link>
          </li>
          <li>Report</li>
        </ul>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Progress report</h1>
          <p className="text-base-content/70 text-sm mt-1">
            {report.periodStart} → {report.periodEnd} · {report.student.name}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {report.sentAt ? (
            <span className="badge badge-success">
              Sent {report.sentAt.toLocaleDateString()}
            </span>
          ) : (
            <>
              <span className="badge badge-ghost">Draft</span>
              <form action={send}>
                <button type="submit" className="btn btn-primary btn-sm">
                  Send to linked clients
                </button>
              </form>
              <form action={remove}>
                <button type="submit" className="btn btn-ghost btn-sm text-error">
                  Delete
                </button>
              </form>
            </>
          )}
        </div>
      </div>

      <Flash error={error} saved={saved} />

      <div className="card bg-base-100 shadow-sm">
        <div className="card-body gap-4">
          <section>
            <h2 className="font-bold text-lg mb-2">Tutor summary</h2>
            <p className="whitespace-pre-wrap text-sm leading-relaxed">
              {report.summary}
            </p>
          </section>

          <section>
            <h2 className="font-bold text-lg mb-2">Goals (frozen)</h2>
            {content.goals.length === 0 ? (
              <p className="text-sm text-base-content/70">
                No shared goal progress in this period.
              </p>
            ) : (
              <ul className="flex flex-col gap-3">
                {content.goals.map((g) => (
                  <li key={g.id} className="rounded-xl bg-base-200/60 p-3">
                    <div className="font-semibold">
                      {g.title}
                      {g.subjectName ? (
                        <span className="text-base-content/60 font-normal">
                          {" "}
                          · {g.subjectName}
                        </span>
                      ) : null}
                      {g.complete && (
                        <span className="badge badge-success badge-sm ml-2">
                          Complete
                        </span>
                      )}
                    </div>
                    {g.stepsCompleted.length > 0 && (
                      <ul className="mt-1 list-disc pl-5 text-sm">
                        {g.stepsCompleted.map((s, i) => (
                          <li key={`${g.id}-${i}`}>{s.title}</li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h2 className="font-bold text-lg mb-2">Assessments (frozen)</h2>
            {content.assessments.length === 0 ? (
              <p className="text-sm text-base-content/70">
                No shared assessments in this period.
              </p>
            ) : (
              <ul className="flex flex-col gap-3">
                {content.assessments.map((s, i) => (
                  <li key={`${s.seriesName}-${i}`} className="rounded-xl bg-base-200/60 p-3">
                    <div className="font-semibold">
                      {s.seriesName}
                      {s.subjectName ? (
                        <span className="text-base-content/60 font-normal">
                          {" "}
                          · {s.subjectName}
                        </span>
                      ) : null}
                    </div>
                    <ul className="mt-1 list-disc pl-5 text-sm">
                      {s.points.map((p, j) => (
                        <li key={`${s.seriesName}-${j}`}>
                          {p.takenOn} — {formatScore(p.rawScore, p.maxScore)}
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
