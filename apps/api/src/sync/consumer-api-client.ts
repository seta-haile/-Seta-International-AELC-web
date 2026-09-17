import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { EntityType } from '../db/schema/index.js';

export type { EntityType };

export interface ConsumerRecord {
  organizationId: string;
  scopeInstallationId: string | null;
  entityType: EntityType;
  entityId: string;
  latestRevision: number;
  highestContiguousRevision: number;
  revisionGap: boolean;
  isTombstone: boolean;
  occurredAt: string;
  observedAt: string;
  receivedAt: string;
  freshnessAt: string;
  payload: Record<string, unknown> | null;
  submissionCount: number;
  recordVersion: number;
}

export interface ConsumerRecordsPage {
  records: ConsumerRecord[];
  nextCursor: string | null;
}

export interface CompletenessCounts {
  dataGap: number;
  canonicalConflict: number;
  revisionGap: number;
  permanentRejection: number;
}

export interface CompletenessSummary {
  organizationId: string;
  occurredFrom: string;
  occurredTo: string;
  complete: boolean;
  reasons: string[];
  counts: CompletenessCounts;
  summaryVersion: number;
}

export class ConsumerApiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = 'ConsumerApiError';
  }
}

interface RawOrganizationsResponse {
  organizations: string[];
  request_id: string;
}

interface RawConsumerRecord {
  organization_id: string;
  scope_installation_id: string | null;
  entity_type: EntityType;
  entity_id: string;
  latest_revision: number;
  highest_contiguous_revision: number;
  revision_gap: boolean;
  is_tombstone: boolean;
  occurred_at: string;
  observed_at: string;
  received_at: string;
  freshness_at: string;
  payload: Record<string, unknown> | null;
  submission_count: number;
  record_version: number;
}

interface RawConsumerRecordsResponse {
  records: RawConsumerRecord[];
  next_cursor: string | null;
}

interface RawCompletenessResponse {
  organization_id: string;
  occurred_from: string;
  occurred_to: string;
  complete: boolean;
  reasons: string[];
  counts: {
    data_gap: number;
    canonical_conflict: number;
    revision_gap: number;
    permanent_rejection: number;
  };
  summary_version: number;
}

function mapConsumerRecord(raw: RawConsumerRecord): ConsumerRecord {
  return {
    organizationId: raw.organization_id,
    scopeInstallationId: raw.scope_installation_id,
    entityType: raw.entity_type,
    entityId: raw.entity_id,
    latestRevision: raw.latest_revision,
    highestContiguousRevision: raw.highest_contiguous_revision,
    revisionGap: raw.revision_gap,
    isTombstone: raw.is_tombstone,
    occurredAt: raw.occurred_at,
    observedAt: raw.observed_at,
    receivedAt: raw.received_at,
    freshnessAt: raw.freshness_at,
    payload: raw.payload,
    submissionCount: raw.submission_count,
    recordVersion: raw.record_version,
  };
}

function mapCompletenessSummary(
  raw: RawCompletenessResponse,
): CompletenessSummary {
  return {
    organizationId: raw.organization_id,
    occurredFrom: raw.occurred_from,
    occurredTo: raw.occurred_to,
    complete: raw.complete,
    reasons: raw.reasons,
    counts: {
      dataGap: raw.counts.data_gap,
      canonicalConflict: raw.counts.canonical_conflict,
      revisionGap: raw.counts.revision_gap,
      permanentRejection: raw.counts.permanent_rejection,
    },
    summaryVersion: raw.summary_version,
  };
}

@Injectable()
export class ConsumerApiClient {
  private readonly logger = new Logger(ConsumerApiClient.name);
  private readonly baseUrl: string;
  private readonly token: string;

  constructor(config: ConfigService) {
    this.baseUrl = config.getOrThrow<string>('CONSUMER_API_BASE_URL');
    this.token = config.getOrThrow<string>('CONSUMER_API_TOKEN');
  }

  async listOrganizations(): Promise<string[]> {
    const body = await this.request<RawOrganizationsResponse>(
      '/consumer/organizations',
    );
    return body.organizations;
  }

  async listRecords(params: {
    organizationId: string;
    entityType: EntityType;
    cursor?: string | null;
    limit?: number;
  }): Promise<ConsumerRecordsPage> {
    const query = new URLSearchParams({
      organization_id: params.organizationId,
      entity_type: params.entityType,
      limit: String(params.limit ?? 500),
    });
    if (params.cursor) {
      query.set('cursor', params.cursor);
    }

    const body = await this.request<RawConsumerRecordsResponse>(
      `/consumer/records?${query.toString()}`,
    );

    return {
      records: body.records.map(mapConsumerRecord),
      nextCursor: body.next_cursor,
    };
  }

  async getCompleteness(params: {
    organizationId: string;
    occurredFrom: string;
    occurredTo: string;
  }): Promise<CompletenessSummary> {
    const query = new URLSearchParams({
      organization_id: params.organizationId,
      occurred_from: params.occurredFrom,
      occurred_to: params.occurredTo,
    });

    const body = await this.request<RawCompletenessResponse>(
      `/consumer/completeness?${query.toString()}`,
    );

    return mapCompletenessSummary(body);
  }

  private async request<T>(path: string): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    let response: Response;
    try {
      response = await fetch(url, {
        headers: { Authorization: `Bearer ${this.token}` },
      });
    } catch (error) {
      throw new ConsumerApiError(
        `Network error calling ${url}: ${(error as Error).message}`,
      );
    }

    if (!response.ok) {
      throw new ConsumerApiError(
        `Consumer API returned ${response.status} for ${url}`,
        response.status,
      );
    }

    return (await response.json()) as T;
  }
}
