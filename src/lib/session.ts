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

// Where a user belongs after login: tutors run the admin dashboard, everyone
// else (clients, students, and the not-yet-linked) lives in the portal. The
// portal renders a friendly empty state for a user with no roles, so it's a
// safe catch-all that never bounces back into a redirect loop.
export function homePath(roles: Role[]): string {
  return roles.includes("tutor") ? "/dashboard" : "/portal";
}

export async function requireRole(role: Role) {
  const current = await requireUser();
  if (!current.roles.includes(role)) redirect(homePath(current.roles));
  return current;
}

// Gate for the client/student portal. Any logged-in non-tutor is welcome
// (including unlinked accounts, which see an empty state). A pure tutor is
// sent to their own dashboard; a tutor who is also a client/student may stay.
export async function requirePortalUser() {
  const current = await requireUser();
  const isPortalUser =
    current.roles.includes("client") || current.roles.includes("student");
  if (current.roles.includes("tutor") && !isPortalUser) redirect("/dashboard");
  return current;
}
