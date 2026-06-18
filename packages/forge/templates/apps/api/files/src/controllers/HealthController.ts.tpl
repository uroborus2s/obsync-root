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

  @Get('/health', {
    schema: {
      operationId: 'HealthController_check',
      response: {
        200: {
          type: 'object',
          required: ['success', 'data'],
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              required: ['name', 'status', 'timestamp'],
              properties: {
                name: { type: 'string' },
                status: { type: 'string', const: 'ok' },
                timestamp: { type: 'string' }
              }
            }
          }
        }
      }
    }
  })
  async check(_request: FastifyRequest, reply: FastifyReply): Promise<void> {
    reply.status(200).send({
      success: true,
      data: await this.healthService.getHealth()
    });
  }
}
