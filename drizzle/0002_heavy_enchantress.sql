CREATE TABLE "test_case_revisions" (
	"id" text PRIMARY KEY NOT NULL,
	"test_case_id" text NOT NULL,
	"revision_number" integer NOT NULL,
	"title" varchar(500) NOT NULL,
	"description" text,
	"preconditions" text,
	"expected_result" text,
	"steps_snapshot" jsonb NOT NULL,
	"change_summary" text,
	"changed_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "test_case_steps" (
	"id" text PRIMARY KEY NOT NULL,
	"test_case_id" text NOT NULL,
	"step_number" integer NOT NULL,
	"instruction" text NOT NULL,
	"expected_result" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "test_cases" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"module_id" text,
	"stable_id" varchar(32) NOT NULL,
	"sequence_number" integer NOT NULL,
	"title" varchar(500) NOT NULL,
	"description" text,
	"preconditions" text,
	"expected_result" text,
	"priority" varchar(20) DEFAULT 'medium' NOT NULL,
	"lifecycle" varchar(20) DEFAULT 'draft' NOT NULL,
	"test_types" text[] DEFAULT '{}' NOT NULL,
	"tags" text[] DEFAULT '{}' NOT NULL,
	"owner_id" text,
	"revision" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "test_case_revisions" ADD CONSTRAINT "test_case_revisions_test_case_id_test_cases_id_fk" FOREIGN KEY ("test_case_id") REFERENCES "public"."test_cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_case_revisions" ADD CONSTRAINT "test_case_revisions_changed_by_users_id_fk" FOREIGN KEY ("changed_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_case_steps" ADD CONSTRAINT "test_case_steps_test_case_id_test_cases_id_fk" FOREIGN KEY ("test_case_id") REFERENCES "public"."test_cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_cases" ADD CONSTRAINT "test_cases_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_cases" ADD CONSTRAINT "test_cases_module_id_modules_id_fk" FOREIGN KEY ("module_id") REFERENCES "public"."modules"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_cases" ADD CONSTRAINT "test_cases_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_cases" ADD CONSTRAINT "test_cases_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_cases" ADD CONSTRAINT "test_cases_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "test_case_revisions_case_rev_idx" ON "test_case_revisions" USING btree ("test_case_id","revision_number");--> statement-breakpoint
CREATE INDEX "test_case_revisions_case_id_idx" ON "test_case_revisions" USING btree ("test_case_id");--> statement-breakpoint
CREATE UNIQUE INDEX "test_case_steps_case_order_idx" ON "test_case_steps" USING btree ("test_case_id","step_number");--> statement-breakpoint
CREATE INDEX "test_case_steps_case_id_idx" ON "test_case_steps" USING btree ("test_case_id");--> statement-breakpoint
CREATE UNIQUE INDEX "test_cases_project_stable_id_idx" ON "test_cases" USING btree ("project_id","stable_id");--> statement-breakpoint
CREATE UNIQUE INDEX "test_cases_project_sequence_idx" ON "test_cases" USING btree ("project_id","sequence_number");--> statement-breakpoint
CREATE INDEX "test_cases_project_id_idx" ON "test_cases" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "test_cases_module_id_idx" ON "test_cases" USING btree ("module_id");--> statement-breakpoint
CREATE INDEX "test_cases_lifecycle_idx" ON "test_cases" USING btree ("lifecycle");--> statement-breakpoint
CREATE INDEX "test_cases_priority_idx" ON "test_cases" USING btree ("priority");