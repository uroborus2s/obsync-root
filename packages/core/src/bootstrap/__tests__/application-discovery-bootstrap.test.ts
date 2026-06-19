import 'reflect-metadata';
import { afterEach, describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { ConfigurationError, PluginLoadError } from '../../errors/index.js';
import { Stratix } from '../../stratix.js';

describe('application discovery bootstrap integration', () => {
  const apps: Awaited<ReturnType<typeof Stratix.run>>[] = [];
  const coreImport = pathToFileURL(resolve(process.cwd(), 'src/index.ts')).href;
  const sha256 = (content: string) =>
    `sha256-${createHash('sha256').update(content).digest('hex')}`;

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
        'class SameFileUnlistedService {}',
        'Service()(SameFileUnlistedService);',
        'class SameFileUnlistedController {',
        '  leaked() {',
        '    return { leaked: true };',
        '  }',
        '}',
        'Controller()(SameFileUnlistedController);',
        'Get("/same-file-leak")(',
        '  SameFileUnlistedController.prototype,',
        "  'leaked',",
        "  Object.getOwnPropertyDescriptor(SameFileUnlistedController.prototype, 'leaked')",
        ');',
        'export { ManifestHealthService, ManifestHealthController, SameFileUnlistedService, SameFileUnlistedController };'
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
    expect(app.diContainer.hasRegistration('sameFileUnlistedService')).toBe(
      false
    );
    expect(app.diContainer.hasRegistration('sameFileUnlistedController')).toBe(
      false
    );
    expect(app.diContainer.hasRegistration('globOnlyService')).toBe(false);

    const leaked = await app.inject({
      method: 'GET',
      url: '/api/same-file-leak'
    });

    expect(leaked.statusCode).toBe(404);
  });

  it('registers application components from production manifest v2 compiled files in strict mode', async () => {
    const root = await mkdtemp(
      join(tmpdir(), 'stratix-bootstrap-manifest-v2-registration-')
    );
    await mkdir(join(root, 'src'), { recursive: true });
    await mkdir(join(root, 'dist'), { recursive: true });
    const sourceContent = [
      'export class ManifestCompiledService {}',
      'export class ManifestCompiledController {}'
    ].join('\n');
    const compiledContent = [
      `import { Controller, Get, Service } from '${coreImport}';`,
      'class ManifestCompiledService {',
      "  status() { return 'manifest-v2'; }",
      '}',
      'Service()(ManifestCompiledService);',
      'class ManifestCompiledController {',
      '  constructor(manifestCompiledService) {',
      '    this.manifestCompiledService = manifestCompiledService;',
      '  }',
      '  check() {',
      '    return { ok: true, source: this.manifestCompiledService.status() };',
      '  }',
      '}',
      'Controller()(ManifestCompiledController);',
      'Get("/manifest-compiled")(',
      '  ManifestCompiledController.prototype,',
      "  'check',",
      "  Object.getOwnPropertyDescriptor(ManifestCompiledController.prototype, 'check')",
      ');',
      'export { ManifestCompiledService, ManifestCompiledController };'
    ].join('\n');
    await writeFile(join(root, 'src', 'manifest-module.ts'), sourceContent);
    await writeFile(join(root, 'dist', 'manifest-module.mjs'), compiledContent);
    await writeFile(
      join(root, 'dist', 'glob-only.mjs'),
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
          schemaVersion: 2,
          generatedAt: '2026-06-19T00:00:00.000Z',
          generator: {
            name: '@stratix/forge',
            version: '1.1.0',
            command: 'build-manifest'
          },
          runtime: {
            packageName: '@stratix/core',
            compatibleVersions: ['1.1.x'],
            node: '>=24.0.0'
          },
          project: {
            kind: 'app',
            type: 'api',
            runtime: 'web',
            presets: []
          },
          discovery: {
            rootDir: '.',
            patterns: ['src/**/*.ts'],
            routing: {
              enabled: true
            }
          },
          registrationPlan: {
            id: 'production-manifest:manifest-v2-app',
            source: 'production-manifest',
            owner: {
              type: 'manifest',
              name: 'manifest-v2-app'
            },
            tokens: [
              {
                token: 'manifestCompiledService',
                kind: 'service',
                registrationType: 'class',
                scope: 'root',
                visibility: 'public',
                lifetime: 'SINGLETON',
                injectionMode: 'CLASSIC',
                dependencies: [],
                source: 'src/manifest-module.ts',
                metadata: {
                  className: 'ManifestCompiledService',
                  sourceFile: 'src/manifest-module.ts',
                  compiledFile: 'dist/manifest-module.mjs'
                }
              }
            ],
            routes: [
              {
                method: 'GET',
                path: '/manifest-compiled',
                controllerName: 'ManifestCompiledController',
                handlerName: 'check',
                token: 'manifestCompiledController',
                scope: 'root',
                source: 'src/manifest-module.ts',
                metadata: {
                  operationId: 'ManifestCompiledController_check',
                  sourceFile: 'src/manifest-module.ts',
                  compiledFile: 'dist/manifest-module.mjs'
                }
              }
            ],
            adapters: [],
            lifecycle: [],
            diagnostics: []
          },
          artifacts: {
            algorithm: 'sha256',
            files: [
              {
                sourceFile: 'src/manifest-module.ts',
                sourceHash: sha256(sourceContent),
                compiledFile: 'dist/manifest-module.mjs',
                compiledHash: sha256(compiledContent)
              }
            ]
          },
          routes: [
            {
              method: 'GET',
              path: '/manifest-compiled',
              operationId: 'ManifestCompiledController_check',
              controllerName: 'ManifestCompiledController',
              handlerName: 'check',
              sourceFile: 'src/manifest-module.ts',
              compiledFile: 'dist/manifest-module.mjs'
            }
          ],
          di: {
            tokens: [
              {
                token: 'manifestCompiledService',
                className: 'ManifestCompiledService',
                dependencies: [],
                sourceFile: 'src/manifest-module.ts',
                compiledFile: 'dist/manifest-module.mjs'
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
          patterns: ['src/**/*.ts'],
          routing: {
            enabled: true,
            prefix: '/api'
          },
          productionManifest: {
            enabled: true,
            path: manifestPath,
            strict: true,
            skipRuntimeDiscovery: true,
            registerFromManifest: true
          }
        }
      }
    });
    apps.push(app);

    const response = await app.inject({
      method: 'GET',
      url: '/api/manifest-compiled'
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ ok: true, source: 'manifest-v2' });
    expect(app.diContainer.hasRegistration('manifestCompiledService')).toBe(
      true
    );
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

  it('uses production observability and rate-limit providers when configured', async () => {
    const metricEvents: Array<{ statusCode: number; url: string }> = [];
    const traceEvents: Array<{ statusCode: number; url: string }> = [];
    const consumedKeys: string[] = [];

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
          health: {
            enabled: true,
            basePath: '/health-provider',
            contributors: [
              {
                name: 'database',
                async check() {
                  return {
                    status: 'healthy',
                    details: { latencyMs: 3 }
                  };
                }
              }
            ]
          },
          metrics: {
            enabled: true,
            path: '/metrics-provider',
            provider: {
              recordRequest(event) {
                metricEvents.push({
                  statusCode: event.statusCode,
                  url: event.url
                });
              },
              snapshot() {
                return {
                  exported: true,
                  events: metricEvents.length
                };
              }
            }
          },
          traces: {
            enabled: true,
            maxEntries: 5,
            provider: {
              recordTrace(event) {
                traceEvents.push({
                  statusCode: event.statusCode,
                  url: event.url
                });
              }
            }
          }
        },
        security: {
          enabled: true,
          rateLimit: {
            enabled: true,
            max: 1,
            windowMs: 60_000,
            provider: {
              consume(input) {
                consumedKeys.push(input.key);
                return consumedKeys.length === 1
                  ? { allowed: true }
                  : { allowed: false, retryAfterSeconds: 7 };
              }
            }
          }
        }
      }
    });
    apps.push(app);

    const first = await app.inject({ method: 'GET', url: '/missing' });
    const second = await app.inject({ method: 'GET', url: '/missing' });
    const health = await app.inject({
      method: 'GET',
      url: '/health-provider'
    });
    const metrics = await app.inject({
      method: 'GET',
      url: '/metrics-provider'
    });

    expect(first.statusCode).toBe(404);
    expect(second.statusCode).toBe(429);
    expect(second.headers['retry-after']).toBe('7');
    expect(consumedKeys.length).toBe(2);
    expect(health.statusCode).toBe(200);
    expect(health.json()).toMatchObject({
      status: 'healthy',
      checks: {
        runtime: 'healthy',
        database: {
          status: 'healthy',
          details: { latencyMs: 3 }
        }
      }
    });
    expect(metrics.statusCode).toBe(200);
    expect(metrics.json()).toMatchObject({
      provider: {
        exported: true
      }
    });
    expect(metricEvents.some((event) => event.statusCode === 404)).toBe(true);
    expect(traceEvents.some((event) => event.statusCode === 404)).toBe(true);
  });

  it('separates readiness contributors from liveness health checks', async () => {
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
          health: {
            enabled: true,
            basePath: '/health-split',
            contributors: [
              {
                name: 'database',
                async check() {
                  return {
                    status: 'unhealthy',
                    details: { reason: 'not connected' }
                  };
                }
              }
            ]
          },
          metrics: { enabled: false },
          traces: { enabled: false }
        }
      }
    });
    apps.push(app);

    const ready = await app.inject({
      method: 'GET',
      url: '/health-split/ready'
    });
    const live = await app.inject({
      method: 'GET',
      url: '/health-split/live'
    });

    expect(ready.statusCode).toBe(503);
    expect(ready.json()).toMatchObject({
      status: 'unhealthy',
      checks: {
        database: {
          status: 'unhealthy',
          details: { reason: 'not connected' }
        }
      }
    });
    expect(live.statusCode).toBe(200);
    expect(live.json()).toMatchObject({
      status: 'healthy',
      checks: {
        runtime: 'healthy'
      }
    });
  });

  it('isolates observability provider failures from request handling and liveness', async () => {
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
          health: {
            enabled: true,
            basePath: '/health-failure',
            contributors: [
              {
                name: 'database',
                async check() {
                  throw new Error('database down');
                }
              }
            ]
          },
          metrics: {
            enabled: true,
            path: '/metrics-failure',
            provider: {
              recordRequest() {
                throw new Error('metrics exporter down');
              },
              snapshot() {
                throw new Error('metrics snapshot down');
              }
            }
          },
          traces: {
            enabled: true,
            provider: {
              recordTrace() {
                throw new Error('tracing exporter down');
              }
            }
          }
        },
        security: {
          enabled: true,
          rateLimit: {
            enabled: true,
            max: 2,
            windowMs: 60_000,
            provider: {
              consume() {
                throw new Error('rate limiter down');
              }
            }
          }
        }
      }
    });
    apps.push(app);

    const missing = await app.inject({ method: 'GET', url: '/missing' });
    const ready = await app.inject({
      method: 'GET',
      url: '/health-failure/ready'
    });
    const live = await app.inject({
      method: 'GET',
      url: '/health-failure/live'
    });
    const metrics = await app.inject({
      method: 'GET',
      url: '/metrics-failure'
    });
    const fallbackAllowed = await app.inject({
      method: 'GET',
      url: '/fallback-rate-limit'
    });
    const fallbackLimited = await app.inject({
      method: 'GET',
      url: '/fallback-rate-limit'
    });

    expect(missing.statusCode).toBe(404);
    expect(ready.statusCode).toBe(503);
    expect(ready.json()).toMatchObject({
      status: 'unhealthy',
      checks: {
        database: {
          status: 'unhealthy',
          details: { message: 'database down' }
        }
      }
    });
    expect(live.statusCode).toBe(200);
    expect(live.json()).toMatchObject({
      status: 'healthy',
      checks: {
        runtime: 'healthy'
      }
    });
    expect(metrics.statusCode).toBe(200);
    expect(metrics.json().provider).toBeUndefined();
    expect(metrics.json().requests.total).toBeGreaterThanOrEqual(1);
    expect(fallbackAllowed.statusCode).toBe(404);
    expect(fallbackLimited.statusCode).toBe(429);
    expect(fallbackLimited.json()).toMatchObject({
      error: {
        code: 'RATE_LIMITED'
      }
    });
  });

  it('does not trust x-forwarded-for for rate limiting unless explicitly configured', async () => {
    const app = await Stratix.run({
      type: 'cli',
      gracefulShutdown: false,
      config: {
        server: {},
        plugins: [],
        autoLoad: {},
        discovery: { enabled: false },
        observability: {
          enabled: false,
          health: { enabled: false },
          metrics: { enabled: false }
        },
        security: {
          enabled: true,
          rateLimit: {
            enabled: true,
            max: 1,
            windowMs: 60_000
          }
        }
      }
    });
    apps.push(app);

    const first = await app.inject({
      method: 'GET',
      url: '/missing',
      headers: {
        'x-forwarded-for': '203.0.113.10'
      }
    });
    const spoofed = await app.inject({
      method: 'GET',
      url: '/missing',
      headers: {
        'x-forwarded-for': '203.0.113.11'
      }
    });

    expect(first.statusCode).toBe(404);
    expect(spoofed.statusCode).toBe(429);
  });

  it('can trust x-forwarded-for for rate limiting when explicitly configured', async () => {
    const app = await Stratix.run({
      type: 'cli',
      gracefulShutdown: false,
      config: {
        server: {},
        plugins: [],
        autoLoad: {},
        discovery: { enabled: false },
        observability: {
          enabled: false,
          health: { enabled: false },
          metrics: { enabled: false }
        },
        security: {
          enabled: true,
          rateLimit: {
            enabled: true,
            max: 1,
            windowMs: 60_000,
            trustProxy: true
          }
        }
      }
    });
    apps.push(app);

    const first = await app.inject({
      method: 'GET',
      url: '/missing',
      headers: {
        'x-forwarded-for': '203.0.113.10'
      }
    });
    const forwardedClient = await app.inject({
      method: 'GET',
      url: '/missing',
      headers: {
        'x-forwarded-for': '203.0.113.11'
      }
    });

    expect(first.statusCode).toBe(404);
    expect(forwardedClient.statusCode).toBe(404);
  });

  it('falls back to request ip when trusted x-forwarded-for has an empty client token', async () => {
    const app = await Stratix.run({
      type: 'cli',
      gracefulShutdown: false,
      config: {
        server: {},
        plugins: [],
        autoLoad: {},
        discovery: { enabled: false },
        observability: {
          enabled: false,
          health: { enabled: false },
          metrics: { enabled: false }
        },
        security: {
          enabled: true,
          rateLimit: {
            enabled: true,
            max: 1,
            windowMs: 60_000,
            trustProxy: true
          }
        }
      }
    });
    apps.push(app);

    const first = await app.inject({
      method: 'GET',
      url: '/missing',
      headers: {
        'x-forwarded-for': ' , 203.0.113.10'
      }
    });
    const second = await app.inject({
      method: 'GET',
      url: '/missing',
      headers: {
        'x-forwarded-for': ' , 203.0.113.11'
      }
    });

    expect(first.statusCode).toBe(404);
    expect(second.statusCode).toBe(429);
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

  it('fails startup in strict mode when production manifest contains unresolved issues', async () => {
    const root = await mkdtemp(
      join(tmpdir(), 'stratix-bootstrap-manifest-issues-')
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
          routes: [],
          di: {
            tokens: [],
            issues: [
              {
                code: 'missing-token-source',
                message: 'Token UserService has no source file'
              }
            ]
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
              strict: true,
              skipRuntimeDiscovery: true,
              registerFromManifest: true
            }
          }
        }
      })
    ).rejects.toThrow('Production manifest contains unresolved issues');
  });

  it('fails startup in strict mode when production manifest source files do not match declared components', async () => {
    const root = await mkdtemp(
      join(tmpdir(), 'stratix-bootstrap-manifest-source-mismatch-')
    );
    await writeFile(
      join(root, 'actual-module.mjs'),
      [
        `import { Controller, Get, Service } from '${coreImport}';`,
        'class ActualService {}',
        'Service()(ActualService);',
        'class ActualController {',
        '  actual() {',
        '    return { ok: true };',
        '  }',
        '}',
        'Controller()(ActualController);',
        'Get("/actual")(',
        '  ActualController.prototype,',
        "  'actual',",
        "  Object.getOwnPropertyDescriptor(ActualController.prototype, 'actual')",
        ');',
        'export { ActualService, ActualController };'
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
              sourceFile: 'actual-module.mjs'
            }
          ],
          di: {
            tokens: [
              {
                token: 'manifestHealthService',
                className: 'ManifestHealthService',
                dependencies: [],
                sourceFile: 'actual-module.mjs'
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

    let app: Awaited<ReturnType<typeof Stratix.run>> | undefined;
    let caught: unknown;
    try {
      app = await Stratix.run({
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
              strict: true,
              skipRuntimeDiscovery: true,
              registerFromManifest: true
            }
          }
        }
      });
    } catch (error) {
      caught = error;
    } finally {
      await app?.stop();
    }

    expect(caught).toBeInstanceOf(ConfigurationError);
    expect((caught as Error).message).toContain(
      'Production manifest source mismatch'
    );
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
