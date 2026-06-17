import { asValue, createContainer } from 'awilix';
import fastify, { type FastifyInstance } from 'fastify';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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
    rootContainer.register('registerTaskExecutor', asValue(vi.fn()));
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
});
