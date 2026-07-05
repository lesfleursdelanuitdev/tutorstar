import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/db";
import {
  accounts,
  authSessions,
  users,
  verifications,
} from "@/db/schema";
import { resetPasswordEmail, sendEmail } from "@/lib/email";

export const auth = betterAuth({
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
  emailAndPassword: {
    enabled: true,
    // Invite-only app: accounts are provisioned by the tutor (see
    // scripts/seed.ts for the initial tutor account). Public signup stays off.
    disableSignUp: true,
    // Self-service recovery. Better Auth generates the token and reset URL; we
    // just deliver it. resetPasswordTokenExpiresIn defaults to 1 hour.
    sendResetPassword: async ({ user, url }) => {
      await sendEmail({ ...resetPasswordEmail(user.name, url), to: user.email });
    },
  },
  advanced: {
    database: {
      // Let Postgres generate UUIDs via the schema's defaultRandom().
      generateId: false,
    },
  },
});
