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
import type { EntityType } from './entity-type.js';

export const governanceRecords = pgTable(
  'governance_records',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id').notNull(),
    entityType: text('entity_type').$type<EntityType>().notNull(),
    entityId: text('entity_id').notNull(),
    latestRevision: integer('latest_revision').notNull(),
    isTombstone: boolean('is_tombstone').notNull().default(false),
    occurredAt: timestamp('occurred_at').notNull(),
    payload: jsonb('payload').$type<Record<string, unknown> | null>(),
    syncedAt: timestamp('synced_at').notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('governance_records_org_entity_unique').on(
      table.organizationId,
      table.entityType,
      table.entityId,
    ),
  ],
);

export type GovernanceRecord = typeof governanceRecords.$inferSelect;
export type NewGovernanceRecord = typeof governanceRecords.$inferInsert;
