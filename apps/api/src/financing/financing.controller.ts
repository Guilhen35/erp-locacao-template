import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Put, Req } from '@nestjs/common';
import type { Request } from 'express';
import { financingSchema, type FinancingData } from '@locacao/shared';
import { CurrentSession } from '../auth/current-session.decorator.js';
import { RequirePermission } from '../auth/require-permission.decorator.js';
import type { AuthenticatedSession } from '../auth/session.guard.js';
import { actorOf } from '../common/audit.js';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';
import { FinancingService } from './financing.service.js';

// Dados financeiros da máquina: protegidos pelas permissões do financeiro
@Controller('machines/:machineId')
export class FinancingController {
  constructor(private readonly financing: FinancingService) {}

  @Get('financing')
  @RequirePermission('financeiro:ler')
  get(@Param('machineId', new ParseUUIDPipe()) machineId: string) {
    return this.financing.get(machineId);
  }

  @Put('financing')
  @RequirePermission('financeiro:editar')
  save(
    @Param('machineId', new ParseUUIDPipe()) machineId: string,
    @Body(new ZodValidationPipe(financingSchema)) body: FinancingData,
    @CurrentSession() session: AuthenticatedSession,
    @Req() req: Request,
  ) {
    return this.financing.save(machineId, body, actorOf(session, req));
  }

  @Delete('financing')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission('financeiro:editar')
  async remove(@Param('machineId', new ParseUUIDPipe()) machineId: string, @CurrentSession() session: AuthenticatedSession, @Req() req: Request) {
    await this.financing.remove(machineId, actorOf(session, req));
  }

  @Get('result')
  @RequirePermission('financeiro:ler')
  result(@Param('machineId', new ParseUUIDPipe()) machineId: string) {
    return this.financing.result(machineId);
  }
}