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
