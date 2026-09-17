import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { Test } from '@nestjs/testing';
import { CompletenessSyncService } from './completeness-sync.service.js';
import { ConsumerApiClient } from './consumer-api-client.js';
import { RecordsSyncService } from './records-sync.service.js';
import { SyncStatusService } from './sync-status.service.js';
import { SyncScheduler } from './sync.scheduler.js';

describe('SyncScheduler', () => {
  async function createScheduler(
    config: Partial<ConfigService>,
    consumerApi: Partial<ConsumerApiClient>,
    recordsSync = {
      syncAllOrganizations: vi.fn().mockResolvedValue(undefined),
    },
    completenessSync = {
      syncAllOrganizations: vi.fn().mockResolvedValue(undefined),
    },
  ) {
    const moduleRef = await Test.createTestingModule({
      providers: [
        SyncScheduler,
        SchedulerRegistry,
        { provide: RecordsSyncService, useValue: recordsSync },
        { provide: CompletenessSyncService, useValue: completenessSync },
        { provide: ConfigService, useValue: config },
        { provide: ConsumerApiClient, useValue: consumerApi },
        SyncStatusService,
      ],
    }).compile();
    return {
      scheduler: moduleRef.get(SyncScheduler),
      registry: moduleRef.get(SchedulerRegistry),
      syncStatus: moduleRef.get(SyncStatusService),
      recordsSync,
      completenessSync,
    };
  }

  it('registers records and completeness intervals from config and invokes each sync service on its own tick', async () => {
    vi.useFakeTimers();
    const config = {
      get: vi.fn((key: string, fallback: number) => {
        if (key === 'SYNC_RECORDS_INTERVAL_MS') return 1000;
        if (key === 'SYNC_COMPLETENESS_INTERVAL_MS') return 5000;
        return fallback;
      }),
    };
    const consumerApi = { isConfigured: vi.fn().mockReturnValue(true) };
    const { scheduler, registry, syncStatus, recordsSync, completenessSync } =
      await createScheduler(config, consumerApi);

    scheduler.onApplicationBootstrap();

    expect(registry.doesExist('interval', 'governance-records-sync')).toBe(
      true,
    );
    expect(registry.doesExist('interval', 'governance-completeness-sync')).toBe(
      true,
    );

    await vi.advanceTimersByTimeAsync(1000);
    expect(recordsSync.syncAllOrganizations).toHaveBeenCalledTimes(1);
    expect(completenessSync.syncAllOrganizations).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(4000);
    expect(completenessSync.syncAllOrganizations).toHaveBeenCalledTimes(1);

    const status = syncStatus.getStatus();
    expect(status.records.lastSuccessAt).not.toBeNull();
    expect(status.completeness.lastSuccessAt).not.toBeNull();

    scheduler.onModuleDestroy();
    expect(registry.doesExist('interval', 'governance-records-sync')).toBe(
      false,
    );

    vi.useRealTimers();
  });

  it('does not register any interval, logs a warning, and does not throw when the consumer API is not configured', async () => {
    vi.useFakeTimers();
    const config = { get: vi.fn((_key: string, fallback: number) => fallback) };
    const consumerApi = { isConfigured: vi.fn().mockReturnValue(false) };
    const { scheduler, registry, recordsSync, completenessSync } =
      await createScheduler(config, consumerApi);
    const warnSpy = vi
      .spyOn(
        (scheduler as unknown as { logger: { warn: () => void } }).logger,
        'warn',
      )
      .mockImplementation(() => undefined);

    expect(() => scheduler.onApplicationBootstrap()).not.toThrow();

    expect(warnSpy).toHaveBeenCalledWith(
      'Sync disabled: CONSUMER_API_BASE_URL/CONSUMER_API_TOKEN not configured',
    );
    expect(registry.doesExist('interval', 'governance-records-sync')).toBe(
      false,
    );
    expect(registry.doesExist('interval', 'governance-completeness-sync')).toBe(
      false,
    );

    // onModuleDestroy must also be safe to call even though nothing was
    // registered (SchedulerRegistry.deleteInterval throws on an unknown
    // name).
    expect(() => scheduler.onModuleDestroy()).not.toThrow();

    await vi.advanceTimersByTimeAsync(10_000);
    expect(recordsSync.syncAllOrganizations).not.toHaveBeenCalled();
    expect(completenessSync.syncAllOrganizations).not.toHaveBeenCalled();

    vi.useRealTimers();
  });

  it('records a failure in sync status when a tick throws, without crashing the interval', async () => {
    vi.useFakeTimers();
    const config = {
      get: vi.fn((key: string, fallback: number) => {
        if (key === 'SYNC_RECORDS_INTERVAL_MS') return 1000;
        return fallback;
      }),
    };
    const consumerApi = { isConfigured: vi.fn().mockReturnValue(true) };
    const recordsSync = {
      syncAllOrganizations: vi.fn().mockRejectedValue(new Error('401 Unauthorized')),
    };
    const { scheduler, syncStatus } = await createScheduler(
      config,
      consumerApi,
      recordsSync,
    );

    scheduler.onApplicationBootstrap();
    await vi.advanceTimersByTimeAsync(1000);

    const status = syncStatus.getStatus();
    expect(status.records.lastSuccessAt).toBeNull();
    expect(status.records.lastError).toBe('401 Unauthorized');
    expect(status.records.consecutiveFailures).toBe(1);

    await vi.advanceTimersByTimeAsync(1000);
    expect(status.records.consecutiveFailures).toBeLessThanOrEqual(2);

    vi.useRealTimers();
  });
});
