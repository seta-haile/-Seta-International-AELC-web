import {
  boolean,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

export interface GovernanceCompletenessCounts {
  dataGap: number;
  canonicalConflict: number;
  revisionGap: number;
  permanentRejection: number;
}

// Design note: the spec (7.1) does not pin down the sync job's window
// granularity for completeness, only that it exists "for the UI to know
// which windows are uncertain". This plan stores one row per organization —
// the latest known completeness status over a trailing window recomputed
// every tick (window length configurable, see CompletenessSyncService in
// Task 4) — rather than one row per (org, window), to avoid unbounded
// growth from a constantly-sliding window. Revisit if a future consumer
// needs historical completeness snapshots.
export const governanceCompleteness = pgTable(
  'governance_completeness',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id').notNull(),
    occurredFrom: timestamp('occurred_from').notNull(),
    occurredTo: timestamp('occurred_to').notNull(),
    complete: boolean('complete').notNull(),
    reasons: text('reasons').array().notNull().default([]),
    counts: jsonb('counts').$type<GovernanceCompletenessCounts>().notNull(),
    syncedAt: timestamp('synced_at').notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('governance_completeness_org_unique').on(table.organizationId),
  ],
);

export type GovernanceCompleteness = typeof governanceCompleteness.$inferSelect;
export type NewGovernanceCompleteness =
  typeof governanceCompleteness.$inferInsert;
