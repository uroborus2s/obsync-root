import 'reflect-metadata';
import { afterEach, describe, expect, it } from 'vitest';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { Stratix } from '../../stratix.js';

describe('application runtime stability', () => {
  const apps: Awaited<ReturnType<typeof Stratix.run>>[] = [];
  const coreImport = pathToFileURL(resolve(process.cwd(), 'src/index.ts')).href;

  afterEach(async () => {
    await Promise.all(apps.map((app) => app.stop()));
    apps.length = 0;
  });

  it('handles concurrent request-scoped route execution', async () => {
    const root = await mkdtemp(join(tmpdir(), 'stratix-runtime-concurrent-'));
    await writeFile(
      join(root, 'controller.mjs'),
      [
        `import { Controller, Get } from '${coreImport}';`,
        'class PingController {',
        '  ping(request) {',
        '    return { ok: true, requestId: request.requestId };',
        '  }',
        '}',
        'Controller()(PingController);',
        'Get("/ping")(',
        '  PingController.prototype,',
        "  'ping',",
        "  Object.getOwnPropertyDescriptor(PingController.prototype, 'ping')",
        ');',
        'export { PingController };'
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

    const responses = await Promise.all(
      Array.from({ length: 100 }, () =>
        app.inject({ method: 'GET', url: '/api/ping' })
      )
    );
    const bodies = responses.map((response) => response.json());

    expect(responses.every((response) => response.statusCode === 200)).toBe(
      true
    );
    expect(bodies.every((body) => body.ok === true)).toBe(true);
    expect(new Set(bodies.map((body) => body.requestId)).size).toBe(100);
  });

  it('starts and stops multiple cli applications concurrently', async () => {
    const startedApps = await Promise.all(
      Array.from({ length: 8 }, () =>
        Stratix.run({
          type: 'cli',
          gracefulShutdown: false,
          config: {
            server: {},
            plugins: [],
            autoLoad: {},
            discovery: { enabled: false }
          }
        })
      )
    );

    await Promise.all(startedApps.map((app) => app.stop()));

    expect(startedApps).toHaveLength(8);
  });

  it('runs shutdown handlers once per lifecycle cycle', async () => {
    let closeCount = 0;

    for (let index = 0; index < 12; index += 1) {
      const app = await Stratix.run({
        type: 'cli',
        gracefulShutdown: false,
        config: {
          server: {},
          plugins: [],
          autoLoad: {},
          discovery: { enabled: false },
          hooks: {
            beforeClose: async () => {
              closeCount += 1;
            }
          }
        }
      });
      await app.stop();
    }

    expect(closeCount).toBe(12);
  });
});
