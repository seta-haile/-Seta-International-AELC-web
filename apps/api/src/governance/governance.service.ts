import { Inject, Injectable } from '@nestjs/common';
import { DRIZZLE } from '../db/db.constants.js';
import type { DrizzleDb } from '../db/db.types.js';
import {
  governanceCompleteness,
  governanceRecords,
  type EntityType,
  type GovernanceCompletenessCounts,
} from '../db/schema/index.js';

export interface GovernanceOverviewRecord {
  entityId: string;
  scopeInstallationId: string | null;
  latestRevision: number;
  isTombstone: boolean;
  occurredAt: string;
  payload: Record<string, unknown> | null;
  syncedAt: string;
}

export interface GovernanceOverviewCompleteness {
  complete: boolean;
  reasons: string[];
  counts: GovernanceCompletenessCounts;
  occurredFrom: string;
  occurredTo: string;
  syncedAt: string;
}

export interface GovernanceOverviewEntityTypeRecords {
  records: GovernanceOverviewRecord[];
  totalCount: number;
}

export interface GovernanceOverviewOrganization {
  organizationId: string;
  records: Record<EntityType, GovernanceOverviewEntityTypeRecords>;
  completeness: GovernanceOverviewCompleteness | null;
  lastSyncedAt: string | null;
}

export interface GovernanceOverview {
  organizations: GovernanceOverviewOrganization[];
}

// Per (organization, entity_type) cap on how many records are returned in the
// overview response. The service still loads every matching row into memory
// (see getOverview below) so it can compute lastSyncedAt/totalCount across the
// full set, but only the most-recently-synced MAX_RECORDS_PER_ENTITY_TYPE rows
// per group are serialized in the response, to bound payload size and what the
// frontend renders.
const MAX_RECORDS_PER_ENTITY_TYPE = 100;

function emptyRecordsByType(): Record<EntityType, GovernanceOverviewRecord[]> {
  return { usage: [], activity: [], relation: [], attribution_link: [] };
}

@Injectable()
export class GovernanceService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async getOverview(): Promise<GovernanceOverview> {
    const [records, completenessRows] = await Promise.all([
      this.db.select().from(governanceRecords),
      this.db.select().from(governanceCompleteness),
    ]);

    const organizationIds = new Set<string>();
    for (const record of records) organizationIds.add(record.organizationId);
    for (const row of completenessRows) organizationIds.add(row.organizationId);

    const completenessByOrg = new Map(
      completenessRows.map((row) => [row.organizationId, row]),
    );

    const organizations = Array.from(organizationIds).map((organizationId) => {
      const grouped = emptyRecordsByType();
      let lastSyncedAt: Date | null = null;

      for (const record of records) {
        if (record.organizationId !== organizationId) continue;
        grouped[record.entityType].push({
          entityId: record.entityId,
          scopeInstallationId: record.scopeInstallationId,
          latestRevision: record.latestRevision,
          isTombstone: record.isTombstone,
          occurredAt: record.occurredAt.toISOString(),
          payload: record.payload,
          syncedAt: record.syncedAt.toISOString(),
        });
        if (!lastSyncedAt || record.syncedAt > lastSyncedAt) {
          lastSyncedAt = record.syncedAt;
        }
      }

      const completenessRow = completenessByOrg.get(organizationId);

      const truncatedRecords = Object.fromEntries(
        (Object.keys(grouped) as EntityType[]).map((entityType) => {
          const typeRecords = grouped[entityType];
          const sorted = [...typeRecords].sort(
            (a, b) => new Date(b.syncedAt).getTime() - new Date(a.syncedAt).getTime(),
          );
          return [
            entityType,
            {
              records: sorted.slice(0, MAX_RECORDS_PER_ENTITY_TYPE),
              totalCount: typeRecords.length,
            },
          ];
        }),
      ) as Record<EntityType, GovernanceOverviewEntityTypeRecords>;

      return {
        organizationId,
        records: truncatedRecords,
        completeness: completenessRow
          ? {
              complete: completenessRow.complete,
              reasons: completenessRow.reasons,
              counts: completenessRow.counts,
              occurredFrom: completenessRow.occurredFrom.toISOString(),
              occurredTo: completenessRow.occurredTo.toISOString(),
              syncedAt: completenessRow.syncedAt.toISOString(),
            }
          : null,
        lastSyncedAt: lastSyncedAt ? lastSyncedAt.toISOString() : null,
      };
    });

    return { organizations };
  }
}
