CREATE TABLE "engagement_subjects" (
	"engagement_id" uuid NOT NULL,
	"subject_id" uuid NOT NULL,
	CONSTRAINT "engagement_subjects_engagement_id_subject_id_pk" PRIMARY KEY("engagement_id","subject_id")
);
--> statement-breakpoint
ALTER TABLE "engagements" DROP CONSTRAINT "engagements_subject_id_subjects_id_fk";
--> statement-breakpoint
ALTER TABLE "engagement_subjects" ADD CONSTRAINT "engagement_subjects_engagement_id_engagements_id_fk" FOREIGN KEY ("engagement_id") REFERENCES "public"."engagements"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "engagement_subjects" ADD CONSTRAINT "engagement_subjects_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
-- Backfill (hand-written): every existing engagement keeps its single subject
-- as the first row of its new subject set.
INSERT INTO "engagement_subjects" ("engagement_id", "subject_id")
SELECT "id", "subject_id" FROM "engagements";--> statement-breakpoint
ALTER TABLE "engagements" DROP COLUMN "subject_id";