import { Controller, Get } from '@nestjs/common';
import { GovernanceService } from './governance.service.js';

@Controller('governance')
export class GovernanceController {
  constructor(private readonly governanceService: GovernanceService) {}

  @Get('overview')
  getOverview() {
    return this.governanceService.getOverview();
  }
}
