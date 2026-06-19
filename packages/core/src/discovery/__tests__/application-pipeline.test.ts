import 'reflect-metadata';
import { asValue, createContainer } from 'awilix';
import fastify from 'fastify';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { runDIDiagnostics } from '../../diagnostics/index.js';
import { ApplicationDiscoveryPipeline } from '../application-pipeline.js';

describe('ApplicationDiscoveryPipeline', () => {
  const createdApps: Array<ReturnType<typeof fastify>> = [];
  const coreImport = pathToFileURL(resolve(process.cwd(), 'src/index.ts')).href;

  afterEach(async () => {
    await Promise.all(createdApps.map((app) => app.close()));
  });

  it('registers only explicit components when legacy class registration is disabled', async () => {
    const root = await mkdtemp(join(tmpdir(), 'stratix-discovery-'));
    await writeFile(
      join(root, 'services.mjs'),
      [
        `import { Service } from '${coreImport}';`,
        'class UserService {',
        "  getName() { return 'stratix'; }",
        '}',
        'Service()(UserService);',
        'class PlainUtility {}',
        'export { UserService, PlainUtility };'
      ].join('\n')
    );

    const app = fastify();
    createdApps.push(app);
    const container = createContainer();
    container.register('logger', asValue(app.log));

    const pipeline = new ApplicationDiscoveryPipeline();
    const result = await pipeline.discoverAndRegister({
      container,
      fastify: app,
      rootDir: root,
      patterns: ['*.mjs']
    });

    expect(result.registered).toEqual(['userService']);
    expect(container.hasRegistration('userService')).toBe(true);
    expect(container.hasRegistration('UserService')).toBe(false);
    expect(container.hasRegistration('PlainUtility')).toBe(false);
  });

  it('applies routing prefix through the unified pipeline', async () => {
    const root = await mkdtemp(join(tmpdir(), 'stratix-routing-'));
    await writeFile(
      join(root, 'controller.mjs'),
      [
        `import { Controller, Get } from '${coreImport}';`,
        'class HealthController {',
        '  health() { return { ok: true }; }',
        '}',
        'Controller()(HealthController);',
        'Get("/health", {',
        '  schema: {',
        '    querystring: {',
        "      type: 'object',",
        "      required: ['page'],",
        '      properties: {',
        "        page: { type: 'integer' }",
        '      }',
        '    },',
        '    response: {',
        '      200: {',
        "        type: 'object',",
        '        properties: {',
        "          ok: { type: 'boolean' }",
        '        }',
        '      }',
        '    }',
        '  }',
        '})(',
        '  HealthController.prototype,',
        "  'health',",
        "  Object.getOwnPropertyDescriptor(HealthController.prototype, 'health')",
        ');',
        'export { HealthController };'
      ].join('\n')
    );

    const app = fastify();
    createdApps.push(app);
    const container = createContainer();
    container.register('logger', asValue(app.log));

    const pipeline = new ApplicationDiscoveryPipeline();
    await pipeline.discoverAndRegister({
      container,
      fastify: app,
      rootDir: root,
      patterns: ['*.mjs'],
      routing: {
        enabled: true,
        prefix: '/api'
      }
    });

    await app.ready();
    const response = await app.inject('/api/health?page=1');
    const invalidResponse = await app.inject('/api/health?page=bad');

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ ok: true });
    expect(invalidResponse.statusCode).toBe(400);
  });

  it('records DI graph metadata for discovered components', async () => {
    const root = await mkdtemp(join(tmpdir(), 'stratix-di-graph-'));
    await writeFile(
      join(root, 'services.mjs'),
      [
        `import { Repository, Service } from '${coreImport}';`,
        'class UserRepository {}',
        'Repository()(UserRepository);',
        'class UserService {',
        '  constructor(userRepository, logger) {',
        '    this.userRepository = userRepository;',
        '    this.logger = logger;',
        '  }',
        '}',
        'Service()(UserService);',
        'export { UserRepository, UserService };'
      ].join('\n')
    );

    const app = fastify();
    createdApps.push(app);
    const container = createContainer();
    container.register('logger', asValue(app.log));

    const pipeline = new ApplicationDiscoveryPipeline();
    const discoveryResult = await pipeline.discoverAndRegister({
      container,
      fastify: app,
      rootDir: root,
      patterns: ['*.mjs']
    });

    expect(discoveryResult.registrationPlan).toEqual(
      expect.objectContaining({
        source: 'application-discovery',
        owner: {
          type: 'application'
        },
        tokens: expect.arrayContaining([
          expect.objectContaining({
            token: 'userService',
            kind: 'service',
            scope: 'root'
          })
        ])
      })
    );

    const result = runDIDiagnostics(container);

    expect(result.graph.nodes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          token: 'userService',
          dependencies: ['userRepository', 'logger'],
          registrationType: 'class',
          plan: expect.objectContaining({
            source: 'application-discovery',
            ownerType: 'application',
            tokenKind: 'service'
          })
        })
      ])
    );
    expect(result.diagnostics).toEqual([]);
  });

  it('does not scan legacy executors directories by default', async () => {
    const root = await mkdtemp(join(tmpdir(), 'stratix-no-executors-'));
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

    const app = fastify();
    createdApps.push(app);
    const container = createContainer();
    container.register('logger', asValue(app.log));

    const pipeline = new ApplicationDiscoveryPipeline();
    const result = await pipeline.discoverAndRegister({
      container,
      fastify: app,
      rootDir: root
    });

    expect(result.scanned).toBe(0);
    expect(result.registered).toEqual([]);
    expect(container.hasRegistration('legacyExecutorNamedService')).toBe(false);
  });
});
