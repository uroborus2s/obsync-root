import { createContainer } from 'awilix';
import fastify, { type FastifyInstance } from 'fastify';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { withRegisterAutoDI } from '../auto-di-plugin.js';

describe('withRegisterAutoDI', () => {
  let app: FastifyInstance;

  beforeEach(() => {
    app = fastify();
  });

  afterEach(async () => {
    await app.close();
  });

  it('requires a Fastify diContainer decorator', async () => {
    const plugin = withRegisterAutoDI(async () => {}, {
      discovery: { patterns: [] },
      services: { enabled: false },
      lifecycle: { enabled: false },
      debug: false
    });

    await expect(app.register(plugin)).rejects.toThrow(
      '@fastify/awilix plugin is not registered'
    );
  });

  it('runs the wrapped plugin with a scoped AutoDI container', async () => {
    const rootContainer = createContainer();
    app.decorate('diContainer', rootContainer);

    const wrappedPlugin = withRegisterAutoDI(
      async (fastify, options: { message: string }) => {
        fastify.get('/wrapped', async () => ({ message: options.message }));
      },
      {
        discovery: { patterns: [] },
        services: { enabled: false },
        lifecycle: { enabled: true },
        debug: false
      }
    );

    await app.register(wrappedPlugin, { message: 'ok' });
    await app.ready();

    const response = await app.inject('/wrapped');

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ message: 'ok' });
    expect(rootContainer.hasRegistration('config')).toBe(false);
  });

  it('fails fast when module processing records errors in throw mode', async () => {
    const root = await mkdtemp(join(tmpdir(), 'stratix-autodi-fail-fast-'));
    await writeFile(
      join(root, 'broken-service.mjs'),
      [
        'export default class BrokenService {',
        '  constructor(missingDependency) {',
        '    this.missingDependency = missingDependency;',
        '  }',
        '}'
      ].join('\n')
    );
    app.decorate('diContainer', createContainer());

    const wrappedPlugin = withRegisterAutoDI(async () => {}, {
      discovery: {
        baseDir: root,
        patterns: ['*.mjs']
      },
      services: { enabled: false },
      lifecycle: { enabled: false, errorHandling: 'throw' },
      debug: false
    });

    await expect(app.register(wrappedPlugin)).rejects.toThrow(
      'AutoDI module processing failed'
    );
  });

  it('can keep compatibility by logging module processing errors in log mode', async () => {
    const root = await mkdtemp(join(tmpdir(), 'stratix-autodi-log-mode-'));
    await writeFile(
      join(root, 'broken-service.mjs'),
      [
        'export default class BrokenService {',
        '  constructor(missingDependency) {',
        '    this.missingDependency = missingDependency;',
        '  }',
        '}'
      ].join('\n')
    );
    app.decorate('diContainer', createContainer());

    const wrappedPlugin = withRegisterAutoDI(async () => {}, {
      discovery: {
        baseDir: root,
        patterns: ['*.mjs']
      },
      services: { enabled: false },
      lifecycle: { enabled: false, errorHandling: 'log' },
      debug: false
    });

    await expect(app.register(wrappedPlugin)).resolves.toBe(app);
  });

  it('rejects anonymous plugins when AutoDI strict mode is enabled', async () => {
    app.decorate('diContainer', createContainer());

    const wrappedPlugin = withRegisterAutoDI(async () => {}, {
      strict: true,
      discovery: { patterns: [] },
      services: { enabled: false, patterns: [] },
      lifecycle: { enabled: false },
      debug: false
    });

    await expect(app.register(wrappedPlugin)).rejects.toThrow(
      'AutoDI strict mode requires a named plugin function'
    );
  });

  it('allows named plugins when AutoDI strict mode is enabled', async () => {
    app.decorate('diContainer', createContainer());

    async function namedStrictPlugin(fastifyInstance: FastifyInstance) {
      fastifyInstance.get('/strict-plugin', async () => ({ ok: true }));
    }

    const wrappedPlugin = withRegisterAutoDI(namedStrictPlugin, {
      strict: true,
      discovery: { patterns: [] },
      services: { enabled: false, patterns: [] },
      lifecycle: { enabled: false },
      debug: false
    });

    await app.register(wrappedPlugin);
    await app.ready();

    const response = await app.inject('/strict-plugin');

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ ok: true });
  });
});
