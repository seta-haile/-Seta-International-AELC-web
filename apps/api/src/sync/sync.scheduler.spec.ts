import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { Test } from '@nestjs/testing';
import { CompletenessSyncService } from './completeness-sync.service.js';
import { RecordsSyncService } from './records-sync.service.js';
import { SyncScheduler } from './sync.scheduler.js';

describe('SyncScheduler', () => {
  it('registers records and completeness intervals from config and invokes each sync service on its own tick', async () => {
    vi.useFakeTimers();
    const recordsSync = { syncAllOrganizations: vi.fn().mockResolvedValue(undefined) };
    const completenessSync = { syncAllOrganizations: vi.fn().mockResolvedValue(undefined) };
    const config = {
      get: vi.fn((key: string, fallback: number) => {
        if (key === 'SYNC_RECORDS_INTERVAL_MS') return 1000;
        if (key === 'SYNC_COMPLETENESS_INTERVAL_MS') return 5000;
        return fallback;
      }),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        SyncScheduler,
        SchedulerRegistry,
        { provide: RecordsSyncService, useValue: recordsSync },
        { provide: CompletenessSyncService, useValue: completenessSync },
        { provide: ConfigService, useValue: config },
      ],
    }).compile();

    const scheduler = moduleRef.get(SyncScheduler);
    const registry = moduleRef.get(SchedulerRegistry);
    scheduler.onApplicationBootstrap();

    expect(registry.doesExist('interval', 'governance-records-sync')).toBe(true);
    expect(
      registry.doesExist('interval', 'governance-completeness-sync'),
    ).toBe(true);

    await vi.advanceTimersByTimeAsync(1000);
    expect(recordsSync.syncAllOrganizations).toHaveBeenCalledTimes(1);
    expect(completenessSync.syncAllOrganizations).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(4000);
    expect(completenessSync.syncAllOrganizations).toHaveBeenCalledTimes(1);

    scheduler.onModuleDestroy();
    expect(registry.doesExist('interval', 'governance-records-sync')).toBe(
      false,
    );

    vi.useRealTimers();
  });
});
