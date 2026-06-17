import 'reflect-metadata';
import { asValue, createContainer } from 'awilix';
import fastify from 'fastify';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
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
        "  health() { return { ok: true }; }",
        '}',
        'Controller()(HealthController);',
        'Get("/health")(',
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
    const response = await app.inject('/api/health');

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ ok: true });
  });
});
