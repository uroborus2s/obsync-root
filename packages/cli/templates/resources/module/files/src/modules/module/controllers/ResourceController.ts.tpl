import {
  Controller,
  Get,
  type FastifyReply,
  type FastifyRequest
} from '@stratix/core';
import type {{pascalName}}Service from '../services/{{pascalName}}Service.js';

@Controller()
export default class {{pascalName}}Controller {
  constructor(private readonly {{camelName}}Service: {{pascalName}}Service) {}

  @Get('{{routePath}}')
  async list(_request: FastifyRequest, reply: FastifyReply): Promise<void> {
    reply.send({
      success: true,
      data: await this.{{camelName}}Service.list()
    });
  }
}
