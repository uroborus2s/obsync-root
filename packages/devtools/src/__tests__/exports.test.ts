import { describe, expect, it } from 'vitest';
import fastify from 'fastify';
import { createContainer, asValue } from 'awilix';
import devToolsPlugin from '../index.js';

describe('@stratix/devtools exports', () => {
  it('exports a Fastify plugin function', () => {
    expect(typeof devToolsPlugin).toBe('function');
  });

  it('exposes production routes, DI, plugin, config, health and trace views', async () => {
    const app = fastify();
    const container = createContainer();
    container.register({
      manifestService: asValue({ ok: true })
    });
    app.decorate('diContainer', container);

    await app.register(devToolsPlugin, {
      path: '/_stratix',
      productionManifest: {
        schemaVersion: 1,
        project: {
          kind: 'app',
          type: 'api',
          runtime: 'web',
          presets: ['redis']
        },
        discovery: {},
        routes: [
          {
            method: 'GET',
            path: '/health',
            operationId: 'HealthController_check',
            controllerName: 'HealthController',
            handlerName: 'check',
            sourceFile: 'src/controllers/HealthController.ts'
          }
        ],
        di: {
          tokens: [
            {
              token: 'manifestService',
              className: 'ManifestService',
              dependencies: [],
              sourceFile: 'src/services/ManifestService.ts'
            }
          ],
          issues: []
        },
        modules: [],
        moduleIssues: [],
        plugins: [
          {
            name: '@stratix/redis',
            version: '^1.0.0-beta.2',
            preset: 'redis'
          }
        ],
        sourceFile: '.stratix/production-manifest.json'
      },
      config: {
        security: {
          apiKey: 'secret-value'
        }
      },
      healthCheck: async () => ({
        status: 'healthy',
        checks: { runtime: 'healthy' }
      }),
      observability: {
        getSnapshot: () => ({
          requests: {
            total: 2,
            byStatus: { '200': 2 }
          },
          traces: [
            {
              requestId: 'req-1',
              traceId: 'trace-1',
              method: 'GET',
              url: '/health',
              statusCode: 200,
              durationMs: 3,
              timestamp: '2026-06-18T00:00:00.000Z'
            }
          ]
        })
      }
    });

    const routes = await app.inject('/_stratix/api/routes');
    const di = await app.inject('/_stratix/api/di');
    const plugins = await app.inject('/_stratix/api/plugins');
    const config = await app.inject('/_stratix/api/config');
    const health = await app.inject('/_stratix/api/health');
    const traces = await app.inject('/_stratix/api/traces');

    expect(routes.json().routes[0]).toMatchObject({
      method: 'GET',
      path: '/health',
      source: 'production-manifest'
    });
    expect(di.json().tokens[0]).toMatchObject({
      token: 'manifestService',
      source: 'production-manifest'
    });
    expect(plugins.json().plugins[0]).toMatchObject({
      name: '@stratix/redis',
      preset: 'redis'
    });
    expect(config.json().config.security.apiKey).toBe('[REDACTED]');
    expect(health.json()).toMatchObject({ status: 'healthy' });
    expect(traces.json().traces[0]).toMatchObject({ traceId: 'trace-1' });

    await app.close();
  });

  it('protects API routes when an auth token is configured', async () => {
    const app = fastify();

    await app.register(devToolsPlugin, {
      path: '/_stratix',
      auth: {
        token: 'devtools-secret'
      }
    });

    const unauthorized = await app.inject('/_stratix/api/stats');
    expect(unauthorized.statusCode).toBe(401);

    const authorized = await app.inject({
      method: 'GET',
      url: '/_stratix/api/stats',
      headers: {
        'x-stratix-devtools-token': 'devtools-secret'
      }
    });
    expect(authorized.statusCode).toBe(200);
    expect(authorized.json()).toMatchObject({
      pid: process.pid,
      nodeVersion: process.version
    });

    await app.close();
  });
});
