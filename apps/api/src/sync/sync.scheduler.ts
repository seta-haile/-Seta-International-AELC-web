import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CompletenessSyncService } from './completeness-sync.service.js';
import { RecordsSyncService } from './records-sync.service.js';

const RECORDS_INTERVAL_NAME = 'governance-records-sync';
const COMPLETENESS_INTERVAL_NAME = 'governance-completeness-sync';
const DEFAULT_RECORDS_INTERVAL_MS = 5 * 60 * 1000;
const DEFAULT_COMPLETENESS_INTERVAL_MS = 60 * 60 * 1000;

@Injectable()
export class SyncScheduler implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(SyncScheduler.name);

  constructor(
    private readonly recordsSync: RecordsSyncService,
    private readonly completenessSync: CompletenessSyncService,
    private readonly config: ConfigService,
    private readonly schedulerRegistry: SchedulerRegistry,
  ) {}

  onApplicationBootstrap(): void {
    const recordsIntervalMs = this.config.get<number>(
      'SYNC_RECORDS_INTERVAL_MS',
      DEFAULT_RECORDS_INTERVAL_MS,
    );
    const completenessIntervalMs = this.config.get<number>(
      'SYNC_COMPLETENESS_INTERVAL_MS',
      DEFAULT_COMPLETENESS_INTERVAL_MS,
    );

    const recordsInterval = setInterval(() => {
      this.recordsSync.syncAllOrganizations().catch((error: unknown) => {
        this.logger.error(
          `Records sync tick failed: ${(error as Error).message}`,
        );
      });
    }, recordsIntervalMs);
    this.schedulerRegistry.addInterval(RECORDS_INTERVAL_NAME, recordsInterval);

    const completenessInterval = setInterval(() => {
      this.completenessSync.syncAllOrganizations().catch((error: unknown) => {
        this.logger.error(
          `Completeness sync tick failed: ${(error as Error).message}`,
        );
      });
    }, completenessIntervalMs);
    this.schedulerRegistry.addInterval(
      COMPLETENESS_INTERVAL_NAME,
      completenessInterval,
    );
  }

  onModuleDestroy(): void {
    this.schedulerRegistry.deleteInterval(RECORDS_INTERVAL_NAME);
    this.schedulerRegistry.deleteInterval(COMPLETENESS_INTERVAL_NAME);
  }
}
