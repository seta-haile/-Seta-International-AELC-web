CREATE TABLE "governance_completeness" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"occurred_from" timestamp NOT NULL,
	"occurred_to" timestamp NOT NULL,
	"complete" boolean NOT NULL,
	"reasons" text[] DEFAULT '{}' NOT NULL,
	"counts" jsonb NOT NULL,
	"synced_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "governance_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"latest_revision" integer NOT NULL,
	"is_tombstone" boolean DEFAULT false NOT NULL,
	"occurred_at" timestamp NOT NULL,
	"payload" jsonb,
	"synced_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sync_cursors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"entity_type" text NOT NULL,
	"cursor" text,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "governance_completeness_org_unique" ON "governance_completeness" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "governance_records_org_entity_unique" ON "governance_records" USING btree ("organization_id","entity_type","entity_id");--> statement-breakpoint
CREATE UNIQUE INDEX "sync_cursors_org_entity_type_unique" ON "sync_cursors" USING btree ("organization_id","entity_type");