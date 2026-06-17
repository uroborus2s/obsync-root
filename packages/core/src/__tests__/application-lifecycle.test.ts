import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Stratix } from '../stratix.js';
import type { StratixApplication, StratixRunOptions } from '../types/config.js';

function cliOptions(): StratixRunOptions {
  return {
    type: 'cli',
    gracefulShutdown: false,
    config: {
      server: {},
      plugins: [],
      autoLoad: {},
      discovery: { enabled: false }
    }
  };
}

function webOptions(): StratixRunOptions {
  return {
    type: 'web',
    gracefulShutdown: false,
    server: { listen: false },
    config: {
      server: { port: 0, host: '127.0.0.1' },
      plugins: [],
      autoLoad: {},
      discovery: { enabled: false }
    }
  };
}

describe('StratixApplication lifecycle methods', () => {
  let stratix: Stratix;
  let app: StratixApplication | undefined;

  beforeEach(() => {
    stratix = new Stratix(cliOptions());
  });

  afterEach(async () => {
    if (stratix.isRunning()) {
      await stratix.stop();
    } else if (app) {
      await app.stop();
    }
    app = undefined;
  });

  it('supports idempotent stop on a CLI application', async () => {
    app = await stratix.start(cliOptions());

    await app.stop();
    await expect(app.stop()).resolves.not.toThrow();

    expect(app.isRunning()).toBe(false);
  });

  it('injects HTTP requests without opening a listening socket', async () => {
    app = await stratix.start({
      ...webOptions(),
      config: {
        ...webOptions().config!,
        plugins: [
          {
            name: 'test-routes',
            plugin: async (fastify) => {
              fastify.get('/test', async () => ({ message: 'Hello, World!' }));
              fastify.post('/echo', async (request) => ({
                echo: request.body
              }));
            }
          }
        ]
      }
    });

    const getResponse = await app.inject({ method: 'GET', url: '/test' });
    const postResponse = await app.inject({
      method: 'POST',
      url: '/echo',
      headers: { 'content-type': 'application/json' },
      payload: { test: 'data' }
    });

    expect(getResponse.statusCode).toBe(200);
    expect(getResponse.json()).toEqual({ message: 'Hello, World!' });
    expect(postResponse.statusCode).toBe(200);
    expect(postResponse.json()).toEqual({ echo: { test: 'data' } });
  });

  it('returns the standard 404 response through inject', async () => {
    app = await stratix.start(webOptions());

    const response = await app.inject({ method: 'GET', url: '/missing' });

    expect(response.statusCode).toBe(404);
    expect(response.json().error).toMatchObject({
      code: 'NOT_FOUND',
      message: 'Route not found',
      statusCode: 404,
      path: '/missing'
    });
  });

  it('reports address and running state from the Fastify server', async () => {
    app = await stratix.start(webOptions());

    expect(app.getAddress()).toBeNull();
    expect(app.isRunning()).toBe(false);

    await app.fastify.listen({ port: 0, host: '127.0.0.1' });

    expect(app.isRunning()).toBe(true);
    expect(app.getAddress()).toMatchObject({
      address: '127.0.0.1',
      family: 'IPv4'
    });
  });

  it('reports uptime, memory usage and health', async () => {
    app = await stratix.start(cliOptions());

    await new Promise((resolve) => setTimeout(resolve, 10));
    const health = await app.healthCheck();

    expect(app.getUptime()).toBeGreaterThanOrEqual(0);
    expect(app.getMemoryUsage()).toHaveProperty('rss');
    expect(health).toMatchObject({
      status: 'healthy',
      uptime: expect.any(Number),
      memory: expect.any(Object),
      timestamp: expect.any(Date)
    });
  });
});
