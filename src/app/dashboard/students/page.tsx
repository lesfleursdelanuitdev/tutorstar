import Link from "next/link";
import { Plus } from "lucide-react";
import { asc } from "drizzle-orm";
import { db } from "@/db";
import { students } from "@/db/schema";
import { requireRole } from "@/lib/session";

export default async function StudentsPage() {
  await requireRole("tutor");
  const rows = await db.query.students.findMany({
    orderBy: [asc(students.name)],
    with: { clientsStudents: { with: { client: true } } },
  });

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Students</h1>
        <Link
          href="/dashboard/students/new"
          className="btn btn-primary btn-sm gap-2"
        >
          <Plus className="size-4" /> New student
        </Link>
      </div>

      <div className="card bg-base-100 shadow-sm">
        <div className="card-body p-0">
          {rows.length === 0 ? (
            <p className="p-6 text-base-content/70">
              No students yet. Students are the people you teach — create your
              first one.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Grade</th>
                    <th>Clients</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((student) => (
                    <tr key={student.id} className="hover">
                      <td>
                        <Link
                          href={`/dashboard/students/${student.id}`}
                          className="link link-hover font-medium"
                        >
                          {student.name}
                        </Link>
                      </td>
                      <td>{student.gradeLevel ?? "—"}</td>
                      <td>
                        <div className="flex flex-wrap gap-1">
                          {student.clientsStudents.length === 0
                            ? "—"
                            : student.clientsStudents.map((link) => (
                                <span
                                  key={link.clientId}
                                  className="badge badge-ghost"
                                >
                                  {link.client.name}
                                </span>
                              ))}
                        </div>
                      </td>
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
