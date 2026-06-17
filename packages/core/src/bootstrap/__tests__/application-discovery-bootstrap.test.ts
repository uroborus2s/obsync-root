import 'reflect-metadata';
import { afterEach, describe, expect, it } from 'vitest';
import { mkdtemp, writeFile } from 'node:fs/promises';
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
