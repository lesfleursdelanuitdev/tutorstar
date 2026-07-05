import Link from "next/link";
import { Plus } from "lucide-react";
import { asc } from "drizzle-orm";
import { db } from "@/db";
import { clients } from "@/db/schema";
import { requireRole } from "@/lib/session";

export default async function ClientsPage() {
  await requireRole("tutor");
  const rows = await db.query.clients.findMany({
    orderBy: [asc(clients.name)],
    with: { clientsStudents: { with: { student: true } } },
  });

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Clients</h1>
        <Link href="/dashboard/clients/new" className="btn btn-primary btn-sm gap-2">
          <Plus className="size-4" /> New client
        </Link>
      </div>

      <div className="card bg-base-100 shadow-sm">
        <div className="card-body p-0">
          {rows.length === 0 ? (
            <p className="p-6 text-base-content/70">
              No clients yet. Clients are the people who pay for sessions —
              create your first one.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Students</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((client) => (
                    <tr key={client.id} className="hover">
                      <td>
                        <Link
                          href={`/dashboard/clients/${client.id}`}
                          className="link link-hover font-medium"
                        >
                          {client.name}
                        </Link>
                      </td>
                      <td>{client.email ?? "—"}</td>
                      <td>{client.phone ?? "—"}</td>
                      <td>
                        <div className="flex flex-wrap gap-1">
                          {client.clientsStudents.length === 0
                            ? "—"
                            : client.clientsStudents.map((link) => (
                                <span
                                  key={link.studentId}
                                  className="badge badge-ghost"
                                >
                                  {link.student.name}
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
