import fastifyStatic from '@fastify/static';
// @ts-ignore
import fastifyWebsocket from '@fastify/websocket';
import type { StratixConfig } from '@stratix/core';
import type { AwilixContainer } from 'awilix';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

interface ProductionManifestView {
  [key: string]: unknown;
  routes: Array<Record<string, unknown>>;
  di: {
    tokens: Array<Record<string, unknown>>;
    issues: Array<Record<string, unknown>>;
  };
  plugins: Array<Record<string, unknown>>;
}

export interface DevToolsOptions {
  path?: string;
  enable?: boolean;
  /**
   * Defaults to local requests only. Set to true only when a trusted upstream
   * already protects the DevTools route.
   */
  allowRemote?: boolean;
  auth?:
    | {
        token: string;
        headerName?: string;
      }
    | ((request: FastifyRequest) => boolean | Promise<boolean>);
  productionManifest?: ProductionManifestView;
  config?: Partial<StratixConfig> | Record<string, unknown>;
  healthCheck?: () =>
    | Promise<Record<string, unknown>>
    | Record<string, unknown>;
  observability?: {
    getSnapshot?: () => Record<string, unknown>;
  };
}

const logClients = new Set<any>();
let isStdoutHooked = false;
let stdoutHookRefCount = 0;
let originalStdoutWrite:
  | ((chunk: any, ...args: any[]) => boolean)
  | undefined;
let originalStderrWrite:
  | ((chunk: any, ...args: any[]) => boolean)
  | undefined;

function hookStdout() {
  stdoutHookRefCount++;
  if (isStdoutHooked) return;
  isStdoutHooked = true;

  originalStdoutWrite = process.stdout.write.bind(process.stdout) as (
    chunk: any,
    ...args: any[]
  ) => boolean;
  originalStderrWrite = process.stderr.write.bind(process.stderr) as (
    chunk: any,
    ...args: any[]
  ) => boolean;

  function broadcast(chunk: any) {
    const msg = chunk.toString();
    for (const client of logClients) {
      if (client.readyState === 1) {
        client.send(msg);
      }
    }
  }

  // @ts-ignore
  process.stdout.write = (chunk, ...args) => {
    broadcast(chunk);
    // @ts-ignore
    return originalStdoutWrite?.(chunk, ...args) ?? true;
  };

  // @ts-ignore
  process.stderr.write = (chunk, ...args) => {
    broadcast(chunk);
    // @ts-ignore
    return originalStderrWrite?.(chunk, ...args) ?? true;
  };
}

function unhookStdout() {
  stdoutHookRefCount = Math.max(0, stdoutHookRefCount - 1);
  if (stdoutHookRefCount > 0 || !isStdoutHooked) {
    return;
  }

  if (originalStdoutWrite) {
    process.stdout.write = originalStdoutWrite as typeof process.stdout.write;
  }
  if (originalStderrWrite) {
    process.stderr.write = originalStderrWrite as typeof process.stderr.write;
  }

  originalStdoutWrite = undefined;
  originalStderrWrite = undefined;
  isStdoutHooked = false;
}

function getProductionManifest(
  fastify: FastifyInstance,
  options: DevToolsOptions
): ProductionManifestView | undefined {
  return (
    options.productionManifest ||
    ((fastify as any).stratixProductionManifest as
      | ProductionManifestView
      | undefined)
  );
}

function getConfig(
  fastify: FastifyInstance,
  options: DevToolsOptions
): Record<string, unknown> {
  return (options.config || (fastify as any).stratixConfig || {}) as Record<
    string,
    unknown
  >;
}

function isSensitiveKey(key: string): boolean {
  return /(password|secret|token|credential|apikey|api_key|privatekey|private_key)/i.test(
    key
  );
}

function redact(value: unknown, key = ''): unknown {
  if (isSensitiveKey(key)) {
    return '[REDACTED]';
  }

  if (Array.isArray(value)) {
    return value.map((entry) => redact(entry));
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(
        ([entryKey, entryValue]) => [entryKey, redact(entryValue, entryKey)]
      )
    );
  }

  return value;
}

function containerTokens(container?: AwilixContainer): unknown[] {
  if (!container) {
    return [];
  }

  return Object.keys(container.registrations).map((key) => {
    const registration = container.registrations[key] as any;
    return {
      token: key,
      lifetime: registration.lifetime,
      injectionMode: registration.injectionMode,
      source: 'runtime-container'
    };
  });
}

function isLoopbackAddress(address?: string): boolean {
  return (
    !address ||
    address === '127.0.0.1' ||
    address === '::1' ||
    address === 'localhost' ||
    address.startsWith('::ffff:127.')
  );
}

