"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { clients, usersClients } from "@/db/schema";
import { formString, isEmail, isUuid } from "@/lib/forms";
import {
  MIN_PASSWORD_LENGTH,
  createLogin,
  findUserByEmail,
} from "@/lib/provision";
import { requireRole } from "@/lib/session";

export async function createClientAction(formData: FormData) {
  await requireRole("tutor");
  const name = formString(formData, "name");
  if (!name) {
    redirect(`/dashboard/clients/new?error=${encodeURIComponent("Name is required.")}`);
  }

  const [row] = await db
    .insert(clients)
    .values({
      name,
      email: formString(formData, "email"),
      phone: formString(formData, "phone"),
      notes: formString(formData, "notes"),
    })
    .returning({ id: clients.id });

  revalidatePath("/dashboard/clients");
  redirect(`/dashboard/clients/${row.id}`);
}

export async function updateClientAction(clientId: string, formData: FormData) {
  await requireRole("tutor");
  const name = formString(formData, "name");
  if (!name) {
    redirect(`/dashboard/clients/${clientId}?error=${encodeURIComponent("Name is required.")}`);
  }

  await db
    .update(clients)
    .set({
      name,
      email: formString(formData, "email"),
      phone: formString(formData, "phone"),
      notes: formString(formData, "notes"),
      updatedAt: new Date(),
    })
    .where(eq(clients.id, clientId));

  revalidatePath("/dashboard/clients");
  revalidatePath(`/dashboard/clients/${clientId}`);
  redirect(`/dashboard/clients/${clientId}?saved=1`);
}

// Give a client a portal login. Two parents sharing one client each get their
// own login through this action (call it twice). If the email already has a
// login (e.g. the parent logs in for another student, or the client is also a
// student), we link that existing user instead of creating a duplicate — in
// which case name/password are ignored.
export async function addClientLoginAction(
  clientId: string,
  formData: FormData,
) {
  await requireRole("tutor");
  const here = `/dashboard/clients/${clientId}`;
  function fail(message: string): never {
    redirect(`${here}?error=${encodeURIComponent(message)}`);
  }

  if (!isUuid(clientId)) redirect("/dashboard/clients");

  const email = formString(formData, "email");
  if (!isEmail(email)) fail("Enter a valid email address.");

  let userId: string;
  const existing = await findUserByEmail(email);
  if (existing) {
    userId = existing.id;
  } else {
    const name = formString(formData, "name");
    if (!name) fail("Enter the person's name.");
    const password = formString(formData, "password");
    if (!password || password.length < MIN_PASSWORD_LENGTH) {
      fail(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
    }
    try {
      userId = await createLogin({ name, email, password });
    } catch {
      // Almost always a race where the email was just registered elsewhere.
      const raced = await findUserByEmail(email);
      if (!raced) fail("Could not create that login. Try again.");
      userId = raced.id;
    }
  }

  await db
    .insert(usersClients)
    .values({ userId, clientId })
    .onConflictDoNothing();

  revalidatePath(here);
  redirect(`${here}?saved=1`);
}

export async function removeClientLoginAction(
  clientId: string,
  formData: FormData,
) {
  await requireRole("tutor");
  const userId = formString(formData, "userId");
  const here = `/dashboard/clients/${clientId}`;
  if (!isUuid(clientId) || !isUuid(userId)) redirect(here);

  // Unlinks the login from this client; the user account itself is left intact
  // (they may still be a login on another client or a student).
  await db
    .delete(usersClients)
    .where(
      and(
        eq(usersClients.clientId, clientId),
        eq(usersClients.userId, userId),
      ),
    );

  revalidatePath(here);
  redirect(`${here}?saved=1`);
}
