DROP INDEX "governance_records_org_entity_unique";--> statement-breakpoint
ALTER TABLE "governance_records" ADD COLUMN "scope_installation_id" uuid;--> statement-breakpoint
ALTER TABLE "governance_records" ADD COLUMN "scope_installation_key" uuid GENERATED ALWAYS AS (coalesce(scope_installation_id, '00000000-0000-0000-0000-000000000000'::uuid)) STORED NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "governance_records_org_entity_scope_unique" ON "governance_records" USING btree ("organization_id","entity_type","entity_id","scope_installation_key");