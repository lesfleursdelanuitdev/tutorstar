import "dotenv/config";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "../src/db";
import {
  accounts,
  authSessions,
  tutors,
  users,
  verifications,
} from "../src/db/schema";

// Creates the initial tutor user + tutors row. The app's auth instance has
// public signup disabled, so this script uses its own instance with signup
// enabled — same database, same password hashing.
//
// Usage: npm run seed -- "Jane Doe" jane@example.com some-password

async function main() {
  const [name, email, password] = process.argv.slice(2);
  if (!name || !email || !password) {
    console.error('Usage: npm run seed -- "Full Name" email password');
    process.exit(1);
  }

  const existing = await db.select({ id: tutors.id }).from(tutors).limit(1);
  if (existing.length > 0) {
    console.error("A tutor already exists — nothing to seed.");
    process.exit(1);
  }

  const seedAuth = betterAuth({
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

  const result = await seedAuth.api.signUpEmail({
    body: { name, email, password },
  });

  await db.insert(tutors).values({ userId: result.user.id });

  console.log(`Tutor account created for ${email} (user ${result.user.id})`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
