import { Test } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import { DRIZZLE } from '../db/db.constants.js';
import type { DrizzleDb } from '../db/db.types.js';
import { governanceCompleteness, governanceRecords } from '../db/schema/index.js';
import { withRollback } from '../db/test-utils.js';
import { GovernanceService } from './governance.service.js';

describe('GovernanceService', () => {
  async function createService(db: DrizzleDb) {
    const moduleRef = await Test.createTestingModule({
      providers: [GovernanceService, { provide: DRIZZLE, useValue: db }],
    }).compile();
    return moduleRef.get(GovernanceService);
  }

  it('groups records by organization and entity type, with completeness null when absent', async () => {
    await withRollback(async (db) => {
      const organizationId = randomUUID();
      await db.insert(governanceRecords).values([
        {
          organizationId,
          entityType: 'usage',
          entityId: 'usage-1',
          latestRevision: 1,
          isTombstone: false,
          occurredAt: new Date('2026-09-01T00:00:00Z'),
          payload: { tokens: 100 },
        },
        {
          organizationId,
          entityType: 'activity',
          entityId: 'activity-1',
          latestRevision: 1,
          isTombstone: false,
          occurredAt: new Date('2026-09-01T00:00:00Z'),
          payload: null,
        },
      ]);
      const service = await createService(db);

      const overview = await service.getOverview();

      const org = overview.organizations.find((o) => o.organizationId === organizationId);
      expect(org).toBeDefined();
      expect(org?.records.usage.records).toHaveLength(1);
      expect(org?.records.usage.totalCount).toBe(1);
      expect(org?.records.usage.records[0]?.entityId).toBe('usage-1');
      expect(org?.records.activity.records).toHaveLength(1);
      expect(org?.records.activity.totalCount).toBe(1);
      expect(org?.records.relation.records).toHaveLength(0);
      expect(org?.records.relation.totalCount).toBe(0);
      expect(org?.records.attribution_link.records).toHaveLength(0);
      expect(org?.records.attribution_link.totalCount).toBe(0);
      expect(org?.completeness).toBeNull();
    });
  });

  it('includes completeness when a row exists for the organization', async () => {
    await withRollback(async (db) => {
      const organizationId = randomUUID();
      await db.insert(governanceCompleteness).values({
        organizationId,
        occurredFrom: new Date('2026-09-01T00:00:00Z'),
        occurredTo: new Date('2026-09-08T00:00:00Z'),
        complete: false,
        reasons: ['data_gap'],
        counts: {
          dataGap: 1,
          canonicalConflict: 0,
          revisionGap: 0,
          permanentRejection: 0,
        },
      });
      const service = await createService(db);

      const overview = await service.getOverview();

      const org = overview.organizations.find((o) => o.organizationId === organizationId);
      expect(org?.completeness?.complete).toBe(false);
      expect(org?.completeness?.reasons).toEqual(['data_gap']);
    });
  });

  it("computes lastSyncedAt as the max syncedAt among the organization's records", async () => {
    await withRollback(async (db) => {
      const organizationId = randomUUID();
      const older = new Date('2026-09-01T00:00:00Z');
      const newer = new Date('2026-09-05T00:00:00Z');
      await db.insert(governanceRecords).values([
        {
          organizationId,
          entityType: 'usage',
          entityId: 'a',
          latestRevision: 1,
          isTombstone: false,
          occurredAt: older,
          payload: null,
          syncedAt: older,
        },
        {
          organizationId,
          entityType: 'usage',
          entityId: 'b',
          latestRevision: 1,
          isTombstone: false,
          occurredAt: newer,
          payload: null,
          syncedAt: newer,
        },
      ]);
      const service = await createService(db);

      const overview = await service.getOverview();

      const org = overview.organizations.find((o) => o.organizationId === organizationId);
      expect(org?.lastSyncedAt).toBe(newer.toISOString());
    });
  });

  it('keeps multiple organizations independent', async () => {
    await withRollback(async (db) => {
      const orgA = randomUUID();
      const orgB = randomUUID();
      await db.insert(governanceRecords).values([
        {
          organizationId: orgA,
          entityType: 'usage',
          entityId: 'a',
          latestRevision: 1,
          isTombstone: false,
          occurredAt: new Date(),
          payload: null,
        },
        {
          organizationId: orgB,
          entityType: 'relation',
          entityId: 'b',
          latestRevision: 1,
          isTombstone: false,
          occurredAt: new Date(),
          payload: null,
        },
      ]);
      const service = await createService(db);

      const overview = await service.getOverview();

      const a = overview.organizations.find((o) => o.organizationId === orgA);
      const b = overview.organizations.find((o) => o.organizationId === orgB);
      expect(a?.records.usage.records).toHaveLength(1);
      expect(a?.records.relation.records).toHaveLength(0);
      expect(b?.records.relation.records).toHaveLength(1);
      expect(b?.records.usage.records).toHaveLength(0);
    });
  });

  it('caps records per entity type at 100, ordered by syncedAt descending, while totalCount reflects the true total', async () => {
    await withRollback(async (db) => {
      const organizationId = randomUUID();
      const recordCount = 105;
      const baseTime = new Date('2026-09-01T00:00:00Z').getTime();

      // Insert in ascending syncedAt order so that "most recent" is the tail
      // of this array — the assertions below check the service reorders them.
      const values = Array.from({ length: recordCount }, (_, index) => ({
        organizationId,
        entityType: 'usage' as const,
        entityId: `usage-${index}`,
        latestRevision: 1,
        isTombstone: false,
        occurredAt: new Date(baseTime + index * 1000),
        payload: null,
        syncedAt: new Date(baseTime + index * 1000),
      }));
      await db.insert(governanceRecords).values(values);

      const service = await createService(db);

      const overview = await service.getOverview();

      const org = overview.organizations.find((o) => o.organizationId === organizationId);
      expect(org?.records.usage.totalCount).toBe(recordCount);
      expect(org?.records.usage.records).toHaveLength(100);
      // Most recently synced record (index 104) should be first.
      expect(org?.records.usage.records[0]?.entityId).toBe('usage-104');
      expect(org?.records.usage.records[99]?.entityId).toBe('usage-5');

      const syncedAtValues = org!.records.usage.records.map((r) => new Date(r.syncedAt).getTime());
      const sortedDescending = [...syncedAtValues].sort((a, b) => b - a);
      expect(syncedAtValues).toEqual(sortedDescending);
    });
  });
});
