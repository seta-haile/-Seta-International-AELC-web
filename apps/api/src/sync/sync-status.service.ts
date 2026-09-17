import { Injectable } from '@nestjs/common';

export type SyncJobName = 'records' | 'completeness';

export interface SyncJobStatus {
  configured: boolean;
  lastRunAt: string | null;
  lastSuccessAt: string | null;
  lastError: string | null;
  consecutiveFailures: number;
}

@Injectable()
export class SyncStatusService {
  private readonly jobs: Record<SyncJobName, SyncJobStatus> = {
    records: this.emptyStatus(),
    completeness: this.emptyStatus(),
  };

  private emptyStatus(): SyncJobStatus {
    return {
      configured: false,
      lastRunAt: null,
      lastSuccessAt: null,
      lastError: null,
      consecutiveFailures: 0,
    };
  }

  markConfigured(job: SyncJobName): void {
    this.jobs[job].configured = true;
  }

  recordSuccess(job: SyncJobName): void {
    const now = new Date().toISOString();
    this.jobs[job].lastRunAt = now;
    this.jobs[job].lastSuccessAt = now;
    this.jobs[job].lastError = null;
    this.jobs[job].consecutiveFailures = 0;
  }

  recordFailure(job: SyncJobName, message: string): void {
    this.jobs[job].lastRunAt = new Date().toISOString();
    this.jobs[job].lastError = message;
    this.jobs[job].consecutiveFailures += 1;
  }

  getStatus(): Record<SyncJobName, SyncJobStatus> {
    return { records: { ...this.jobs.records }, completeness: { ...this.jobs.completeness } };
  }
}
