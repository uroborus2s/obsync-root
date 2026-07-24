import { asValue, type AwilixContainer } from 'awilix';
import type { FastifyInstance } from 'fastify';
import type { Logger } from 'pino';

import { assignRequestIdentity } from './request-identity.js';

export function setupRequestContext(
  fastify: FastifyInstance,
  container: AwilixContainer,
  logger?: Logger
): void {
  fastify.addHook('onRequest', async (request, reply) => {
    const { requestId } = assignRequestIdentity(request);
    const requestScope = container.createScope();

    requestScope.register({
      request: asValue(request),
      reply: asValue(reply),
      requestId: asValue(requestId),
      logger: asValue(request.log || logger),
      diScope: asValue(requestScope)
    });

    (request as any).diScope = requestScope;
    (request as any).requestId = requestId;
  });

  fastify.addHook('onResponse', async (request, _reply) => {
    try {
      const requestScope = (request as any).diScope;
      if (requestScope && typeof requestScope.dispose === 'function') {
        await requestScope.dispose();
        (request as any).diScope = null;
      }
    } catch (error) {
      logger?.error(
        { err: error },
        'Failed to dispose request scope container'
      );
    }
  });
}
