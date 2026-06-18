import {
  Controller,
  Get,
  type FastifyReply,
  type FastifyRequest
} from '@stratix/core';
import type ProxyRegistryService from '../services/ProxyRegistryService.js';

@Controller()
export default class HealthController {
  constructor(private readonly proxyRegistryService: ProxyRegistryService) {}

  @Get('/gateway/health')
  async check(_request: FastifyRequest, reply: FastifyReply): Promise<void> {
    reply.status(200).send({
      success: true,
      data: {
        upstreams: this.proxyRegistryService.list()
      }
    });
  }
}
