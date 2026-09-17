import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { CompletenessSyncService } from './completeness-sync.service.js';
import { ConsumerApiClient } from './consumer-api-client.js';
import { RecordsSyncService } from './records-sync.service.js';
import { SyncHealthController } from './sync-health.controller.js';
import { SyncStatusService } from './sync-status.service.js';
import { SyncScheduler } from './sync.scheduler.js';

@Module({
  imports: [ScheduleModule.forRoot()],
  controllers: [SyncHealthController],
  providers: [
    ConsumerApiClient,
    RecordsSyncService,
    CompletenessSyncService,
    SyncStatusService,
    SyncScheduler,
  ],
})
export class SyncModule {}
