import 'reflect-metadata';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { pino } from 'pino';
import { Stratix } from '../../stratix.js';

describe('application runtime stability', () => {
  const apps: Awaited<ReturnType<typeof Stratix.run>>[] = [];
  const coreImport = pathToFileURL(resolve(process.cwd(), 'src/index.ts')).href;

  afterEach(async () => {
    await Promise.all(apps.map((app) => app.stop()));
    apps.length = 0;
    delete process.env.STRATIX_APP_TYPE;
  });

  it('handles concurrent request-scoped route execution', async () => {
    const root = await mkdtemp(join(tmpdir(), 'stratix-runtime-concurrent-'));
    await writeFile(
      join(root, 'controller.mjs'),
      [
        `import { Controller, Get } from '${coreImport}';`,
        'class PingController {',
        '  ping(request) {',
        '    return { ok: true, requestId: request.requestId };',
        '  }',
        '}',
        'Controller()(PingController);',
        'Get("/ping")(',
        '  PingController.prototype,',
        "  'ping',",
        "  Object.getOwnPropertyDescriptor(PingController.prototype, 'ping')",
        ');',
        'export { PingController };'
      ].join('\n')
    );

    const app = await Stratix.run({
      type: 'cli',
      gracefulShutdown: false,
      config: {
        server: {},
        plugins: [],
        autoLoad: {},
        discovery: {
          enabled: true,
          rootDir: root,
          patterns: ['*.mjs'],
          routing: {
            enabled: true,
            prefix: '/api'
          }
        }
      }
    });
    apps.push(app);

    const responses = await Promise.all(
      Array.from({ length: 100 }, () =>
        app.inject({ method: 'GET', url: '/api/ping' })
      )
    );
    const bodies = responses.map((response) => response.json());

    expect(responses.every((response) => response.statusCode === 200)).toBe(
      true
    );
    expect(bodies.every((body) => body.ok === true)).toBe(true);
    expect(new Set(bodies.map((body) => body.requestId)).size).toBe(100);
  });

  it('injects the same requestId that observability writes to the response header', async () => {
    const root = await mkdtemp(join(tmpdir(), 'stratix-runtime-request-id-'));
    await writeFile(
      join(root, 'request-id.mjs'),
      [
        `import { Controller, Get, Service } from '${coreImport}';`,
        'class RequestIdService {',
        '  constructor(requestId) {',
        '    this.requestId = requestId;',
        '  }',
        '  value() {',
        '    return this.requestId;',
        '  }',
        '}',
        'Service()(RequestIdService);',
        'class RequestIdController {',
        '  constructor(requestIdService) {',
        '    this.requestIdService = requestIdService;',
        '  }',
        '  show(request) {',
        '    return {',
        '      injectedRequestId: this.requestIdService.value(),',
        '      requestRequestId: request.requestId',
        '    };',
        '  }',
        '}',
        'Controller()(RequestIdController);',
        'Get("/request-id")(',
        '  RequestIdController.prototype,',
        "  'show',",
        "  Object.getOwnPropertyDescriptor(RequestIdController.prototype, 'show')",
        ');',
        'export { RequestIdService, RequestIdController };'
      ].join('\n')
    );

    const app = await Stratix.run({
      type: 'cli',
      gracefulShutdown: false,
      config: {
        server: {},
        plugins: [],
        autoLoad: {},
        observability: {
          enabled: true,
          requestIdHeader: 'x-request-id',
          traceIdHeader: 'x-trace-id',
          health: { enabled: false },
          metrics: { enabled: false },
          traces: { enabled: false }
        },
        discovery: {
          enabled: true,
          rootDir: root,
          patterns: ['*.mjs'],
          routing: {
            enabled: true,
            prefix: '/api'
          }
        }
      }
    });
    apps.push(app);

    const response = await app.inject({
      method: 'GET',
      url: '/api/request-id',
      headers: {
        'x-request-id': 'client-request-id',
        'x-trace-id': 'client-trace-id'
      }
    });
    const body = response.json();

    expect(response.statusCode).toBe(200);
    expect(response.headers['x-request-id']).toBe('client-request-id');
    expect(response.headers['x-trace-id']).toBe('client-trace-id');
    expect(body.requestRequestId).toBe('client-request-id');
    expect(body.injectedRequestId).toBe('client-request-id');
  });

  it('starts and stops multiple cli applications concurrently', async () => {
    const startedApps = await Promise.all(
      Array.from({ length: 8 }, () =>
        Stratix.run({
          type: 'cli',
          gracefulShutdown: false,
          config: {
            server: {},
            plugins: [],
            autoLoad: {},
            discovery: { enabled: false }
          }
        })
      )
    );

    await Promise.all(startedApps.map((app) => app.stop()));

    expect(startedApps).toHaveLength(8);
  });

  it('accepts Fastify child-compatible Pino loggers without unity warnings', async () => {
    const logLines: string[] = [];
    const logger = pino(
      { level: 'debug' },
      {
        write(line: string) {
          logLines.push(line);
        }
      }
    );

    const app = await Stratix.run({
      type: 'cli',
      gracefulShutdown: false,
      logger,
      config: {
        server: {},
        plugins: [],
        autoLoad: {},
        discovery: { enabled: false }
      }
    });
    apps.push(app);

    const renderedLogs = logLines.join('\n');
    expect(renderedLogs).toContain('Logger source verified');
    expect(renderedLogs).not.toContain('Logger unity check failed');
    expect(renderedLogs).not.toContain('Logger compatibility check failed');
  });

  it('detects application type from STRATIX_APP_TYPE when type is auto', async () => {
    process.env.STRATIX_APP_TYPE = 'worker';

    const app = await Stratix.run({
      type: 'auto',
      gracefulShutdown: false,
      config: {
        server: {},
        plugins: [],
        autoLoad: {},
        discovery: { enabled: false }
      }
    });
    apps.push(app);

    expect(app.type).toBe('worker');
  });

  it('runs startup hooks in order', async () => {
    const calls: string[] = [];

    const app = await Stratix.run({
      type: 'cli',
      gracefulShutdown: false,
      config: {
        server: {},
        plugins: [],
        autoLoad: {},
        discovery: { enabled: false },
        hooks: {
          afterFastifyCreated: async () => {
            calls.push('afterFastifyCreated');
          },
          beforeStart: async () => {
            calls.push('beforeStart');
          },
          afterStart: async () => {
            calls.push('afterStart');
          }
        }
      }
    });
    apps.push(app);

    expect(calls).toEqual(['afterFastifyCreated', 'beforeStart', 'afterStart']);
  });

  it('applies runtime server overrides without leaking listen into Fastify options', async () => {
    const app = await Stratix.run({
      type: 'cli',
      gracefulShutdown: false,
      server: {
        keepAliveTimeout: 1234,
        listen: false
      },
      config: {
        server: {},
        plugins: [],
        autoLoad: {},
        discovery: { enabled: false }
      }
    });
    apps.push(app);

    expect(app.config.server.keepAliveTimeout).toBe(1234);
    expect('listen' in app.config.server).toBe(false);
  });

  it('starts a web server on an ephemeral port when listen is enabled', async () => {
    const app = await Stratix.run({
      type: 'web',
      gracefulShutdown: false,
      config: {
        server: {
          host: '127.0.0.1',
          port: 0
        },
        plugins: [],
        autoLoad: {},
        discovery: { enabled: false }
      }
    });
    apps.push(app);

    expect(app.isRunning()).toBe(true);
    expect(app.getAddress()).toMatchObject({
      address: '127.0.0.1',
      family: 'IPv4'
    });
  });

  it('installs graceful shutdown signal handlers when enabled', async () => {
    const beforeSigterm = new Set(process.listeners('SIGTERM'));
    const beforeSigint = new Set(process.listeners('SIGINT'));

    try {
      const app = await Stratix.run({
        type: 'cli',
        shutdownTimeout: 50,
        config: {
          server: {},
          plugins: [],
          autoLoad: {},
          discovery: { enabled: false }
        }
      });
      apps.push(app);

      expect(process.listeners('SIGTERM').length).toBeGreaterThan(
        beforeSigterm.size
      );
      expect(process.listeners('SIGINT').length).toBeGreaterThan(
        beforeSigint.size
      );
    } finally {
      for (const listener of process.listeners('SIGTERM')) {
        if (!beforeSigterm.has(listener)) {
          process.removeListener('SIGTERM', listener);
        }
      }
      for (const listener of process.listeners('SIGINT')) {
        if (!beforeSigint.has(listener)) {
          process.removeListener('SIGINT', listener);
        }
      }
    }
  });

  it('runs shutdown handlers once per lifecycle cycle', async () => {
    let closeCount = 0;

    for (let index = 0; index < 12; index += 1) {
      const app = await Stratix.run({
        type: 'cli',
        gracefulShutdown: false,
        config: {
          server: {},
          plugins: [],
          autoLoad: {},
          discovery: { enabled: false },
          hooks: {
            beforeClose: async () => {
              closeCount += 1;
            }
          }
        }
      });
      await app.stop();
    }

    expect(closeCount).toBe(12);
  });

  it('runs the full shutdown lifecycle when close is called', async () => {
    let closeCount = 0;

    const app = await Stratix.run({
      type: 'cli',
      gracefulShutdown: false,
      config: {
        server: {},
        plugins: [],
        autoLoad: {},
        discovery: { enabled: false },
        hooks: {
          beforeClose: async () => {
            closeCount += 1;
          }
        }
      }
    });

    await app.close();

    expect(closeCount).toBe(1);
    expect(app.fastify.server.listening).toBe(false);
  });

  it('deduplicates concurrent close calls during shutdown', async () => {
    let closeCount = 0;
    let releaseShutdown: (() => void) | undefined;

    const app = await Stratix.run({
      type: 'cli',
      gracefulShutdown: false,
      config: {
        server: {},
        plugins: [],
        autoLoad: {},
        discovery: { enabled: false },
        hooks: {
          beforeClose: async () => {
            closeCount += 1;
            await new Promise<void>((resolve) => {
              releaseShutdown = resolve;
            });
          }
        }
      }
    });

    const firstClose = app.close();
    await vi.waitFor(() => expect(closeCount).toBe(1));
    const secondClose = app.close();

    releaseShutdown?.();
    await Promise.all([firstClose, secondClose]);

    expect(closeCount).toBe(1);
  });

  it('returns a fresh application from restart without reusing shutdown handlers', async () => {
    let firstCloseCount = 0;
    let secondCloseCount = 0;

    const firstApp = await Stratix.run({
      type: 'cli',
      gracefulShutdown: false,
      instanceId: 'first',
      config: {
        server: {},
        plugins: [],
        autoLoad: {},
        discovery: { enabled: false },
        hooks: {
          beforeClose: async () => {
            firstCloseCount += 1;
          }
        }
      }
    });

    const secondApp = await firstApp.restart({
      type: 'cli',
      gracefulShutdown: false,
      instanceId: 'second',
      config: {
        server: {},
        plugins: [],
        autoLoad: {},
        discovery: { enabled: false },
        hooks: {
          beforeClose: async () => {
            secondCloseCount += 1;
          }
        }
      }
    });

    expect(secondApp).not.toBe(firstApp);
    expect(secondApp.instanceId).toBe('second');
    expect(firstCloseCount).toBe(1);

    await secondApp.stop();

    expect(firstCloseCount).toBe(1);
    expect(secondCloseCount).toBe(1);
  });
});
