CREATE TABLE "test_execution_attempts" (
	"id" text PRIMARY KEY NOT NULL,
	"test_run_case_id" text NOT NULL,
	"attempt_number" integer NOT NULL,
	"status" varchar(20) NOT NULL,
	"actual_result" text,
	"duration_seconds" integer,
	"executed_by" text NOT NULL,
	"executed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "test_plan_cases" (
	"id" text PRIMARY KEY NOT NULL,
	"test_plan_id" text NOT NULL,
	"test_case_id" text NOT NULL,
	"added_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "test_plans" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"scope_notes" text,
	"target_release" varchar(100),
	"environment" varchar(50),
	"planned_start_date" timestamp with time zone,
	"due_date" timestamp with time zone,
	"owner_id" text,
	"status" varchar(20) DEFAULT 'draft' NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "test_run_cases" (
	"id" text PRIMARY KEY NOT NULL,
	"test_run_id" text NOT NULL,
	"test_case_id" text NOT NULL,
	"revision_number" integer NOT NULL,
	"snapshot_title" varchar(500) NOT NULL,
	"snapshot_description" text,
	"snapshot_preconditions" text,
	"snapshot_steps" jsonb NOT NULL,
	"snapshot_expected_result" text,
	"snapshot_priority" varchar(20) NOT NULL,
	"snapshot_module_name" varchar(255),
	"current_status" varchar(20) DEFAULT 'not_run' NOT NULL,
	"last_executed_at" timestamp with time zone,
	"last_executed_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "test_runs" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"test_plan_id" text,
	"name" varchar(255) NOT NULL,
	"environment" varchar(50) DEFAULT 'staging' NOT NULL,
	"build_version" varchar(100),
	"assigned_to" text,
	"status" varchar(20) DEFAULT 'not_started' NOT NULL,
	"notes" text,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "test_execution_attempts" ADD CONSTRAINT "test_execution_attempts_test_run_case_id_test_run_cases_id_fk" FOREIGN KEY ("test_run_case_id") REFERENCES "public"."test_run_cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_execution_attempts" ADD CONSTRAINT "test_execution_attempts_executed_by_users_id_fk" FOREIGN KEY ("executed_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_plan_cases" ADD CONSTRAINT "test_plan_cases_test_plan_id_test_plans_id_fk" FOREIGN KEY ("test_plan_id") REFERENCES "public"."test_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_plan_cases" ADD CONSTRAINT "test_plan_cases_test_case_id_test_cases_id_fk" FOREIGN KEY ("test_case_id") REFERENCES "public"."test_cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_plans" ADD CONSTRAINT "test_plans_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_plans" ADD CONSTRAINT "test_plans_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_plans" ADD CONSTRAINT "test_plans_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_run_cases" ADD CONSTRAINT "test_run_cases_test_run_id_test_runs_id_fk" FOREIGN KEY ("test_run_id") REFERENCES "public"."test_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_run_cases" ADD CONSTRAINT "test_run_cases_test_case_id_test_cases_id_fk" FOREIGN KEY ("test_case_id") REFERENCES "public"."test_cases"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_run_cases" ADD CONSTRAINT "test_run_cases_last_executed_by_users_id_fk" FOREIGN KEY ("last_executed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_runs" ADD CONSTRAINT "test_runs_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_runs" ADD CONSTRAINT "test_runs_test_plan_id_test_plans_id_fk" FOREIGN KEY ("test_plan_id") REFERENCES "public"."test_plans"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_runs" ADD CONSTRAINT "test_runs_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_runs" ADD CONSTRAINT "test_runs_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "test_execution_attempts_case_attempt_idx" ON "test_execution_attempts" USING btree ("test_run_case_id","attempt_number");--> statement-breakpoint
CREATE INDEX "test_execution_attempts_case_id_idx" ON "test_execution_attempts" USING btree ("test_run_case_id");--> statement-breakpoint
CREATE INDEX "test_execution_attempts_status_idx" ON "test_execution_attempts" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "test_plan_cases_plan_case_idx" ON "test_plan_cases" USING btree ("test_plan_id","test_case_id");--> statement-breakpoint
CREATE INDEX "test_plan_cases_plan_id_idx" ON "test_plan_cases" USING btree ("test_plan_id");--> statement-breakpoint
CREATE INDEX "test_plan_cases_case_id_idx" ON "test_plan_cases" USING btree ("test_case_id");--> statement-breakpoint
CREATE INDEX "test_plans_project_id_idx" ON "test_plans" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "test_plans_status_idx" ON "test_plans" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "test_run_cases_run_case_idx" ON "test_run_cases" USING btree ("test_run_id","test_case_id");--> statement-breakpoint
CREATE INDEX "test_run_cases_run_id_idx" ON "test_run_cases" USING btree ("test_run_id");--> statement-breakpoint
CREATE INDEX "test_run_cases_case_id_idx" ON "test_run_cases" USING btree ("test_case_id");--> statement-breakpoint
CREATE INDEX "test_run_cases_status_idx" ON "test_run_cases" USING btree ("current_status");--> statement-breakpoint
CREATE INDEX "test_runs_project_id_idx" ON "test_runs" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "test_runs_plan_id_idx" ON "test_runs" USING btree ("test_plan_id");--> statement-breakpoint
CREATE INDEX "test_runs_status_idx" ON "test_runs" USING btree ("status");