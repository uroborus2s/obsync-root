import 'reflect-metadata';
import { afterEach, describe, expect, it } from 'vitest';
import { ConfigurationError } from '../../errors/index.js';
import { Stratix } from '../../stratix.js';
import type { StratixConfig } from '../../types/index.js';

describe('bootstrap contract', () => {
  const apps: Awaited<ReturnType<typeof Stratix.run>>[] = [];

  afterEach(async () => {
    await Promise.all(apps.map((app) => app.stop()));
    apps.length = 0;
    delete process.env.STRATIX_SENSITIVE_CONFIG;
  });

  it('uses direct config as the highest-priority configuration source', async () => {
    const config: StratixConfig = {
      server: { host: '127.0.0.1', port: 0 },
      plugins: [],
      autoLoad: {},
      discovery: { enabled: false }
    };

    const app = await Stratix.run({
      type: 'cli',
      gracefulShutdown: false,
      config
    });
    apps.push(app);

    expect(app.config).toEqual(config);
    expect(app.type).toBe('cli');
  });

  it('does not require .env files when env strict mode is not explicitly enabled', async () => {
    const app = await Stratix.run({
      type: 'cli',
      gracefulShutdown: false,
      envOptions: {
        rootDir: '/tmp/stratix-env-file-that-does-not-exist'
      },
      config: {
        server: {},
        plugins: [],
        autoLoad: {},
        discovery: { enabled: false }
      }
    });
    apps.push(app);

    expect(app.status.phase).toBe('ready');
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
