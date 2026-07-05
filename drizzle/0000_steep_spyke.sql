CREATE TYPE "public"."engagement_status" AS ENUM('active', 'ended');--> statement-breakpoint
CREATE TYPE "public"."invoice_status" AS ENUM('draft', 'sent', 'paid', 'void');--> statement-breakpoint
CREATE TYPE "public"."note_visibility" AS ENUM('private', 'shared');--> statement-breakpoint
CREATE TYPE "public"."package_unit" AS ENUM('hours', 'sessions');--> statement-breakpoint
CREATE TYPE "public"."session_mode" AS ENUM('online', 'in_person');--> statement-breakpoint
CREATE TYPE "public"."session_status" AS ENUM('scheduled', 'completed', 'cancelled_by_client', 'cancelled_by_tutor', 'no_show');--> statement-breakpoint
CREATE TABLE "attachments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid,
	"engagement_id" uuid,
	"filename" text NOT NULL,
	"path" text NOT NULL,
	"mime_type" text,
	"size_bytes" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "attachment_has_one_parent" CHECK (num_nonnulls("attachments"."session_id", "attachments"."engagement_id") = 1)
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" uuid NOT NULL,
	"data" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "clients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text,
	"phone" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "clients_students" (
	"client_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"relationship" text,
	CONSTRAINT "clients_students_client_id_student_id_pk" PRIMARY KEY("client_id","student_id")
);
--> statement-breakpoint
CREATE TABLE "engagements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"subject_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"hourly_rate_cents" integer NOT NULL,
	"status" "engagement_status" DEFAULT 'active' NOT NULL,
	"started_on" date DEFAULT now() NOT NULL,
	"ended_on" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoice_line_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoice_id" uuid NOT NULL,
	"session_id" uuid,
	"package_id" uuid,
	"description" text NOT NULL,
	"amount_cents" integer NOT NULL,
	CONSTRAINT "line_item_bills_one_thing" CHECK (num_nonnulls("invoice_line_items"."session_id", "invoice_line_items"."package_id") = 1)
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"number" integer GENERATED ALWAYS AS IDENTITY (sequence name "invoices_number_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"status" "invoice_status" DEFAULT 'draft' NOT NULL,
	"issued_on" date,
	"due_on" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "packages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"unit" "package_unit" NOT NULL,
	"quantity" numeric(6, 2) NOT NULL,
	"price_cents" integer NOT NULL,
	"purchased_at" timestamp with time zone DEFAULT now() NOT NULL,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoice_id" uuid NOT NULL,
	"amount_cents" integer NOT NULL,
	"method" text,
	"paid_at" timestamp with time zone DEFAULT now() NOT NULL,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "recurring_schedules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"engagement_id" uuid NOT NULL,
	"weekday" integer NOT NULL,
	"start_time" time NOT NULL,
	"duration_minutes" integer NOT NULL,
	"mode" "session_mode" DEFAULT 'online' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"starts_on" date NOT NULL,
	"ends_on" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"visibility" "note_visibility" DEFAULT 'private' NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"engagement_id" uuid NOT NULL,
	"recurring_schedule_id" uuid,
	"scheduled_at" timestamp with time zone NOT NULL,
	"duration_minutes" integer NOT NULL,
	"mode" "session_mode" DEFAULT 'online' NOT NULL,
	"status" "session_status" DEFAULT 'scheduled' NOT NULL,
	"billable" boolean DEFAULT true NOT NULL,
	"rate_cents" integer NOT NULL,
	"package_id" uuid,
	"cancelled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "students" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"name" text NOT NULL,
	"birthdate" date,
	"grade_level" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "students_userId_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "subjects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "subjects_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "tutors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"bio" text,
	"default_hourly_rate_cents" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tutors_userId_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "users_clients" (
	"user_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	CONSTRAINT "users_clients_user_id_client_id_pk" PRIMARY KEY("user_id","client_id")
);
--> statement-breakpoint
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_engagement_id_engagements_id_fk" FOREIGN KEY ("engagement_id") REFERENCES "public"."engagements"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clients_students" ADD CONSTRAINT "clients_students_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clients_students" ADD CONSTRAINT "clients_students_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "engagements" ADD CONSTRAINT "engagements_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "engagements" ADD CONSTRAINT "engagements_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "engagements" ADD CONSTRAINT "engagements_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_line_items" ADD CONSTRAINT "invoice_line_items_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_line_items" ADD CONSTRAINT "invoice_line_items_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_line_items" ADD CONSTRAINT "invoice_line_items_package_id_packages_id_fk" FOREIGN KEY ("package_id") REFERENCES "public"."packages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "packages" ADD CONSTRAINT "packages_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "packages" ADD CONSTRAINT "packages_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_schedules" ADD CONSTRAINT "recurring_schedules_engagement_id_engagements_id_fk" FOREIGN KEY ("engagement_id") REFERENCES "public"."engagements"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_notes" ADD CONSTRAINT "session_notes_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_engagement_id_engagements_id_fk" FOREIGN KEY ("engagement_id") REFERENCES "public"."engagements"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_recurring_schedule_id_recurring_schedules_id_fk" FOREIGN KEY ("recurring_schedule_id") REFERENCES "public"."recurring_schedules"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_package_id_packages_id_fk" FOREIGN KEY ("package_id") REFERENCES "public"."packages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "students" ADD CONSTRAINT "students_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tutors" ADD CONSTRAINT "tutors_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users_clients" ADD CONSTRAINT "users_clients_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users_clients" ADD CONSTRAINT "users_clients_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "engagements_student_id_index" ON "engagements" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "engagements_client_id_index" ON "engagements" USING btree ("client_id");--> statement-breakpoint
CREATE UNIQUE INDEX "invoice_line_items_session_id_index" ON "invoice_line_items" USING btree ("session_id");--> statement-breakpoint
CREATE UNIQUE INDEX "invoice_line_items_package_id_index" ON "invoice_line_items" USING btree ("package_id");--> statement-breakpoint
CREATE INDEX "invoices_client_id_index" ON "invoices" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "packages_student_id_index" ON "packages" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "sessions_engagement_id_index" ON "sessions" USING btree ("engagement_id");--> statement-breakpoint
CREATE INDEX "sessions_scheduled_at_index" ON "sessions" USING btree ("scheduled_at");--> statement-breakpoint
CREATE INDEX "sessions_package_id_index" ON "sessions" USING btree ("package_id");