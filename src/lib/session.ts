import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { students, tutors, usersClients } from "@/db/schema";
import { auth } from "@/lib/auth";
import type { Role } from "@/lib/roles";

export const getSession = cache(async () => {
  return auth.api.getSession({ headers: await headers() });
});

// Roles are derived, not stored: see src/lib/roles.ts.
export const getRoles = cache(async (userId: string): Promise<Role[]> => {
  const [tutorRows, clientRows, studentRows] = await Promise.all([
    db
      .select({ id: tutors.id })
      .from(tutors)
      .where(eq(tutors.userId, userId))
      .limit(1),
    db
      .select({ clientId: usersClients.clientId })
      .from(usersClients)
      .where(eq(usersClients.userId, userId))
      .limit(1),
    db
      .select({ id: students.id })
      .from(students)
      .where(eq(students.userId, userId))
      .limit(1),
  ]);

  const roles: Role[] = [];
  if (tutorRows.length > 0) roles.push("tutor");
  if (clientRows.length > 0) roles.push("client");
  if (studentRows.length > 0) roles.push("student");
  return roles;
});

// For server components/actions under protected routes. The proxy only does
// an optimistic cookie check; this is the real enforcement.
export async function requireUser() {
  const session = await getSession();
  if (!session) redirect("/login");
  const roles = await getRoles(session.user.id);
  return { user: session.user, session: session.session, roles };
}

export async function requireRole(role: Role) {
  const current = await requireUser();
  if (!current.roles.includes(role)) redirect("/dashboard");
  return current;
}
