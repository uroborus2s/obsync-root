import type { FastifyInstance } from 'fastify';
import type { Logger } from 'pino';

import type {
  StratixConfig,
  StratixHealthCheckResult,
  StratixRequestObservation
} from '../types/index.js';
import { assignRequestIdentity } from './request-identity.js';

interface StratixTraceEntry extends StratixRequestObservation {}

interface StratixObservabilityState {
  requests: {
    total: number;
    byStatus: Record<string, number>;
  };
  traces: StratixTraceEntry[];
  getSnapshot(): {
    requests: {
      total: number;
      byStatus: Record<string, number>;
    };
    traces: StratixTraceEntry[];
    uptime: number;
  };
}

export interface ObservabilityBootstrapOptions {
  logger?: Logger;
  getRequestId: (request: unknown) => string | undefined;
}

export function setupObservability(
  fastify: FastifyInstance,
  config: StratixConfig,
  options: ObservabilityBootstrapOptions
): void {
  const observabilityConfig = config.observability;
  if (observabilityConfig?.enabled !== true) {
    return;
  }

  const { getRequestId, logger } = options;
  const startedAt = Date.now();
  const requestIdHeader = (
    observabilityConfig.requestIdHeader || 'x-request-id'
  ).toLowerCase();
  const traceIdHeader = (
    observabilityConfig.traceIdHeader || 'x-trace-id'
  ).toLowerCase();
  const maxTraceEntries = observabilityConfig.traces?.maxEntries ?? 100;
  const metricsProvider = observabilityConfig.metrics?.provider;
  const tracingProvider = observabilityConfig.traces?.provider;
  const healthContributors = observabilityConfig.health?.contributors || [];
  const state: StratixObservabilityState = {
    requests: {
      total: 0,
      byStatus: {}
    },
    traces: [],
    getSnapshot: () => ({
      requests: {
        total: state.requests.total,
        byStatus: { ...state.requests.byStatus }
      },
      traces: [...state.traces],
      uptime: Math.max(0, Date.now() - startedAt)
    })
  };

  fastify.decorate('stratixObservability', state);

  fastify.addHook('onRequest', async (request) => {
    assignRequestIdentity(request, {
      requestIdHeader,
      traceIdHeader,
      includeTraceId: true
    });
    (request as any).stratixStartedAt = Date.now();
    state.requests.total += 1;
  });

  fastify.addHook('onSend', async (request, reply, payload) => {
    const requestId = getRequestId(request);
    const traceId = (request as any).traceId;
    if (requestId) {
      reply.header(requestIdHeader, requestId);
    }
    if (typeof traceId === 'string') {
      reply.header(traceIdHeader, traceId);
    }
    return payload;
  });

  fastify.addHook('onResponse', async (request, reply) => {
    const statusCode = reply.statusCode;
    const statusKey = String(statusCode);
    const started = (request as any).stratixStartedAt;
    const durationMs =
      typeof started === 'number' ? Math.max(0, Date.now() - started) : 0;

    state.requests.byStatus[statusKey] =
      (state.requests.byStatus[statusKey] || 0) + 1;

    const event: StratixRequestObservation = {
      requestId: getRequestId(request),
      traceId: (request as any).traceId,
      method: request.method,
      url: request.url,
      statusCode,
      durationMs,
      timestamp: new Date().toISOString()
    };

    try {
      await metricsProvider?.recordRequest?.(event);
    } catch (error) {
      logger?.error({ err: error }, 'Metrics provider failed');
    }

    if (observabilityConfig.traces?.enabled !== false) {
      state.traces.push(event);
      while (state.traces.length > maxTraceEntries) {
        state.traces.shift();
      }
      try {
        await tracingProvider?.recordTrace?.(event);
      } catch (error) {
        logger?.error({ err: error }, 'Tracing provider failed');
      }
    }
  });

  if (observabilityConfig.health?.enabled !== false) {
    const healthBasePath = observabilityConfig.health?.basePath || '/health';
    const healthPayload = async (includeContributors: boolean) => {
      const checks: Record<string, unknown> = {
        runtime: 'healthy'
      };
      let status: 'healthy' | 'unhealthy' = 'healthy';

      if (includeContributors) {
        for (const contributor of healthContributors) {
          try {
            const result = await contributor.check();
            checks[contributor.name] = result;
            if (result.status !== 'healthy') {
              status = 'unhealthy';
            }
          } catch (error) {
            status = 'unhealthy';
            checks[contributor.name] = healthContributorError(error);
          }
        }
      }

      return {
        status,
        uptime: Math.max(0, Date.now() - startedAt),
        timestamp: new Date().toISOString(),
        checks
      };
    };
    const readinessPayload = async (_request: unknown, reply: any) => {
      const payload = await healthPayload(true);
      if (payload.status !== 'healthy') {
        reply.status(503);
      }
      return payload;
    };

    fastify.get(healthBasePath, readinessPayload);
    fastify.get(`${healthBasePath}/ready`, readinessPayload);
    fastify.get(`${healthBasePath}/live`, async () => healthPayload(false));
  }

  if (observabilityConfig.metrics?.enabled !== false) {
    const metricsPath = observabilityConfig.metrics?.path || '/metrics';
    fastify.get(metricsPath, async () => {
      const snapshot = state.getSnapshot();
      if (metricsProvider?.snapshot) {
        try {
          return {
            ...snapshot,
            provider: await metricsProvider.snapshot()
          };
        } catch (error) {
          logger?.error({ err: error }, 'Metrics provider failed');
        }
      }
      return snapshot;
    });
  }
}

function healthContributorError(error: unknown): StratixHealthCheckResult {
  return {
    status: 'unhealthy',
    details: {
      message: error instanceof Error ? error.message : String(error)
    }
  };
}
