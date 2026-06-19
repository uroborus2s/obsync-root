import 'reflect-metadata';
import { describe, expect, it } from 'vitest';
import { ConfigurationError } from '../../errors/index.js';
import { Stratix } from '../../stratix.js';
import type { StratixConfig } from '../../types/index.js';

describe('configuration validation contract', () => {
  it('accepts discovery as the only application-level discovery configuration', async () => {
    const app = await Stratix.run({
      type: 'cli',
      gracefulShutdown: false,
      config: {
        server: {},
        plugins: [],
        autoLoad: {},
        discovery: {
          enabled: false,
          patterns: ['**/*.service.ts']
        }
      }
    });

    expect(app.config.discovery).toEqual({
      enabled: false,
      patterns: ['**/*.service.ts']
    });

    await app.stop();
  });

  it('accepts production manifest discovery configuration', async () => {
    const app = await Stratix.run({
      type: 'cli',
      gracefulShutdown: false,
      config: {
        server: {},
        plugins: [],
        autoLoad: {},
        discovery: {
          enabled: false,
          productionManifest: {
            enabled: true,
            path: '.stratix/production-manifest.json',
            skipRuntimeDiscovery: true,
            strict: true
          }
        }
      }
    });

    expect(app.config.discovery?.productionManifest).toEqual({
      enabled: true,
      path: '.stratix/production-manifest.json',
      skipRuntimeDiscovery: true,
      strict: true
    });

    await app.stop();
  });

  it('accepts production observability and security configuration', async () => {
    const metricsProvider = {
      recordRequest() {}
    };
    const tracingProvider = {
      recordTrace() {}
    };
    const rateLimitProvider = {
      consume() {
        return { allowed: true };
      }
    };
    const healthContributor = {
      name: 'database',
      check() {
        return { status: 'healthy' as const };
      }
    };

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
            basePath: '/healthz',
            contributors: [healthContributor]
          },
          metrics: {
            enabled: true,
            path: '/metrics',
            provider: metricsProvider
          },
          traces: {
            enabled: true,
            maxEntries: 10,
            provider: tracingProvider
          }
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
            max: 100,
            windowMs: 60_000,
            provider: rateLimitProvider
          },
          bodyLimit: 1024
        }
      }
    });

    expect(app.config.observability?.health?.basePath).toBe('/healthz');
    expect(app.config.observability?.health?.contributors?.[0]?.name).toBe(
      healthContributor.name
    );
    expect(
      app.config.observability?.health?.contributors?.[0]?.check
    ).toBeTypeOf('function');
    expect(app.config.observability?.metrics?.provider).toBe(metricsProvider);
    expect(app.config.observability?.traces?.provider).toBe(tracingProvider);
    expect(app.config.security?.cors?.origins).toEqual([
      'https://console.example.com'
    ]);
    expect(app.config.security?.rateLimit?.provider).toBe(rateLimitProvider);

    await app.stop();
  });

  it('rejects removed container configuration', async () => {
    await expect(
      Stratix.run({
        type: 'cli',
        gracefulShutdown: false,
        config: {
          server: {},
          plugins: [],
          autoLoad: {},
          discovery: { enabled: false },
          container: { strict: false }
        } as unknown as StratixConfig
      })
    ).rejects.toThrow(ConfigurationError);
  });

  it('rejects removed applicationAutoDI configuration', async () => {
    await expect(
      Stratix.run({
        type: 'cli',
        gracefulShutdown: false,
        config: {
          server: {},
          plugins: [],
          autoLoad: {},
          applicationAutoDI: { enabled: false }
        } as unknown as StratixConfig
      })
    ).rejects.toThrow(ConfigurationError);
  });

  it('applies plugin enabled flags and dependency-aware load order', async () => {
    const loadedPlugins: string[] = [];
    const plugin = (name: string) => async () => {
      loadedPlugins.push(name);
    };

    const app = await Stratix.run({
      type: 'cli',
      gracefulShutdown: false,
      config: {
        server: {},
        autoLoad: {},
        discovery: { enabled: false },
        plugins: [
          {
            name: 'feature',
            plugin: plugin('feature'),
            dependencies: ['base'],
            order: 0
          },
          {
            name: 'disabled',
            plugin: plugin('disabled'),
            enabled: false,
            order: -100
          },
          {
            name: 'base',
            plugin: plugin('base'),
            order: 100
          }
        ]
      }
    });

    expect(loadedPlugins).toEqual(['base', 'feature']);
    await app.stop();
  });

  it('rejects duplicate plugin names', async () => {
    await expect(
      Stratix.run({
        type: 'cli',
        gracefulShutdown: false,
        config: {
          server: {},
          autoLoad: {},
          discovery: { enabled: false },
          plugins: [
            { name: 'duplicate', plugin: async () => {} },
            { name: 'duplicate', plugin: async () => {} }
          ]
        }
      })
    ).rejects.toThrow(ConfigurationError);
  });

  it('rejects missing plugin dependencies', async () => {
    await expect(
      Stratix.run({
        type: 'cli',
        gracefulShutdown: false,
        config: {
          server: {},
          autoLoad: {},
          discovery: { enabled: false },
          plugins: [
            {
              name: 'feature',
              plugin: async () => {},
              dependencies: ['base']
            }
          ]
        }
      })
    ).rejects.toThrow(ConfigurationError);
  });
});
