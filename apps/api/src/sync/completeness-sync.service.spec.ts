import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { DRIZZLE } from '../db/db.constants.js';
import type { DrizzleDb } from '../db/db.types.js';
import { governanceCompleteness } from '../db/schema/index.js';
import { withRollback } from '../db/test-utils.js';
import { CompletenessSyncService } from './completeness-sync.service.js';
import { ConsumerApiClient } from './consumer-api-client.js';

describe('CompletenessSyncService', () => {
  async function createService(
    db: DrizzleDb,
    consumerApi: Partial<ConsumerApiClient>,
    windowDays = 7,
  ) {
    const moduleRef = await Test.createTestingModule({
      providers: [
        CompletenessSyncService,
        { provide: DRIZZLE, useValue: db },
        {
          provide: ConsumerApiClient,
          useValue: consumerApi as ConsumerApiClient,
        },
        {
          provide: ConfigService,
          useValue: { get: vi.fn().mockReturnValue(windowDays) },
        },
      ],
    }).compile();
    return moduleRef.get(CompletenessSyncService);
  }

  it('fetches and stores completeness for every organization from listOrganizations', async () => {
    await withRollback(async (db) => {
      const organizationId = randomUUID();
      const consumerApi = {
        listOrganizations: vi.fn().mockResolvedValue([organizationId]),
        getCompleteness: vi.fn().mockResolvedValue({
          organizationId,
          occurredFrom: '2026-09-01T00:00:00.000Z',
          occurredTo: '2026-09-08T00:00:00.000Z',
          complete: false,
          reasons: ['revision_gap'],
          counts: {
            dataGap: 0,
            canonicalConflict: 0,
            revisionGap: 4,
            permanentRejection: 0,
          },
          summaryVersion: 1,
        }),
      };
      const service = await createService(db, consumerApi);

      await service.syncAllOrganizations();

      expect(consumerApi.getCompleteness).toHaveBeenCalledTimes(1);
      const [row] = await db
        .select()
        .from(governanceCompleteness)
        .where(eq(governanceCompleteness.organizationId, organizationId));
      expect(row?.complete).toBe(false);
      expect(row?.reasons).toEqual(['revision_gap']);
      expect(row?.counts).toEqual({
        dataGap: 0,
        canonicalConflict: 0,
        revisionGap: 4,
        permanentRejection: 0,
      });
    });
  });

  it('overwrites the previous row for the same organization on the next sync', async () => {
    await withRollback(async (db) => {
      const organizationId = randomUUID();
      await db.insert(governanceCompleteness).values({
        organizationId,
        occurredFrom: new Date('2026-08-01T00:00:00Z'),
        occurredTo: new Date('2026-08-08T00:00:00Z'),
        complete: true,
        reasons: [],
        counts: {
          dataGap: 0,
          canonicalConflict: 0,
          revisionGap: 0,
          permanentRejection: 0,
        },
      });
      const consumerApi = {
        listOrganizations: vi.fn().mockResolvedValue([organizationId]),
        getCompleteness: vi.fn().mockResolvedValue({
          organizationId,
          occurredFrom: '2026-09-01T00:00:00.000Z',
          occurredTo: '2026-09-08T00:00:00.000Z',
          complete: false,
          reasons: ['data_gap'],
          counts: {
            dataGap: 1,
            canonicalConflict: 0,
            revisionGap: 0,
            permanentRejection: 0,
          },
          summaryVersion: 2,
        }),
      };
      const service = await createService(db, consumerApi);

      await service.syncAllOrganizations();

      const rows = await db
        .select()
        .from(governanceCompleteness)
        .where(eq(governanceCompleteness.organizationId, organizationId));
      expect(rows).toHaveLength(1);
      expect(rows[0]?.complete).toBe(false);
      expect(rows[0]?.reasons).toEqual(['data_gap']);
    });
  });

  it('logs and skips an organization when the consumer API call fails, without throwing', async () => {
    await withRollback(async (db) => {
      const organizationId = randomUUID();
      const consumerApi = {
        listOrganizations: vi.fn().mockResolvedValue([organizationId]),
        getCompleteness: vi.fn().mockRejectedValue(new Error('network down')),
      };
      const service = await createService(db, consumerApi);

      await expect(service.syncAllOrganizations()).resolves.toBeUndefined();

      const rows = await db
        .select()
        .from(governanceCompleteness)
        .where(eq(governanceCompleteness.organizationId, organizationId));
      expect(rows).toHaveLength(0);
    });
  });
});
