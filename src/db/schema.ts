import { relations, sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  time,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const sessionStatusEnum = pgEnum("session_status", [
  "scheduled",
  "completed",
  "cancelled_by_client",
  "cancelled_by_tutor",
  "no_show",
]);

export const sessionModeEnum = pgEnum("session_mode", ["online", "in_person"]);

export const noteVisibilityEnum = pgEnum("note_visibility", [
  "private",
  "shared",
]);

export const engagementStatusEnum = pgEnum("engagement_status", [
  "active",
  "ended",
]);

export const packageUnitEnum = pgEnum("package_unit", ["hours", "sessions"]);

export const invoiceStatusEnum = pgEnum("invoice_status", [
  "draft",
  "sent",
  "paid",
  "void",
]);

// ---------------------------------------------------------------------------
// Identity
//
// Roles (tutor | client | student) are not stored: a user holds a role iff a
// row in tutors/clients/students links to them. See src/lib/roles.ts.
// ---------------------------------------------------------------------------

export const users = pgTable("users", {
  id: uuid().primaryKey().defaultRandom(),
  email: text().notNull().unique(),
  name: text().notNull(),
  // Managed by Better Auth.
  emailVerified: boolean().notNull().default(false),
  image: text(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Auth (tables owned by Better Auth; "sessions" was taken by tutoring
// sessions, hence auth_sessions)
// ---------------------------------------------------------------------------

export const authSessions = pgTable("auth_sessions", {
  id: uuid().primaryKey().defaultRandom(),
  userId: uuid()
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  token: text().notNull().unique(),
  expiresAt: timestamp({ withTimezone: true }).notNull(),
  ipAddress: text(),
  userAgent: text(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

// Credential and (future) OAuth identities. Email/password lives here as
// providerId "credential"; adding Google later inserts providerId "google"
// rows — no schema change needed.
export const accounts = pgTable("accounts", {
  id: uuid().primaryKey().defaultRandom(),
  userId: uuid()
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  accountId: text().notNull(),
  providerId: text().notNull(),
  accessToken: text(),
  refreshToken: text(),
  idToken: text(),
  accessTokenExpiresAt: timestamp({ withTimezone: true }),
  refreshTokenExpiresAt: timestamp({ withTimezone: true }),
  scope: text(),
  password: text(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

// Short-lived tokens (password reset, email verification, invites).
export const verifications = pgTable("verifications", {
  id: uuid().primaryKey().defaultRandom(),
  identifier: text().notNull(),
  value: text().notNull(),
  expiresAt: timestamp({ withTimezone: true }).notNull(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

// Single-tutor app: this table holds exactly one row, but keeps tutor-specific
// data out of `users` and leaves the door open for multi-tutor later.
export const tutors = pgTable("tutors", {
  id: uuid().primaryKey().defaultRandom(),
  userId: uuid()
    .notNull()
    .unique()
    .references(() => users.id),
  bio: text(),
  defaultHourlyRateCents: integer(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

// A client is a payer. May exist without a login (users_clients junction:
// e.g. two parents each with their own login operating one client record).
export const clients = pgTable("clients", {
  id: uuid().primaryKey().defaultRandom(),
  name: text().notNull(),
  email: text(),
  phone: text(),
  notes: text(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

// A student is a learner. May exist without a login (young kids).
export const students = pgTable("students", {
  id: uuid().primaryKey().defaultRandom(),
  userId: uuid()
    .unique()
    .references(() => users.id),
  name: text().notNull(),
  birthdate: date(),
  gradeLevel: text(),
  notes: text(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

export const usersClients = pgTable(
  "users_clients",
  {
    userId: uuid()
      .notNull()
      .references(() => users.id),
    clientId: uuid()
      .notNull()
      .references(() => clients.id),
  },
  (t) => [primaryKey({ columns: [t.userId, t.clientId] })],
);

// Portal visibility backbone: a client sees a student's schedule and shared
// notes because they are linked to the student here, independent of which
// client paid for a given engagement.
export const clientsStudents = pgTable(
  "clients_students",
  {
    clientId: uuid()
      .notNull()
      .references(() => clients.id),
    studentId: uuid()
      .notNull()
      .references(() => students.id),
    relationship: text(), // e.g. "mother", "guardian"
  },
  (t) => [primaryKey({ columns: [t.clientId, t.studentId] })],
);

// ---------------------------------------------------------------------------
// Teaching
// ---------------------------------------------------------------------------

export const subjects = pgTable("subjects", {
  id: uuid().primaryKey().defaultRandom(),
  name: text().notNull().unique(),
});

// The hub of the model: student + subject + paying client + current rate.
// Sessions belong to an engagement. The tutor is implied (single-tutor app).
export const engagements = pgTable(
  "engagements",
  {
    id: uuid().primaryKey().defaultRandom(),
    studentId: uuid()
      .notNull()
      .references(() => students.id),
    subjectId: uuid()
      .notNull()
      .references(() => subjects.id),
    clientId: uuid()
      .notNull()
      .references(() => clients.id),
    // Current rate; each session snapshots this at creation time, so changing
    // it never rewrites history.
    hourlyRateCents: integer().notNull(),
    status: engagementStatusEnum().notNull().default("active"),
    startedOn: date().notNull().defaultNow(),
    endedOn: date(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index().on(t.studentId), index().on(t.clientId)],
);

// A weekly slot ("Tuesdays 16:00 for 60min") that session rows are generated
// from. Sessions keep a link back so the whole series can be edited.
export const recurringSchedules = pgTable("recurring_schedules", {
  id: uuid().primaryKey().defaultRandom(),
  engagementId: uuid()
    .notNull()
    .references(() => engagements.id),
  weekday: integer().notNull(), // 0 = Sunday … 6 = Saturday
  startTime: time().notNull(),
  durationMinutes: integer().notNull(),
  mode: sessionModeEnum().notNull().default("online"),
  active: boolean().notNull().default(true),
  startsOn: date().notNull(),
  endsOn: date(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

export const sessions = pgTable(
  "sessions",
  {
    id: uuid().primaryKey().defaultRandom(),
    engagementId: uuid()
      .notNull()
      .references(() => engagements.id),
    recurringScheduleId: uuid().references(() => recurringSchedules.id),
    scheduledAt: timestamp({ withTimezone: true }).notNull(),
    durationMinutes: integer().notNull(),
    mode: sessionModeEnum().notNull().default("online"),
    status: sessionStatusEnum().notNull().default("scheduled"),
    // Whether a terminal session is chargeable. Defaults follow policy
    // (completed/no_show charge, tutor cancellations don't) but the tutor can
    // override per session — policies always have exceptions.
    billable: boolean().notNull().default(true),
    // Snapshot of the engagement's rate at creation; invoices bill from this.
    rateCents: integer().notNull(),
    // Set → this session draws down the package; null → invoiceable.
    packageId: uuid().references(() => packages.id),
    cancelledAt: timestamp({ withTimezone: true }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index().on(t.engagementId),
    index().on(t.scheduledAt),
    index().on(t.packageId),
  ],
);

export const sessionNotes = pgTable("session_notes", {
  id: uuid().primaryKey().defaultRandom(),
  sessionId: uuid()
    .notNull()
    .references(() => sessions.id),
  visibility: noteVisibilityEnum().notNull().default("private"),
  body: text().notNull(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Money
// ---------------------------------------------------------------------------

// The catalog: a package the tutor *offers* for sale (e.g. "10-session Math
// block, $500"). Purchasing one instantiates a `packages` row. Editing or
// deactivating a template never touches already-sold packages.
export const packageTemplates = pgTable("package_templates", {
  id: uuid().primaryKey().defaultRandom(),
  name: text().notNull(),
  // Optional: scope an offering to one subject, or leave null for any subject.
  subjectId: uuid().references(() => subjects.id),
  unit: packageUnitEnum().notNull(),
  quantity: numeric({ precision: 6, scale: 2 }).notNull(),
  priceCents: integer().notNull(),
  active: boolean().notNull().default(true),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

// A prepaid block bought for one student (beneficiary) by one client (payer),
// usable across any of the student's engagements. Balance is always derived:
// quantity minus what linked sessions have consumed — never stored.
export const packages = pgTable(
  "packages",
  {
    id: uuid().primaryKey().defaultRandom(),
    studentId: uuid()
      .notNull()
      .references(() => students.id),
    clientId: uuid()
      .notNull()
      .references(() => clients.id),
    // The offering this was sold from, if any. Unit/quantity/price are still
    // snapshotted below so editing the template never rewrites a sale.
    templateId: uuid().references(() => packageTemplates.id),
    unit: packageUnitEnum().notNull(),
    // "10 sessions" or "12.5 hours"; hours sessions draw durationMinutes/60.
    quantity: numeric({ precision: 6, scale: 2 }).notNull(),
    priceCents: integer().notNull(),
    purchasedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    notes: text(),
  },
  (t) => [index().on(t.studentId)],
);

export const invoices = pgTable(
  "invoices",
  {
    id: uuid().primaryKey().defaultRandom(),
    clientId: uuid()
      .notNull()
      .references(() => clients.id),
    number: integer().notNull().generatedAlwaysAsIdentity(),
    status: invoiceStatusEnum().notNull().default("draft"),
    issuedOn: date(),
    dueOn: date(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index().on(t.clientId)],
);

// A line item bills exactly one of: a session (pay-as-you-go) or a package
// purchase. The unique constraints make double-billing impossible at the
// database level.
export const invoiceLineItems = pgTable(
  "invoice_line_items",
  {
    id: uuid().primaryKey().defaultRandom(),
    invoiceId: uuid()
      .notNull()
      .references(() => invoices.id),
    sessionId: uuid().references(() => sessions.id),
    packageId: uuid().references(() => packages.id),
    description: text().notNull(),
    amountCents: integer().notNull(),
  },
  (t) => [
    uniqueIndex().on(t.sessionId),
    uniqueIndex().on(t.packageId),
    check(
      "line_item_bills_one_thing",
      sql`num_nonnulls(${t.sessionId}, ${t.packageId}) = 1`,
    ),
  ],
);

export const payments = pgTable("payments", {
  id: uuid().primaryKey().defaultRandom(),
  invoiceId: uuid()
    .notNull()
    .references(() => invoices.id),
  amountCents: integer().notNull(),
  method: text(), // "cash", "zelle", …  free-form until a gateway exists
  // Which login actually paid. Only meaningful when a client has more than one
  // linked user (e.g. two parents sharing one client record); null otherwise.
  paidByUserId: uuid().references(() => users.id),
  paidAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  notes: text(),
});

// ---------------------------------------------------------------------------
// Supporting
// ---------------------------------------------------------------------------

export const attachments = pgTable(
  "attachments",
  {
    id: uuid().primaryKey().defaultRandom(),
    sessionId: uuid().references(() => sessions.id),
    engagementId: uuid().references(() => engagements.id),
    filename: text().notNull(),
    // Storage location (local path or object-store URL); backend TBD.
    path: text().notNull(),
    mimeType: text(),
    sizeBytes: integer(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check(
      "attachment_has_one_parent",
      sql`num_nonnulls(${t.sessionId}, ${t.engagementId}) = 1`,
    ),
  ],
);

export const auditLog = pgTable("audit_log", {
  id: uuid().primaryKey().defaultRandom(),
  userId: uuid().references(() => users.id),
  action: text().notNull(), // e.g. "session.cancelled", "invoice.sent"
  entityType: text().notNull(),
  entityId: uuid().notNull(),
  data: jsonb(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Relations (for the db.query relational API)
// ---------------------------------------------------------------------------

export const usersRelations = relations(users, ({ one, many }) => ({
  tutor: one(tutors, { fields: [users.id], references: [tutors.userId] }),
  student: one(students, {
    fields: [users.id],
    references: [students.userId],
  }),
  usersClients: many(usersClients),
}));

export const tutorsRelations = relations(tutors, ({ one }) => ({
  user: one(users, { fields: [tutors.userId], references: [users.id] }),
}));

export const clientsRelations = relations(clients, ({ many }) => ({
  usersClients: many(usersClients),
  clientsStudents: many(clientsStudents),
  engagements: many(engagements),
  packages: many(packages),
  invoices: many(invoices),
}));

export const studentsRelations = relations(students, ({ one, many }) => ({
  user: one(users, { fields: [students.userId], references: [users.id] }),
  clientsStudents: many(clientsStudents),
  engagements: many(engagements),
  packages: many(packages),
}));

export const usersClientsRelations = relations(usersClients, ({ one }) => ({
  user: one(users, { fields: [usersClients.userId], references: [users.id] }),
  client: one(clients, {
    fields: [usersClients.clientId],
    references: [clients.id],
  }),
}));

export const clientsStudentsRelations = relations(
  clientsStudents,
  ({ one }) => ({
    client: one(clients, {
      fields: [clientsStudents.clientId],
      references: [clients.id],
    }),
    student: one(students, {
      fields: [clientsStudents.studentId],
      references: [students.id],
    }),
  }),
);

export const subjectsRelations = relations(subjects, ({ many }) => ({
  engagements: many(engagements),
  packageTemplates: many(packageTemplates),
}));

export const packageTemplatesRelations = relations(
  packageTemplates,
  ({ one, many }) => ({
    subject: one(subjects, {
      fields: [packageTemplates.subjectId],
      references: [subjects.id],
    }),
    packages: many(packages),
  }),
);

export const engagementsRelations = relations(engagements, ({ one, many }) => ({
  student: one(students, {
    fields: [engagements.studentId],
    references: [students.id],
  }),
  subject: one(subjects, {
    fields: [engagements.subjectId],
    references: [subjects.id],
  }),
  client: one(clients, {
    fields: [engagements.clientId],
    references: [clients.id],
  }),
  recurringSchedules: many(recurringSchedules),
  sessions: many(sessions),
  attachments: many(attachments),
}));

export const recurringSchedulesRelations = relations(
  recurringSchedules,
  ({ one, many }) => ({
    engagement: one(engagements, {
      fields: [recurringSchedules.engagementId],
      references: [engagements.id],
    }),
    sessions: many(sessions),
  }),
);

export const sessionsRelations = relations(sessions, ({ one, many }) => ({
  engagement: one(engagements, {
    fields: [sessions.engagementId],
    references: [engagements.id],
  }),
  recurringSchedule: one(recurringSchedules, {
    fields: [sessions.recurringScheduleId],
    references: [recurringSchedules.id],
  }),
  package: one(packages, {
    fields: [sessions.packageId],
    references: [packages.id],
  }),
  notes: many(sessionNotes),
  attachments: many(attachments),
  lineItem: one(invoiceLineItems, {
    fields: [sessions.id],
    references: [invoiceLineItems.sessionId],
  }),
}));

export const sessionNotesRelations = relations(sessionNotes, ({ one }) => ({
  session: one(sessions, {
    fields: [sessionNotes.sessionId],
    references: [sessions.id],
  }),
}));

export const packagesRelations = relations(packages, ({ one, many }) => ({
  student: one(students, {
    fields: [packages.studentId],
    references: [students.id],
  }),
  client: one(clients, {
    fields: [packages.clientId],
    references: [clients.id],
  }),
  template: one(packageTemplates, {
    fields: [packages.templateId],
    references: [packageTemplates.id],
  }),
  sessions: many(sessions),
  lineItem: one(invoiceLineItems, {
    fields: [packages.id],
    references: [invoiceLineItems.packageId],
  }),
}));

export const invoicesRelations = relations(invoices, ({ one, many }) => ({
  client: one(clients, {
    fields: [invoices.clientId],
    references: [clients.id],
  }),
  lineItems: many(invoiceLineItems),
  payments: many(payments),
}));

export const invoiceLineItemsRelations = relations(
  invoiceLineItems,
  ({ one }) => ({
    invoice: one(invoices, {
      fields: [invoiceLineItems.invoiceId],
      references: [invoices.id],
    }),
    session: one(sessions, {
      fields: [invoiceLineItems.sessionId],
      references: [sessions.id],
    }),
    package: one(packages, {
      fields: [invoiceLineItems.packageId],
      references: [packages.id],
    }),
  }),
);

export const paymentsRelations = relations(payments, ({ one }) => ({
  invoice: one(invoices, {
    fields: [payments.invoiceId],
    references: [invoices.id],
  }),
  paidByUser: one(users, {
    fields: [payments.paidByUserId],
    references: [users.id],
  }),
}));

export const attachmentsRelations = relations(attachments, ({ one }) => ({
  session: one(sessions, {
    fields: [attachments.sessionId],
    references: [sessions.id],
  }),
  engagement: one(engagements, {
    fields: [attachments.engagementId],
    references: [engagements.id],
  }),
}));

export const auditLogRelations = relations(auditLog, ({ one }) => ({
  user: one(users, { fields: [auditLog.userId], references: [users.id] }),
}));
