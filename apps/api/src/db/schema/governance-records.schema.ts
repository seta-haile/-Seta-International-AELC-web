import {
  boolean,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import type { EntityType } from './entity-type.js';

// Central keys facts differently depending on entity type: for
// usage/activity/relation, scope_installation_id is always NULL and the row
// is unique on (organization_id, entity_type, entity_id); for
// attribution_link, scope_installation_id is NOT NULL and the row is unique
// on (organization_id, scope_installation_id, entity_type, entity_id) — so
// central can legitimately hold multiple attribution_link rows for the same
// (org, entity_type, entity_id), one per installation.
//
// Postgres does NOT collapse multiple NULLs in a plain multi-column UNIQUE
// index — each NULL there is distinct from every other NULL — so a raw
// unique index on (organization_id, entity_type, entity_id,
// scope_installation_id) would silently allow duplicate rows for the
// NULL-scope entity types (usage/activity/relation) and break the
// onConflictDoUpdate upsert's conflict target for them. scopeInstallationKey
// is a STORED generated column that normalizes NULL to a fixed sentinel
// UUID, so the plain unique index below always sees a real, comparable
// value: NULL-scope rows still correctly collide with each other (as
// before), while distinct installations of the same (org, entity_type,
// entity_id) attribution_link stay apart. This also keeps the column a real
// PgColumn, which drizzle-orm's onConflictDoUpdate `target` requires (it
// cannot target a raw SQL/COALESCE expression directly — see
// records-sync.service.ts).
const NULL_SCOPE_INSTALLATION_SENTINEL = '00000000-0000-0000-0000-000000000000';

export const governanceRecords = pgTable(
  'governance_records',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id').notNull(),
    scopeInstallationId: uuid('scope_installation_id'),
    entityType: text('entity_type').$type<EntityType>().notNull(),
    entityId: text('entity_id').notNull(),
    latestRevision: integer('latest_revision').notNull(),
    isTombstone: boolean('is_tombstone').notNull().default(false),
    occurredAt: timestamp('occurred_at').notNull(),
    payload: jsonb('payload').$type<Record<string, unknown> | null>(),
    syncedAt: timestamp('synced_at').notNull().defaultNow(),
    scopeInstallationKey: uuid('scope_installation_key')
      .notNull()
      .generatedAlwaysAs(
        sql`coalesce(scope_installation_id, '${sql.raw(NULL_SCOPE_INSTALLATION_SENTINEL)}'::uuid)`,
      ),
  },
  (table) => [
    uniqueIndex('governance_records_org_entity_scope_unique').on(
      table.organizationId,
      table.entityType,
      table.entityId,
      table.scopeInstallationKey,
    ),
  ],
);

export type GovernanceRecord = typeof governanceRecords.$inferSelect;
export type NewGovernanceRecord = typeof governanceRecords.$inferInsert;
