CREATE TABLE "modules" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"parent_module_id" text,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"name" varchar(255) NOT NULL,
	"key" varchar(16) NOT NULL,
	"description" text,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "modules" ADD CONSTRAINT "modules_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "modules_project_name_idx" ON "modules" USING btree ("project_id","name");--> statement-breakpoint
CREATE INDEX "modules_project_id_idx" ON "modules" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "modules_parent_module_idx" ON "modules" USING btree ("parent_module_id");--> statement-breakpoint
CREATE INDEX "modules_status_idx" ON "modules" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "projects_workspace_key_idx" ON "projects" USING btree ("workspace_id","key");--> statement-breakpoint
CREATE INDEX "projects_workspace_id_idx" ON "projects" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "projects_status_idx" ON "projects" USING btree ("status");