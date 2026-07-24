import type { FastifyInstance } from 'fastify';
import type { Logger } from 'pino';

import { createErrorEnvelope } from '../contracts/error-envelope.js';
import type { SecurityConfig, StratixConfig } from '../types/index.js';

export interface SecurityBootstrapOptions {
  logger?: Logger;
  getRequestId: (request: unknown) => string | undefined;
}

export function setupSecurity(
  fastify: FastifyInstance,
  config: StratixConfig,
  options: SecurityBootstrapOptions
): void {
  const securityConfig = config.security;
  if (securityConfig?.enabled !== true) {
    return;
  }

  const { getRequestId, logger } = options;
  const rateLimitStore = new Map<string, { count: number; resetAt: number }>();
  const observedPaths = observabilityPaths(config);

  fastify.addHook('onRequest', async (request, reply) => {
    if (isCorsPreflight(request.method, securityConfig.cors)) {
      applyCorsHeaders(request, reply, securityConfig.cors);
      reply.status(204).send();
      return reply;
    }

    const rateLimit = securityConfig.rateLimit;
    if (
      rateLimit?.enabled === true &&
      !isObservabilityPath(request.url, observedPaths)
    ) {
      const max = rateLimit.max ?? 100;
      const windowMs = rateLimit.windowMs ?? 60_000;
      const key = rateLimitKey(request, rateLimit.trustProxy === true);
      const now = Date.now();
      if (rateLimit.provider) {
        try {
          const decision = await rateLimit.provider.consume({
            key,
            max,
            windowMs,
            now,
            request
          });
          if (!decision.allowed) {
            reply.header(
              'retry-after',
              decision.retryAfterSeconds ?? Math.ceil(windowMs / 1000)
            );
            reply.status(429).send(
              createErrorEnvelope({
                code: 'RATE_LIMITED',
                message: 'Too Many Requests',
                statusCode: 429,
                path: request.url,
                requestId: getRequestId(request)
              })
            );
            return reply;
          }
          return;
        } catch (error) {
          logger?.error({ err: error }, 'Rate limit provider failed');
        }
      }

      const current = rateLimitStore.get(key);
      const bucket =
        current && current.resetAt > now
          ? current
          : { count: 0, resetAt: now + windowMs };

      if (bucket.count >= max) {
        reply.header('retry-after', Math.ceil((bucket.resetAt - now) / 1000));
        reply.status(429).send(
          createErrorEnvelope({
            code: 'RATE_LIMITED',
            message: 'Too Many Requests',
            statusCode: 429,
            path: request.url,
            requestId: getRequestId(request)
          })
        );
        return reply;
      }

      bucket.count += 1;
      rateLimitStore.set(key, bucket);
    }
  });

  fastify.addHook('onSend', async (request, reply, payload) => {
    applySecurityHeaders(reply, securityConfig.headers);
    applyCorsHeaders(request, reply, securityConfig.cors);
    return payload;
  });
}

function observabilityPaths(config: StratixConfig): string[] {
  const paths: string[] = [];
  if (config.observability?.health?.enabled !== false) {
    const basePath = config.observability?.health?.basePath || '/health';
    paths.push(basePath, `${basePath}/ready`, `${basePath}/live`);
  }
  if (config.observability?.metrics?.enabled !== false) {
    paths.push(config.observability?.metrics?.path || '/metrics');
  }
  return paths;
}

function isObservabilityPath(url: string, paths: string[]): boolean {
  const pathname = url.split('?')[0];
  return paths.includes(pathname);
}

function rateLimitKey(request: any, trustProxy: boolean): string {
  const forwardedFor = request.headers['x-forwarded-for'];
  if (trustProxy && typeof forwardedFor === 'string') {
    const forwardedClient = forwardedFor.split(',')[0]?.trim();
    if (forwardedClient) {
      return forwardedClient;
    }
  }
  return request.ip || request.socket?.remoteAddress || 'unknown';
}

function isCorsPreflight(
  method: string,
  cors: SecurityConfig['cors']
): boolean {
  return method === 'OPTIONS' && Boolean(cors?.enabled);
}

function applyCorsHeaders(
  request: any,
  reply: any,
  cors: SecurityConfig['cors']
): void {
  if (!cors?.enabled) {
    return;
  }

  const origin = request.headers.origin;
  const origins = cors.origins ?? '*';
  const allowedOrigins = Array.isArray(origins) ? origins : [origins];
  const allowAny = allowedOrigins.includes('*');

  if (
    typeof origin === 'string' &&
    (allowAny || allowedOrigins.includes(origin))
  ) {
    reply.header('access-control-allow-origin', allowAny ? '*' : origin);
  }
  if (cors.credentials === true) {
    reply.header('access-control-allow-credentials', 'true');
  }
  reply.header(
    'access-control-allow-methods',
    (cors.methods || ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']).join(
      ', '
    )
  );
  reply.header('access-control-allow-headers', 'content-type, authorization');
}

function applySecurityHeaders(
  reply: any,
  headers: SecurityConfig['headers']
): void {
  if (
    headers === false ||
    (typeof headers === 'object' && headers.enabled === false)
  ) {
    return;
  }

  const headerOptions = typeof headers === 'object' ? headers : {};
  reply.header('x-content-type-options', 'nosniff');
  reply.header('x-frame-options', headerOptions.frameOptions || 'DENY');
  reply.header(
    'referrer-policy',
    headerOptions.referrerPolicy || 'no-referrer'
  );

  if (headerOptions.contentSecurityPolicy !== false) {
    reply.header(
      'content-security-policy',
      typeof headerOptions.contentSecurityPolicy === 'string'
        ? headerOptions.contentSecurityPolicy
        : "default-src 'self'"
    );
  }
}
