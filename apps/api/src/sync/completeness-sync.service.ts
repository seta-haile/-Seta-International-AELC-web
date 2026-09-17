import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DRIZZLE } from '../db/db.constants.js';
import type { DrizzleDb } from '../db/db.types.js';
import { governanceCompleteness } from '../db/schema/index.js';
import { ConsumerApiClient } from './consumer-api-client.js';

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

@Injectable()
export class CompletenessSyncService {
  private readonly logger = new Logger(CompletenessSyncService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly consumerApi: ConsumerApiClient,
    private readonly config: ConfigService,
  ) {}

  /** Runs one completeness pass across every organization. Throws if any
   * organization failed, so callers can tell a fully-successful tick apart
   * from one where every organization errored out silently. */
  async syncAllOrganizations(): Promise<void> {
    const organizationIds = await this.consumerApi.listOrganizations();

    const windowDays = this.config.get<number>(
      'SYNC_COMPLETENESS_WINDOW_DAYS',
      7,
    );
    const occurredTo = new Date();
    const occurredFrom = new Date(
      occurredTo.getTime() - windowDays * MILLISECONDS_PER_DAY,
    );

    const failures: string[] = [];
    for (const organizationId of organizationIds) {
      try {
        await this.syncOne(organizationId, occurredFrom, occurredTo);
      } catch (error) {
        const message = (error as Error).message;
        this.logger.error(
          `Completeness sync failed for organizationId=${organizationId}: ${message}`,
        );
        failures.push(`${organizationId}: ${message}`);
      }
    }

    if (failures.length > 0) {
      throw new Error(
        `${failures.length} of ${organizationIds.length} completeness sync tasks failed: ${failures.join('; ')}`,
      );
    }
  }

  async syncOne(
    organizationId: string,
    occurredFrom: Date,
    occurredTo: Date,
  ): Promise<void> {
    const summary = await this.consumerApi.getCompleteness({
      organizationId,
      occurredFrom: occurredFrom.toISOString(),
      occurredTo: occurredTo.toISOString(),
    });

    await this.db
      .insert(governanceCompleteness)
      .values({
        organizationId,
        occurredFrom,
        occurredTo,
        complete: summary.complete,
        reasons: summary.reasons,
        counts: summary.counts,
        syncedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [governanceCompleteness.organizationId],
        set: {
          occurredFrom,
          occurredTo,
          complete: summary.complete,
          reasons: summary.reasons,
          counts: summary.counts,
          syncedAt: new Date(),
        },
      });
  }
}
