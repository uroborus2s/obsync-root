import 'reflect-metadata';
import { afterEach, describe, expect, it } from 'vitest';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { PluginLoadError } from '../../errors/index.js';
import { Stratix } from '../../stratix.js';

describe('application discovery bootstrap integration', () => {
  const apps: Awaited<ReturnType<typeof Stratix.run>>[] = [];
  const coreImport = pathToFileURL(resolve(process.cwd(), 'src/index.ts')).href;

  afterEach(async () => {
    await Promise.all(apps.map((app) => app.stop()));
    apps.length = 0;
  });

  it('runs the unified discovery pipeline during Stratix.run()', async () => {
    const root = await mkdtemp(join(tmpdir(), 'stratix-bootstrap-discovery-'));
    await writeFile(
      join(root, 'module.mjs'),
      [
        `import { Controller, Get, Service } from '${coreImport}';`,
        'class HealthService {',
        "  name() { return 'stratix'; }",
        '}',
        'Service()(HealthService);',
        'class HealthController {',
        '  constructor(healthService, requestId) {',
        '    this.healthService = healthService;',
        '    this.requestId = requestId;',
        '  }',
        '  health() {',
        '    return { service: this.healthService.name(), requestScoped: typeof this.requestId === "string" };',
        '  }',
        '}',
        'Controller()(HealthController);',
        'Get("/health")(',
        '  HealthController.prototype,',
        "  'health',",
        "  Object.getOwnPropertyDescriptor(HealthController.prototype, 'health')",
        ');',
        'class PlainUtility {}',
        'export { HealthService, HealthController, PlainUtility };'
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

    expect(app.diContainer.hasRegistration('healthService')).toBe(true);
    expect(app.diContainer.hasRegistration('healthController')).toBe(true);
    expect(app.diContainer.hasRegistration('plainUtility')).toBe(false);

    const response = await app.inject({ method: 'GET', url: '/api/health' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      service: 'stratix',
      requestScoped: true
    });
  });

  it('returns the unified envelope when a route response violates its schema', async () => {
    const root = await mkdtemp(
      join(tmpdir(), 'stratix-bootstrap-response-validation-')
    );
    await writeFile(
      join(root, 'module.mjs'),
      [
        `import { Controller, Get } from '${coreImport}';`,
        'class BrokenController {',
        '  broken() {',
        '    return {};',
        '  }',
        '}',
        'Controller()(BrokenController);',
        'Get("/broken", {',
        '  schema: {',
        '    response: {',
        '      200: {',
        "        type: 'object',",
        "        required: ['ok'],",
        '        properties: {',
        "          ok: { type: 'boolean' }",
        '        }',
        '      }',
        '    }',
        '  }',
        '})(',
        '  BrokenController.prototype,',
        "  'broken',",
        "  Object.getOwnPropertyDescriptor(BrokenController.prototype, 'broken')",
        ');',
        'export { BrokenController };'
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

    const response = await app.inject({ method: 'GET', url: '/api/broken' });

    expect(response.statusCode).toBe(500);
    expect(response.json().error).toMatchObject({
      code: 'RESPONSE_VALIDATION_ERROR',
      message: 'Response Validation Error',
      statusCode: 500,
      path: '/api/broken'
    });
  });

  it('does not scan legacy executors directories during default bootstrap discovery', async () => {
    const root = await mkdtemp(
      join(tmpdir(), 'stratix-bootstrap-no-executors-')
    );
    const executorsDir = join(root, 'executors');
    await mkdir(executorsDir);
    await writeFile(
      join(executorsDir, 'legacy.mjs'),
      [
        `import { Service } from '${coreImport}';`,
        'class LegacyExecutorNamedService {}',
        'Service()(LegacyExecutorNamedService);',
        'export { LegacyExecutorNamedService };'
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
          rootDir: root
        }
      }
    });
    apps.push(app);

    expect(app.diContainer.hasRegistration('legacyExecutorNamedService')).toBe(
      false
    );
  });

  it('loads a production manifest and skips runtime discovery when configured', async () => {
    const root = await mkdtemp(
      join(tmpdir(), 'stratix-bootstrap-production-manifest-')
    );
    await writeFile(
      join(root, 'module.mjs'),
      [
        `import { Service } from '${coreImport}';`,
        'class ManifestSkippedService {}',
        'Service()(ManifestSkippedService);',
        'export { ManifestSkippedService };'
      ].join('\n')
    );
    const manifestPath = join(root, 'production-manifest.json');
    await writeFile(
      manifestPath,
      JSON.stringify(
        {
          schemaVersion: 1,
          generatedAt: '2026-06-18T00:00:00.000Z',
          project: {
            kind: 'app',
            type: 'api',
            runtime: 'web',
            presets: []
          },
          discovery: {
            rootDir: '.',
            patterns: ['*.mjs'],
            routing: {
              enabled: true
            }
          },
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
                token: 'manifestSkippedService',
                className: 'ManifestSkippedService',
                dependencies: [],
                sourceFile: 'module.mjs'
              }
            ],
            issues: []
          },
          modules: [],
          moduleIssues: [],
          plugins: []
        },
        null,
        2
      )
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
          productionManifest: {
            enabled: true,
            path: manifestPath,
            skipRuntimeDiscovery: true
          }
        }
      }
    });
    apps.push(app);

    expect(app.productionManifest?.sourceFile).toBe(manifestPath);
    expect(app.productionManifest?.routes).toHaveLength(1);
    expect(app.productionManifest?.di.tokens).toHaveLength(1);
    expect(app.diContainer.hasRegistration('manifestSkippedService')).toBe(
      false
    );
  });

  it('registers application components from production manifest source files without glob discovery', async () => {
    const root = await mkdtemp(
      join(tmpdir(), 'stratix-bootstrap-manifest-registration-')
    );
    await writeFile(
      join(root, 'manifest-module.mjs'),
      [
        `import { Controller, Get, Service } from '${coreImport}';`,
        'class ManifestHealthService {',
        "  status() { return 'manifest'; }",
        '}',
        'Service()(ManifestHealthService);',
        'class ManifestHealthController {',
        '  constructor(manifestHealthService) {',
        '    this.manifestHealthService = manifestHealthService;',
        '  }',
        '  check() {',
        '    return { ok: true, source: this.manifestHealthService.status() };',
        '  }',
        '}',
        'Controller()(ManifestHealthController);',
        'Get("/manifest-health")(',
        '  ManifestHealthController.prototype,',
        "  'check',",
        "  Object.getOwnPropertyDescriptor(ManifestHealthController.prototype, 'check')",
        ');',
        'export { ManifestHealthService, ManifestHealthController };'
      ].join('\n')
    );
    await writeFile(
      join(root, 'glob-only-module.mjs'),
      [
        `import { Service } from '${coreImport}';`,
        'class GlobOnlyService {}',
        'Service()(GlobOnlyService);',
        'export { GlobOnlyService };'
      ].join('\n')
    );
    const manifestPath = join(root, 'production-manifest.json');
    await writeFile(
      manifestPath,
      JSON.stringify(
        {
          schemaVersion: 1,
          generatedAt: '2026-06-18T00:00:00.000Z',
          project: {
            kind: 'app',
            type: 'api',
            runtime: 'web',
            presets: []
          },
          discovery: {
            rootDir: '.',
            patterns: ['*.mjs'],
            routing: {
              enabled: true
            }
          },
          routes: [
            {
              method: 'GET',
              path: '/manifest-health',
              operationId: 'ManifestHealthController_check',
              controllerName: 'ManifestHealthController',
              handlerName: 'check',
              sourceFile: 'manifest-module.mjs'
            }
          ],
          di: {
            tokens: [
              {
                token: 'manifestHealthService',
                className: 'ManifestHealthService',
                dependencies: [],
                sourceFile: 'manifest-module.mjs'
              }
            ],
            issues: []
          },
          modules: [],
          moduleIssues: [],
          plugins: []
        },
        null,
        2
      )
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
          },
          productionManifest: {
            enabled: true,
            path: manifestPath,
            skipRuntimeDiscovery: true,
            registerFromManifest: true
          }
        }
      }
    });
    apps.push(app);

    const response = await app.inject({
      method: 'GET',
      url: '/api/manifest-health'
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ ok: true, source: 'manifest' });
    expect(app.diContainer.hasRegistration('manifestHealthService')).toBe(true);
    expect(app.diContainer.hasRegistration('globOnlyService')).toBe(false);
  });

  it('applies production observability and security presets', async () => {
    const app = await Stratix.run({
      type: 'cli',
      gracefulShutdown: false,
      config: {
        server: {},
        plugins: [],
        autoLoad: {},
        discovery: { enabled: false },
        observability: {
          enabled: true,
          health: { enabled: true, basePath: '/healthz' },
          metrics: { enabled: true, path: '/metrics' },
          traces: { enabled: true, maxEntries: 5 }
        },
        security: {
          enabled: true,
          cors: {
            enabled: true,
            origins: ['https://console.example.com']
          },
          headers: {
            enabled: true,
            contentSecurityPolicy: "default-src 'self'"
          },
          rateLimit: {
            enabled: true,
            max: 1,
            windowMs: 60_000
          }
        }
      }
    });
    apps.push(app);

    const health = await app.inject({
      method: 'GET',
      url: '/healthz',
      headers: {
        origin: 'https://console.example.com'
      }
    });
    const metrics = await app.inject({ method: 'GET', url: '/metrics' });
    const limited = await app.inject({ method: 'GET', url: '/missing' });
    const rateLimited = await app.inject({ method: 'GET', url: '/missing' });

    expect(health.statusCode).toBe(200);
    expect(health.headers['x-request-id']).toBeTypeOf('string');
    expect(health.headers['x-trace-id']).toBeTypeOf('string');
    expect(health.headers['x-content-type-options']).toBe('nosniff');
    expect(health.headers['content-security-policy']).toBe(
      "default-src 'self'"
    );
    expect(health.headers['access-control-allow-origin']).toBe(
      'https://console.example.com'
    );
    expect(health.json()).toMatchObject({
      status: 'healthy',
      checks: {
        runtime: 'healthy'
      }
    });
    expect(metrics.statusCode).toBe(200);
    expect(metrics.json().requests.total).toBeGreaterThanOrEqual(2);
    expect(limited.statusCode).toBe(404);
    expect(rateLimited.statusCode).toBe(429);
    expect(rateLimited.json()).toMatchObject({
      error: {
        code: 'RATE_LIMITED'
      }
    });
  });

  it('fails startup when a configured production manifest is invalid', async () => {
    const root = await mkdtemp(
      join(tmpdir(), 'stratix-bootstrap-invalid-manifest-')
    );
    const manifestPath = join(root, 'production-manifest.json');
    await writeFile(
      manifestPath,
      JSON.stringify(
        {
          schemaVersion: 2,
          project: {
            kind: 'app'
          },
          discovery: {},
          routes: [],
          di: {
            tokens: [],
            issues: []
          },
          modules: [],
          moduleIssues: [],
          plugins: []
        },
        null,
        2
      )
    );

    await expect(
      Stratix.run({
        type: 'cli',
        gracefulShutdown: false,
        config: {
          server: {},
          plugins: [],
          autoLoad: {},
          discovery: {
            enabled: true,
            rootDir: root,
            productionManifest: {
              enabled: true,
              path: manifestPath,
              strict: true
            }
          }
        }
      })
    ).rejects.toThrow('Invalid production manifest');
  });

  it('throws typed plugin load errors with cause and plugin name', async () => {
    try {
      await Stratix.run({
        type: 'cli',
        gracefulShutdown: false,
        config: {
          server: {},
          plugins: [
            {
              name: 'broken-plugin',
              plugin: async () => {
                throw new Error('plugin exploded');
              }
            }
          ],
          autoLoad: {},
          discovery: { enabled: false }
        }
      });
      throw new Error('expected Stratix.run to fail');
    } catch (error) {
      expect(error).toBeInstanceOf(PluginLoadError);
      expect((error as PluginLoadError).details).toEqual({
        pluginName: 'broken-plugin'
      });
      expect((error as PluginLoadError).cause).toBeInstanceOf(Error);
      expect(((error as PluginLoadError).cause as Error).message).toBe(
        'plugin exploded'
      );
    }
  });
});
