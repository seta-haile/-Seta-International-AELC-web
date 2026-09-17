import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { ConsumerApiClient, ConsumerApiError } from './consumer-api-client.js';

describe('ConsumerApiClient', () => {
  const config = {
    get: vi.fn((key: string) => {
      if (key === 'CONSUMER_API_BASE_URL') return 'https://central.test';
      if (key === 'CONSUMER_API_TOKEN') return 'test-token';
      return undefined;
    }),
  };

  async function createClient(configOverride: Partial<ConfigService> = config) {
    const moduleRef = await Test.createTestingModule({
      providers: [
        ConsumerApiClient,
        { provide: ConfigService, useValue: configOverride },
      ],
    }).compile();
    return moduleRef.get(ConsumerApiClient);
  }

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('lists organizations from GET /consumer/organizations', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        organizations: ['org-1', 'org-2'],
        request_id: 'some-request-id',
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const client = await createClient();
    const organizationIds = await client.listOrganizations();

    expect(organizationIds).toEqual(['org-1', 'org-2']);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://central.test/consumer/organizations',
      { headers: { Authorization: 'Bearer test-token' } },
    );
  });

  it('lists a page of records and maps snake_case fields to camelCase', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        records: [
          {
            organization_id: 'org-1',
            scope_installation_id: null,
            entity_type: 'usage',
            entity_id: 'entity-1',
            latest_revision: 3,
            highest_contiguous_revision: 3,
            revision_gap: false,
            is_tombstone: false,
            occurred_at: '2026-09-01T00:00:00Z',
            observed_at: '2026-09-01T00:00:01Z',
            received_at: '2026-09-01T00:00:02Z',
            freshness_at: '2026-09-01T00:00:03Z',
            payload: { count: 1 },
            submission_count: 1,
            record_version: 1,
          },
        ],
        next_cursor: 'page-2',
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const client = await createClient();
    const page = await client.listRecords({
      organizationId: 'org-1',
      entityType: 'usage',
      cursor: null,
    });

    expect(page.nextCursor).toBe('page-2');
    expect(page.records[0]).toEqual({
      organizationId: 'org-1',
      scopeInstallationId: null,
      entityType: 'usage',
      entityId: 'entity-1',
      latestRevision: 3,
      highestContiguousRevision: 3,
      revisionGap: false,
      isTombstone: false,
      occurredAt: '2026-09-01T00:00:00Z',
      observedAt: '2026-09-01T00:00:01Z',
      receivedAt: '2026-09-01T00:00:02Z',
      freshnessAt: '2026-09-01T00:00:03Z',
      payload: { count: 1 },
      submissionCount: 1,
      recordVersion: 1,
    });
    const requestedUrl = fetchMock.mock.calls[0]?.[0] as string;
    expect(requestedUrl).toBe(
      'https://central.test/consumer/records?organization_id=org-1&entity_type=usage&limit=500',
    );
  });

  it('throws ConsumerApiError when the response is not ok', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue({ ok: false, status: 503, json: async () => ({}) }),
    );

    const client = await createClient();

    await expect(
      client.listRecords({ organizationId: 'org-1', entityType: 'usage' }),
    ).rejects.toThrow(ConsumerApiError);
  });

  it('throws ConsumerApiError on a network failure', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new Error('ECONNREFUSED')),
    );

    const client = await createClient();

    await expect(client.listOrganizations()).rejects.toThrow(ConsumerApiError);
  });

  it('fetches completeness and maps snake_case fields to camelCase', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          organization_id: 'org-1',
          occurred_from: '2026-09-01T00:00:00Z',
          occurred_to: '2026-09-08T00:00:00Z',
          complete: false,
          reasons: ['data_gap'],
          counts: {
            data_gap: 2,
            canonical_conflict: 0,
            revision_gap: 1,
            permanent_rejection: 0,
          },
          summary_version: 1,
        }),
      }),
    );

    const client = await createClient();
    const summary = await client.getCompleteness({
      organizationId: 'org-1',
      occurredFrom: '2026-09-01T00:00:00Z',
      occurredTo: '2026-09-08T00:00:00Z',
    });

    expect(summary).toEqual({
      organizationId: 'org-1',
      occurredFrom: '2026-09-01T00:00:00Z',
      occurredTo: '2026-09-08T00:00:00Z',
      complete: false,
      reasons: ['data_gap'],
      counts: {
        dataGap: 2,
        canonicalConflict: 0,
        revisionGap: 1,
        permanentRejection: 0,
      },
      summaryVersion: 1,
    });
  });

  it('reports isConfigured() true when both env vars are present', async () => {
    const client = await createClient();
    expect(client.isConfigured()).toBe(true);
  });

  describe('when CONSUMER_API_BASE_URL/CONSUMER_API_TOKEN are not configured', () => {
    const unconfigured = { get: vi.fn().mockReturnValue(undefined) };

    it('does not throw in the constructor', async () => {
      await expect(createClient(unconfigured)).resolves.toBeDefined();
    });

    it('reports isConfigured() false', async () => {
      const client = await createClient(unconfigured);
      expect(client.isConfigured()).toBe(false);
    });

    it('throws a clear ConsumerApiError instead of calling fetch when a method is invoked anyway', async () => {
      const fetchMock = vi.fn();
      vi.stubGlobal('fetch', fetchMock);
      const client = await createClient(unconfigured);

      await expect(client.listOrganizations()).rejects.toThrow(
        ConsumerApiError,
      );
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });
});
