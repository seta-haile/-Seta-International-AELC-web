import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { CompletenessSyncService } from './completeness-sync.service.js';
import { ConsumerApiClient } from './consumer-api-client.js';
import { RecordsSyncService } from './records-sync.service.js';
import { SyncScheduler } from './sync.scheduler.js';

@Module({
  imports: [ScheduleModule.forRoot()],
  providers: [
    ConsumerApiClient,
    RecordsSyncService,
    CompletenessSyncService,
    SyncScheduler,
  ],
})
export class SyncModule {}
