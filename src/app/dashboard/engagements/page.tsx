import Link from "next/link";
import { Plus } from "lucide-react";
import { asc, desc } from "drizzle-orm";
import { db } from "@/db";
import { engagements } from "@/db/schema";
import { formatCents } from "@/lib/money";
import { requireRole } from "@/lib/session";
import { subjectNames } from "@/lib/subjects";

export default async function EngagementsPage() {
  await requireRole("tutor");
  const rows = await db.query.engagements.findMany({
    orderBy: [asc(engagements.status), desc(engagements.createdAt)],
    with: {
      student: true,
      client: true,
      engagementSubjects: { with: { subject: true } },
    },
  });

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Engagements</h1>
        <Link
          href="/dashboard/engagements/new"
          className="btn btn-primary btn-sm gap-2"
        >
          <Plus className="size-4" /> New engagement
        </Link>
      </div>

      <div className="card bg-base-100 shadow-sm">
        <div className="card-body p-0">
          {rows.length === 0 ? (
            <p className="p-6 text-base-content/70">
              No engagements yet. An engagement pairs a student and their
              subjects with the client who pays for it — create your first one.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Subjects</th>
                    <th>Client</th>
                    <th>Rate</th>
                    <th>Status</th>
                    <th>Started</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((engagement) => (
                    <tr key={engagement.id} className="hover">
                      <td>
                        <Link
                          href={`/dashboard/engagements/${engagement.id}`}
                          className="link link-hover font-medium"
                        >
                          {engagement.student.name}
                        </Link>
                      </td>
                      <td>{subjectNames(engagement.engagementSubjects)}</td>
                      <td>{engagement.client.name}</td>
                      <td>{formatCents(engagement.hourlyRateCents)}/hr</td>
                      <td>
                        <span
                          className={`badge badge-sm ${
                            engagement.status === "active"
                              ? "badge-success badge-outline"
                              : "badge-ghost"
                          }`}
                        >
                          {engagement.status}
                        </span>
                      </td>
                      <td>{engagement.startedOn}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
