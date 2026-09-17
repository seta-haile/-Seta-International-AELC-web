import {
  Controller,
  Get,
  Headers,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from '../auth/auth.service.js';
import { GovernanceService } from './governance.service.js';

@Controller('governance')
export class GovernanceController {
  constructor(
    private readonly governanceService: GovernanceService,
    private readonly authService: AuthService,
  ) {}

  @Get('overview')
  async getOverview(@Headers('authorization') authorization?: string) {
    const token = authorization?.startsWith('Bearer ')
      ? authorization.slice('Bearer '.length)
      : undefined;

    if (!token) {
      throw new UnauthorizedException('Missing bearer token');
    }

    await this.authService.validateToken(token);

    return this.governanceService.getOverview();
  }
}