async function authorizeDevToolsRequest(
  request: FastifyRequest,
  reply: FastifyReply,
  options: DevToolsOptions
): Promise<void> {
  if (options.allowRemote !== true && !isLoopbackAddress(request.ip)) {
    await reply.code(403).send({ error: 'DevTools is restricted to local requests' });
    return;
  }

  if (!options.auth) {
    return;
  }

  const authorized =
    typeof options.auth === 'function'
      ? await options.auth(request)
      : request.headers[
          (options.auth.headerName || 'x-stratix-devtools-token').toLowerCase()
        ] === options.auth.token;

  if (!authorized) {
    await reply.code(401).send({ error: 'Unauthorized DevTools request' });
  }
}

export default async function devToolsPlugin(
  fastify: FastifyInstance,
  options: DevToolsOptions
) {
  if (options.enable === false) {
    return;
  }

  const basePath = options.path || '/_stratix';

  fastify.log.info(`🛠️  DevTools enabled at ${basePath}`);

  await fastify.register(fastifyWebsocket);
  hookStdout();

  const moduleDir = path.dirname(fileURLToPath(import.meta.url));
  const clientDistPath = path.join(moduleDir, 'client');
  const collectedRoutes: any[] = [];
  const apiAccess = {
    preHandler: async (request: FastifyRequest, reply: FastifyReply) =>
      authorizeDevToolsRequest(request, reply, options)
  };
  const pluginLogClients = new Set<any>();

  fastify.addHook('onRoute', (routeOptions) => {
    collectedRoutes.push({
      method: routeOptions.method,
      path: routeOptions.url,
      source: 'runtime'
    });
  });

  if (fs.existsSync(clientDistPath)) {
    fastify.register(fastifyStatic, {
      root: clientDistPath,
      prefix: basePath,
      wildcard: false
    });

    fastify.get(basePath, (_req, reply) => {
      (reply as any).sendFile('index.html');
    });
  }

  const apiPrefix = `${basePath}/api`;

  fastify.addHook('onClose', async () => {
    for (const client of pluginLogClients) {
      logClients.delete(client);
    }
    pluginLogClients.clear();
    unhookStdout();
  });

  fastify.get(`${apiPrefix}/stats`, apiAccess, async () => {
    return {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      pid: process.pid,
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch
    };
  });

  fastify.get(`${apiPrefix}/routes`, apiAccess, async () => {
    const manifest = getProductionManifest(fastify, options);
    if (manifest) {
      return {
        routes: manifest.routes.map(
          (route: ProductionManifestView['routes'][number]) => ({
            ...route,
            source: 'production-manifest'
          })
        )
      };
    }
    return { routes: collectedRoutes };
  });

  fastify.get(`${apiPrefix}/container`, apiAccess, async () => {
    const container = (fastify as any).diContainer as
      | AwilixContainer
      | undefined;
    return { services: containerTokens(container) };
  });

  fastify.get(`${apiPrefix}/di`, apiAccess, async () => {
    const manifest = getProductionManifest(fastify, options);
    if (manifest) {
      return {
        tokens: manifest.di.tokens.map(
          (token: ProductionManifestView['di']['tokens'][number]) => ({
            ...token,
            source: 'production-manifest'
          })
        ),
        issues: manifest.di.issues
      };
    }

    const container = (fastify as any).diContainer as
      | AwilixContainer
      | undefined;
    return { tokens: containerTokens(container), issues: [] };
  });

  fastify.get(`${apiPrefix}/plugins`, apiAccess, async () => {
    const manifest = getProductionManifest(fastify, options);
    const config = getConfig(fastify, options);
    return {
      plugins:
        manifest?.plugins ||
        ((config.plugins as unknown[]) || []).map((plugin: any) => ({
          name: plugin.name,
          enabled: plugin.enabled !== false,
          source: 'runtime-config'
        }))
    };
  });

  fastify.get(`${apiPrefix}/config`, apiAccess, async () => {
    return {
      config: redact(getConfig(fastify, options))
    };
  });

  fastify.get(`${apiPrefix}/health`, apiAccess, async () => {
    const healthCheck =
      options.healthCheck || ((fastify as any).stratixHealthCheck as any);
    if (typeof healthCheck === 'function') {
      return await healthCheck();
    }
    return {
      status: 'healthy',
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    };
  });

  fastify.get(`${apiPrefix}/traces`, apiAccess, async () => {
    const observability =
      options.observability || (fastify as any).stratixObservability;
    const snapshot =
      typeof observability?.getSnapshot === 'function'
        ? observability.getSnapshot()
        : { traces: [] };
    return {
      traces: (snapshot as any).traces || [],
      requests: (snapshot as any).requests
    };
  });

  fastify.get(`${apiPrefix}/logs`, { ...apiAccess, websocket: true }, (connection: any) => {
    logClients.add(connection.socket);
    pluginLogClients.add(connection.socket);

    connection.socket.on('close', () => {
      logClients.delete(connection.socket);
      pluginLogClients.delete(connection.socket);
    });
  });
}
