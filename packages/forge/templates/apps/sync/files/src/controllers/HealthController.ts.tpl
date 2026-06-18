import {
  Controller,
  Get,
  type FastifyReply,
  type FastifyRequest
} from '@stratix/core';
import type SyncOrchestratorService from '../services/SyncOrchestratorService.js';

@Controller()
export default class HealthController {
  constructor(
    private readonly syncOrchestratorService: SyncOrchestratorService
  ) {}

  @Get('/sync/health')
  async check(_request: FastifyRequest, reply: FastifyReply): Promise<void> {
    reply.status(200).send({
      success: true,
      data: await this.syncOrchestratorService.getOverview()
    });
  }
}
