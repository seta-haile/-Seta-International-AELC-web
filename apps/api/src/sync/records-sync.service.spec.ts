import { ConfigService as _ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { and, eq } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { DRIZZLE } from '../db/db.constants.js';
import type { DrizzleDb } from '../db/db.types.js';
import { governanceRecords, syncCursors } from '../db/schema/index.js';
import { withRollback } from '../db/test-utils.js';
import { ConsumerApiClient } from './consumer-api-client.js';
import { RecordsSyncService } from './records-sync.service.js';

describe('RecordsSyncService', () => {
  async function createService(
    db: DrizzleDb,
    consumerApi: Partial<ConsumerApiClient>,
  ) {
    const moduleRef = await Test.createTestingModule({
      providers: [
        RecordsSyncService,
        { provide: DRIZZLE, useValue: db },
        {
          provide: ConsumerApiClient,
          useValue: consumerApi as ConsumerApiClient,
        },
      ],
    }).compile();
    return moduleRef.get(RecordsSyncService);
  }

  it('upserts the fetched page and advances the cursor in one pass, starting from a null cursor', async () => {
    await withRollback(async (db) => {
      const organizationId = randomUUID();
      const consumerApi = {
        listRecords: vi.fn().mockResolvedValue({
          records: [
            {
              organizationId,
              scopeInstallationId: null,
              entityType: 'usage',
              entityId: 'entity-1',
              latestRevision: 1,
              highestContiguousRevision: 1,
              revisionGap: false,
              isTombstone: false,
              occurredAt: '2026-09-01T00:00:00Z',
              observedAt: '2026-09-01T00:00:00Z',
              receivedAt: '2026-09-01T00:00:00Z',
              freshnessAt: '2026-09-01T00:00:00Z',
              payload: { count: 1 },
              submissionCount: 1,
              recordVersion: 1,
            },
          ],
          nextCursor: 'page-2',
        }),
      };
      const service = await createService(db, consumerApi);

      await service.syncOnePage(organizationId, 'usage');

      expect(consumerApi.listRecords).toHaveBeenCalledWith({
        organizationId,
        entityType: 'usage',
        cursor: null,
      });

      const [record] = await db
        .select()
        .from(governanceRecords)
        .where(
          and(
            eq(governanceRecords.organizationId, organizationId),
            eq(governanceRecords.entityId, 'entity-1'),
          ),
        );
      expect(record?.latestRevision).toBe(1);

      const [cursor] = await db
        .select()
        .from(syncCursors)
        .where(
          and(
            eq(syncCursors.organizationId, organizationId),
            eq(syncCursors.entityType, 'usage'),
          ),
        );
      expect(cursor?.cursor).toBe('page-2');
    });
  });

  it('resumes from the stored cursor on the next call', async () => {
    await withRollback(async (db) => {
      const organizationId = randomUUID();
      await db.insert(syncCursors).values({
        organizationId,
        entityType: 'usage',
        cursor: 'page-2',
      });
      const consumerApi = {
        listRecords: vi
          .fn()
          .mockResolvedValue({ records: [], nextCursor: null }),
      };
      const service = await createService(db, consumerApi);

      await service.syncOnePage(organizationId, 'usage');

      expect(consumerApi.listRecords).toHaveBeenCalledWith({
        organizationId,
        entityType: 'usage',
        cursor: 'page-2',
      });
    });
  });

  it('leaves the cursor untouched and rejects when the consumer API call fails', async () => {
    await withRollback(async (db) => {
      const organizationId = randomUUID();
      await db.insert(syncCursors).values({
        organizationId,
        entityType: 'usage',
        cursor: 'page-2',
      });
      const consumerApi = {
        listRecords: vi.fn().mockRejectedValue(new Error('network down')),
      };
      const service = await createService(db, consumerApi);

      await expect(
        service.syncOnePage(organizationId, 'usage'),
      ).rejects.toThrow('network down');

      const [cursor] = await db
        .select()
        .from(syncCursors)
        .where(
          and(
            eq(syncCursors.organizationId, organizationId),
            eq(syncCursors.entityType, 'usage'),
          ),
        );
      expect(cursor?.cursor).toBe('page-2');
    });
  });

  it('never overwrites a stored record with a lower or equal latest_revision', async () => {
    await withRollback(async (db) => {
      const organizationId = randomUUID();
      await db.insert(governanceRecords).values({
        organizationId,
        entityType: 'usage',
        entityId: 'entity-1',
        latestRevision: 5,
        isTombstone: false,
        occurredAt: new Date('2026-09-01T00:00:00Z'),
        payload: { count: 5 },
      });
      const consumerApi = {
        listRecords: vi.fn().mockResolvedValue({
          records: [
            {
              organizationId,
              scopeInstallationId: null,
              entityType: 'usage',
              entityId: 'entity-1',
              latestRevision: 3,
              highestContiguousRevision: 3,
              revisionGap: false,
              isTombstone: false,
              occurredAt: '2026-09-02T00:00:00Z',
              observedAt: '2026-09-02T00:00:00Z',
              receivedAt: '2026-09-02T00:00:00Z',
              freshnessAt: '2026-09-02T00:00:00Z',
              payload: { count: 3 },
              submissionCount: 1,
              recordVersion: 1,
            },
          ],
          nextCursor: null,
        }),
      };
      const service = await createService(db, consumerApi);

      await service.syncOnePage(organizationId, 'usage');

      const [record] = await db
        .select()
        .from(governanceRecords)
        .where(
          and(
            eq(governanceRecords.organizationId, organizationId),
            eq(governanceRecords.entityId, 'entity-1'),
          ),
        );
      expect(record?.latestRevision).toBe(5);
      expect(record?.payload).toEqual({ count: 5 });
    });
  });

  it('rolls back both the record upsert and the cursor advance when the transaction fails', async () => {
    await withRollback(async (db) => {
      const organizationId = randomUUID();
      const consumerApi = {
        listRecords: vi.fn().mockResolvedValue({
          records: [
            {
              organizationId,
              scopeInstallationId: null,
              entityType: 'usage',
              // entityId is NOT NULL in the schema; forcing it to null at
              // runtime (bypassing the compile-time type) simulates a
              // constraint violation partway through the transaction.
              entityId: null as unknown as string,
              latestRevision: 1,
              highestContiguousRevision: 1,
              revisionGap: false,
              isTombstone: false,
              occurredAt: '2026-09-01T00:00:00Z',
              observedAt: '2026-09-01T00:00:00Z',
              receivedAt: '2026-09-01T00:00:00Z',
              freshnessAt: '2026-09-01T00:00:00Z',
              payload: null,
              submissionCount: 1,
              recordVersion: 1,
            },
          ],
          nextCursor: 'page-2',
        }),
      };
      const service = await createService(db, consumerApi);

      await expect(
        service.syncOnePage(organizationId, 'usage'),
      ).rejects.toThrow();

      const records = await db
        .select()
        .from(governanceRecords)
        .where(eq(governanceRecords.organizationId, organizationId));
      expect(records).toHaveLength(0);

      const cursors = await db
        .select()
        .from(syncCursors)
        .where(eq(syncCursors.organizationId, organizationId));
      expect(cursors).toHaveLength(0);
    });
  });

  it('keeps attribution_link records from different installations as separate rows instead of colliding onto one', async () => {
    await withRollback(async (db) => {
      const organizationId = randomUUID();
      const installationA = randomUUID();
      const installationB = randomUUID();
      const consumerApi = {
        listRecords: vi.fn().mockResolvedValue({
          records: [
            {
              organizationId,
              scopeInstallationId: installationA,
              entityType: 'attribution_link',
              entityId: 'entity-1',
              latestRevision: 1,
              highestContiguousRevision: 1,
              revisionGap: false,
              isTombstone: false,
              occurredAt: '2026-09-01T00:00:00Z',
              observedAt: '2026-09-01T00:00:00Z',
              receivedAt: '2026-09-01T00:00:00Z',
              freshnessAt: '2026-09-01T00:00:00Z',
              payload: { installation: 'a' },
              submissionCount: 1,
              recordVersion: 1,
            },
            {
              organizationId,
              scopeInstallationId: installationB,
              entityType: 'attribution_link',
              entityId: 'entity-1',
              latestRevision: 1,
              highestContiguousRevision: 1,
              revisionGap: false,
              isTombstone: false,
              occurredAt: '2026-09-01T00:00:00Z',
              observedAt: '2026-09-01T00:00:00Z',
              receivedAt: '2026-09-01T00:00:00Z',
              freshnessAt: '2026-09-01T00:00:00Z',
              payload: { installation: 'b' },
              submissionCount: 1,
              recordVersion: 1,
            },
          ],
          nextCursor: null,
        }),
      };
      const service = await createService(db, consumerApi);

      await service.syncOnePage(organizationId, 'attribution_link');

      const records = await db
        .select()
        .from(governanceRecords)
        .where(
          and(
            eq(governanceRecords.organizationId, organizationId),
            eq(governanceRecords.entityId, 'entity-1'),
          ),
        );

      expect(records).toHaveLength(2);
      const byInstallation = new Map(
        records.map((r) => [r.scopeInstallationId, r.payload]),
      );
      expect(byInstallation.get(installationA)).toEqual({
        installation: 'a',
      });
      expect(byInstallation.get(installationB)).toEqual({
        installation: 'b',
      });
    });
  });

  it('never regresses a NULL-scoped (usage/activity/relation) record even after the scope-aware conflict target change', async () => {
    await withRollback(async (db) => {
      const organizationId = randomUUID();
      await db.insert(governanceRecords).values({
        organizationId,
        scopeInstallationId: null,
        entityType: 'usage',
        entityId: 'entity-1',
        latestRevision: 5,
        isTombstone: false,
        occurredAt: new Date('2026-09-01T00:00:00Z'),
        payload: { count: 5 },
      });
      const consumerApi = {
        listRecords: vi.fn().mockResolvedValue({
          records: [
            {
              organizationId,
              scopeInstallationId: null,
              entityType: 'usage',
              entityId: 'entity-1',
              latestRevision: 3,
              highestContiguousRevision: 3,
              revisionGap: false,
              isTombstone: false,
              occurredAt: '2026-09-02T00:00:00Z',
              observedAt: '2026-09-02T00:00:00Z',
              receivedAt: '2026-09-02T00:00:00Z',
              freshnessAt: '2026-09-02T00:00:00Z',
              payload: { count: 3 },
              submissionCount: 1,
              recordVersion: 1,
            },
          ],
          nextCursor: null,
        }),
      };
      const service = await createService(db, consumerApi);

      await service.syncOnePage(organizationId, 'usage');

      const records = await db
        .select()
        .from(governanceRecords)
        .where(
          and(
            eq(governanceRecords.organizationId, organizationId),
            eq(governanceRecords.entityId, 'entity-1'),
          ),
        );

      expect(records).toHaveLength(1);
      expect(records[0]?.latestRevision).toBe(5);
      expect(records[0]?.payload).toEqual({ count: 5 });
    });
  });

  it('continues syncing remaining organizations and entity types after one combination fails, covering all 4 entity types per organization', async () => {
    await withRollback(async (db) => {
      const orgA = randomUUID();
      const orgB = randomUUID();
      const listRecords = vi.fn(
        async ({
          organizationId,
          entityType,
        }: {
          organizationId: string;
          entityType: string;
        }) => {
          if (organizationId === orgA && entityType === 'usage') {
            throw new Error('temporary central outage');
          }
          return { records: [], nextCursor: null };
        },
      );
      const consumerApi = {
        listOrganizations: vi.fn().mockResolvedValue([orgA, orgB]),
        listRecords,
      };
      const service = await createService(db, consumerApi);

      // Still covers every combination even though one failed, but now
      // surfaces the failure by rejecting instead of swallowing it, so a
      // caller (the scheduler) can tell a degraded pass apart from a clean
      // one.
      await expect(service.syncAllOrganizations()).rejects.toThrow(
        '1 of 8 record sync tasks failed',
      );

      // 2 organizations x 4 entity types = 8 calls, even though one failed.
      expect(listRecords).toHaveBeenCalledTimes(8);
    });
  });
});
