import { and, eq } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { withRollback } from '../test-utils.js';
import {
  governanceCompleteness,
  governanceRecords,
  syncCursors,
} from './index.js';

describe('governance schema', () => {
  it('stores and reads a sync cursor row keyed by organization and entity type', async () => {
    await withRollback(async (db) => {
      const organizationId = randomUUID();

      await db.insert(syncCursors).values({
        organizationId,
        entityType: 'usage',
        cursor: 'page-1',
      });

      const [row] = await db
        .select()
        .from(syncCursors)
        .where(
          and(
            eq(syncCursors.organizationId, organizationId),
            eq(syncCursors.entityType, 'usage'),
          ),
        );

      expect(row?.cursor).toBe('page-1');
    });
  });

  it('rejects a second governance_records row with the same organization/entity_type/entity_id', async () => {
    await withRollback(async (db) => {
      const organizationId = randomUUID();
      const values = {
        organizationId,
        entityType: 'usage' as const,
        entityId: 'entity-1',
        latestRevision: 1,
        isTombstone: false,
        occurredAt: new Date(),
        payload: null,
      };

      await db.insert(governanceRecords).values(values);

      await expect(
        db.insert(governanceRecords).values(values),
      ).rejects.toThrow();
    });
  });

  it('stores and reads a governance_completeness row', async () => {
    await withRollback(async (db) => {
      const organizationId = randomUUID();
      const occurredFrom = new Date('2026-09-01T00:00:00Z');
      const occurredTo = new Date('2026-09-08T00:00:00Z');

      await db.insert(governanceCompleteness).values({
        organizationId,
        occurredFrom,
        occurredTo,
        complete: false,
        reasons: ['data_gap'],
        counts: {
          dataGap: 2,
          canonicalConflict: 0,
          revisionGap: 1,
          permanentRejection: 0,
        },
      });

      const [row] = await db
        .select()
        .from(governanceCompleteness)
        .where(eq(governanceCompleteness.organizationId, organizationId));

      expect(row?.complete).toBe(false);
      expect(row?.reasons).toEqual(['data_gap']);
    });
  });
});
