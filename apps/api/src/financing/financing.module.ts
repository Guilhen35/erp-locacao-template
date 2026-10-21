import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { FinancingController } from './financing.controller.js';
import { FinancingService } from './financing.service.js';

@Module({
  imports: [AuthModule],
  controllers: [FinancingController],
  providers: [FinancingService],
})
export class FinancingModule {}
