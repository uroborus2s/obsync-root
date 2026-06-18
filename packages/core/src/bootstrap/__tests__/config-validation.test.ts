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
            basePath: '/healthz'
          },
          metrics: {
            enabled: true,
            path: '/metrics'
          },
          traces: {
            enabled: true,
            maxEntries: 10
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
            windowMs: 60_000
          },
          bodyLimit: 1024
        }
      }
    });

    expect(app.config.observability?.health?.basePath).toBe('/healthz');
    expect(app.config.security?.cors?.origins).toEqual([
      'https://console.example.com'
    ]);

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
});
