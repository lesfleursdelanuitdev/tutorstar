import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { accounts, authSessions, users, verifications } from "@/db/schema";

// A Better Auth instance with signup ENABLED, used only to provision logins
// for clients and students. The app's main `auth` keeps public signup off
// (invite-only), so provisioning happens here instead — same database, same
// password hashing, so a provisioned account logs in through the normal form.
const provisioningAuth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: users,
      session: authSessions,
      account: accounts,
      verification: verifications,
    },
  }),
  emailAndPassword: { enabled: true },
  advanced: { database: { generateId: false } },
});

// Better Auth's default minimum; surfaced to callers so they can validate
// before hitting the API and show a friendly message.
export const MIN_PASSWORD_LENGTH = 8;

export async function findUserByEmail(email: string) {
  const [row] = await db
    .select({ id: users.id, name: users.name })
    .from(users)
    .where(eq(users.email, email.toLowerCase()))
    .limit(1);
  return row ?? null;
}

// Create a login (a `users` row plus a hashed credential in `accounts`) and
// return the new user id. signUpEmail also opens a session for the new user;
// we discard it so the tutor's own session is untouched and no orphan session
// lingers. Throws if the email is already registered.
export async function createLogin(input: {
  name: string;
  email: string;
  password: string;
}): Promise<string> {
  const result = await provisioningAuth.api.signUpEmail({
    body: {
      name: input.name,
      email: input.email.toLowerCase(),
      password: input.password,
    },
  });
  await db.delete(authSessions).where(eq(authSessions.userId, result.user.id));
  return result.user.id;
}
