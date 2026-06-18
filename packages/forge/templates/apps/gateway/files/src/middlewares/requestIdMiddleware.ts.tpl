import type { FastifyReply, FastifyRequest } from '@stratix/core';
import middlewareConfig from '../config/middlewareConfig.js';

export async function requestIdMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const headerName = middlewareConfig.requestIdHeader;
  const currentValue = request.headers[headerName] || request.id;

  reply.header(headerName, String(currentValue));
}
