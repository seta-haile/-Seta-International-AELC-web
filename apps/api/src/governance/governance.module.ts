import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { GovernanceController } from './governance.controller.js';
import { GovernanceService } from './governance.service.js';

@Module({
  imports: [AuthModule],
  controllers: [GovernanceController],
  providers: [GovernanceService],
})
export class GovernanceModule {}
