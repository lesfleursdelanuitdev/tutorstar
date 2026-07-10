CREATE TYPE "public"."goal_status" AS ENUM('active', 'abandoned');--> statement-breakpoint
CREATE TABLE "assessment_series" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"subject_id" uuid,
	"name" text NOT NULL,
	"description" text,
	"visibility" "note_visibility" DEFAULT 'private' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assessments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"series_id" uuid NOT NULL,
	"session_id" uuid,
	"taken_on" date NOT NULL,
	"raw_score" numeric(6, 2) NOT NULL,
	"max_score" numeric(6, 2) NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "assessment_scores_sane" CHECK ("assessments"."raw_score" >= 0 AND "assessments"."max_score" > 0)
);
--> statement-breakpoint
CREATE TABLE "goal_steps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"goal_id" uuid NOT NULL,
	"title" text NOT NULL,
	"order_index" integer DEFAULT 0 NOT NULL,
	"completed_at" timestamp with time zone,
	"completed_in_session_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "step_session_implies_completed" CHECK ("goal_steps"."completed_in_session_id" IS NULL OR "goal_steps"."completed_at" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "goals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"subject_id" uuid,
	"title" text NOT NULL,
	"description" text,
	"target_date" date,
	"status" "goal_status" DEFAULT 'active' NOT NULL,
	"visibility" "note_visibility" DEFAULT 'private' NOT NULL,
	"order_index" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "progress_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"period_start" date NOT NULL,
	"period_end" date NOT NULL,
	"summary" text NOT NULL,
	"content" jsonb NOT NULL,
	"sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "report_period_ordered" CHECK ("progress_reports"."period_start" <= "progress_reports"."period_end")
);
--> statement-breakpoint
ALTER TABLE "assessment_series" ADD CONSTRAINT "assessment_series_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_series" ADD CONSTRAINT "assessment_series_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_series_id_assessment_series_id_fk" FOREIGN KEY ("series_id") REFERENCES "public"."assessment_series"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goal_steps" ADD CONSTRAINT "goal_steps_goal_id_goals_id_fk" FOREIGN KEY ("goal_id") REFERENCES "public"."goals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goal_steps" ADD CONSTRAINT "goal_steps_completed_in_session_id_sessions_id_fk" FOREIGN KEY ("completed_in_session_id") REFERENCES "public"."sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goals" ADD CONSTRAINT "goals_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goals" ADD CONSTRAINT "goals_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "progress_reports" ADD CONSTRAINT "progress_reports_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "assessment_series_student_id_index" ON "assessment_series" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "assessments_series_id_index" ON "assessments" USING btree ("series_id");--> statement-breakpoint
CREATE INDEX "assessments_session_id_index" ON "assessments" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "goal_steps_goal_id_index" ON "goal_steps" USING btree ("goal_id");--> statement-breakpoint
CREATE INDEX "goal_steps_completed_in_session_id_index" ON "goal_steps" USING btree ("completed_in_session_id");--> statement-breakpoint
CREATE INDEX "goals_student_id_index" ON "goals" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "progress_reports_student_id_index" ON "progress_reports" USING btree ("student_id");