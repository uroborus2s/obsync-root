import {
  Controller,
  Get,
  type FastifyReply,
  type FastifyRequest
} from '@stratix/core';
import type HealthService from '../services/HealthService.js';

@Controller()
export default class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get('/health')
  async check(_request: FastifyRequest, reply: FastifyReply): Promise<void> {
    reply.status(200).send({
      success: true,
      data: await this.healthService.getHealth()
    });
  }
}
