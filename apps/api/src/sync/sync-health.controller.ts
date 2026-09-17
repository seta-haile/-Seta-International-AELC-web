import { Controller, Get } from '@nestjs/common';
import { SyncStatusService } from './sync-status.service.js';

@Controller('sync')
export class SyncHealthController {
  constructor(private readonly syncStatus: SyncStatusService) {}

  /** Unauthenticated on purpose — same trust level as a plain liveness
   * probe (no governance data, just job bookkeeping), so deploy tooling
   * can poll it without a session token. */
  @Get('health')
  getHealth() {
    return this.syncStatus.getStatus();
  }
}
