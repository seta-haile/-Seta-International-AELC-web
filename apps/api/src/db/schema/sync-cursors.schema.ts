import {
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import type { EntityType } from './entity-type.js';

export const syncCursors = pgTable(
  'sync_cursors',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id').notNull(),
    entityType: text('entity_type').$type<EntityType>().notNull(),
    cursor: text('cursor'),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('sync_cursors_org_entity_type_unique').on(
      table.organizationId,
      table.entityType,
    ),
  ],
);

export type SyncCursor = typeof syncCursors.$inferSelect;
export type NewSyncCursor = typeof syncCursors.$inferInsert;
