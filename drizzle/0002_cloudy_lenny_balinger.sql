CREATE TABLE "package_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"subject_id" uuid,
	"unit" "package_unit" NOT NULL,
	"quantity" numeric(6, 2) NOT NULL,
	"price_cents" integer NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "packages" ADD COLUMN "template_id" uuid;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "paid_by_user_id" uuid;--> statement-breakpoint
ALTER TABLE "package_templates" ADD CONSTRAINT "package_templates_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "packages" ADD CONSTRAINT "packages_template_id_package_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."package_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_paid_by_user_id_users_id_fk" FOREIGN KEY ("paid_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;