import "dotenv/config";
import { hashPassword } from "better-auth/crypto";
import { and, eq } from "drizzle-orm";
import { db } from "../src/db";
import { accounts, authSessions, users } from "../src/db/schema";

// Local dev helper: set a new password for any user with an email/password
// account. Uses the same hashing as Better Auth — no email required.
//
// Usage: npm run reset-password -- email new-password

async function main() {
  const [email, password] = process.argv.slice(2);
  if (!email || !password) {
    console.error("Usage: npm run reset-password -- email new-password");
    process.exit(1);
  }

  const user = await db.query.users.findFirst({
    where: eq(users.email, email),
    columns: { id: true, name: true, email: true },
  });
  if (!user) {
    console.error(`No user found for ${email}`);
    process.exit(1);
  }

  const credential = await db.query.accounts.findFirst({
    where: and(
      eq(accounts.userId, user.id),
      eq(accounts.providerId, "credential"),
    ),
    columns: { id: true },
  });
  if (!credential) {
    console.error(`${email} has no email/password credential to update.`);
    process.exit(1);
  }

  const hashed = await hashPassword(password);
  await db
    .update(accounts)
    .set({ password: hashed, updatedAt: new Date() })
    .where(eq(accounts.id, credential.id));

  // Force re-login so old sessions don't linger after a manual reset.
  await db.delete(authSessions).where(eq(authSessions.userId, user.id));

  console.log(`Password updated for ${user.name} (${user.email})`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
