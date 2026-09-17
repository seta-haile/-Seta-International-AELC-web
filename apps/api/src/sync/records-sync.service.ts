import { Inject, Injectable, Logger } from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';
import { DRIZZLE } from '../db/db.constants.js';
import type { DrizzleDb } from '../db/db.types.js';
import {
  ENTITY_TYPES,
  governanceRecords,
  syncCursors,
  type EntityType,
} from '../db/schema/index.js';
import {
  ConsumerApiClient,
  type ConsumerRecordsPage,
} from './consumer-api-client.js';

@Injectable()
export class RecordsSyncService {
  private readonly logger = new Logger(RecordsSyncService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly consumerApi: ConsumerApiClient,
  ) {}

  /** Runs one sync pass across every organization/entity type. Throws if
   * any part of the pass failed, so callers can tell a fully-successful
   * tick apart from one where every organization errored out silently. */
  async syncAllOrganizations(): Promise<void> {
    const organizationIds = await this.consumerApi.listOrganizations();

    const failures: string[] = [];
    for (const organizationId of organizationIds) {
      for (const entityType of ENTITY_TYPES) {
        try {
          await this.syncOnePage(organizationId, entityType);
        } catch (error) {
          const message = (error as Error).message;
          this.logger.error(
            `Sync failed for organizationId=${organizationId} entityType=${entityType}: ${message}`,
          );
          failures.push(`${organizationId}/${entityType}: ${message}`);
        }
      }
    }

    if (failures.length > 0) {
      throw new Error(
        `${failures.length} of ${organizationIds.length * ENTITY_TYPES.length} record sync tasks failed: ${failures.join('; ')}`,
      );
    }
  }

  async syncOnePage(
    organizationId: string,
    entityType: EntityType,
  ): Promise<void> {
    const [cursorRow] = await this.db
      .select()
      .from(syncCursors)
      .where(
        and(
          eq(syncCursors.organizationId, organizationId),
          eq(syncCursors.entityType, entityType),
        ),
      );

    const page = await this.consumerApi.listRecords({
      organizationId,
      entityType,
      cursor: cursorRow?.cursor ?? null,
    });

    await this.db.transaction(async (tx) => {
      for (const record of page.records) {
        await tx
          .insert(governanceRecords)
          .values({
            organizationId: record.organizationId,
            scopeInstallationId: record.scopeInstallationId,
            entityType: record.entityType,
            entityId: record.entityId,
            latestRevision: record.latestRevision,
            isTombstone: record.isTombstone,
            occurredAt: new Date(record.occurredAt),
            payload: record.payload,
            syncedAt: new Date(),
          })
          .onConflictDoUpdate({
            // Matches the governance_records_org_entity_scope_unique index
            // (see governance-records.schema.ts): scopeInstallationKey is a
            // generated column that normalizes a NULL scope_installation_id
            // to a fixed sentinel, so usage/activity/relation rows (always
            // NULL-scoped) still collide with each other, while
            // attribution_link rows for different installations of the same
            // (org, entity_type, entity_id) stay as separate rows instead of
            // colliding onto one.
            target: [
              governanceRecords.organizationId,
              governanceRecords.entityType,
              governanceRecords.entityId,
              governanceRecords.scopeInstallationKey,
            ],
            set: {
              latestRevision: record.latestRevision,
              isTombstone: record.isTombstone,
              occurredAt: new Date(record.occurredAt),
              payload: record.payload,
              syncedAt: new Date(),
            },
            setWhere: sql`${governanceRecords.latestRevision} < ${record.latestRevision}`,
          });
      }

      await tx
        .insert(syncCursors)
        .values({
          organizationId,
          entityType,
          cursor: page.nextCursor,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [syncCursors.organizationId, syncCursors.entityType],
          set: { cursor: page.nextCursor, updatedAt: new Date() },
        });
    });
  }
}
