import { afterEach, describe, expect, it } from 'vitest';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Controller, Get, Service } from '@stratix/core';
import {
  createDiscoveryFixture,
  createModuleFixture,
  createRepositoryFixture,
  createTestApp,
  createTestContainer,
  mockPlugin,
  overrideToken,
  resolveTestToken
} from '../index.js';

class GreetingService {
  message(): string {
    return 'real';
  }
}
Service()(GreetingService);

class GreetingController {
  constructor(private readonly greetingService: GreetingService) {}

  hello() {
    return { message: this.greetingService.message() };
  }
}
Controller()(GreetingController);
Get('/hello', {
  schema: {
    response: {
      200: {
        type: 'object',
        required: ['message'],
        properties: {
          message: { type: 'string' }
        }
      }
    }
  }
})(
  GreetingController.prototype,
  'hello',
  Object.getOwnPropertyDescriptor(GreetingController.prototype, 'hello')
);

describe('@stratix/testing Phase 4 platform helpers', () => {
  const apps: Array<Awaited<ReturnType<typeof createTestApp>>> = [];

  afterEach(async () => {
    await Promise.all(apps.map((app) => app.stop()));
    apps.length = 0;
  });

  it('creates a test container and applies token overrides', () => {
    const container = createTestContainer({
      providers: [GreetingService],
      overrides: [
        overrideToken(GreetingService, {
          message: () => 'mocked'
        })
      ]
    });

    expect(resolveTestToken(GreetingService)).toBe('greetingService');
    expect(container.resolve<GreetingService>('greetingService').message()).toBe(
      'mocked'
    );
  });

  it('creates a Stratix test app that supports inject without listening', async () => {
    const app = await createTestApp({
      providers: [GreetingService],
      controllers: [GreetingController],
      overrides: [
        overrideToken(GreetingService, {
          message: () => 'from override'
        })
      ],
      routing: {
        prefix: '/api'
      }
    });
    apps.push(app);

    expect(app.isRunning()).toBe(false);

    const response = await app.inject({ method: 'GET', url: '/api/hello' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ message: 'from override' });
  });

  it('can replace and disable plugins through fixtures', async () => {
    let realPluginLoaded = false;
    const realPlugin = {
      name: 'database',
      plugin: async (fastify: any) => {
        realPluginLoaded = true;
        fastify.decorate('databaseName', 'real');
      }
    };

    const app = await createTestApp({
      plugins: [realPlugin],
      mockPlugins: [
        mockPlugin('database', {
          decorators: {
            databaseName: 'mock'
          },
          tokens: {
            databaseApi: { query: () => 'mocked' }
          }
        })
      ]
    });
    apps.push(app);

    expect(realPluginLoaded).toBe(false);
    expect((app.fastify as any).databaseName).toBe('mock');
    expect(app.diContainer.resolve<{ query: () => string }>('databaseApi').query()).toBe(
      'mocked'
    );

    const disabled = await createTestApp({
      plugins: [realPlugin],
      disablePlugins: ['database']
    });
    apps.push(disabled);

    expect((disabled.fastify as any).databaseName).toBeUndefined();
  });

  it('creates isolated discovery fixtures for app-level scanning', async () => {
    const app = await createTestApp({
      discovery: createDiscoveryFixture({
        rootDir: fileURLToPath(new URL('../../test-fixtures', import.meta.url)),
        patterns: ['discovery-fixture.ts'],
        routing: {
          prefix: '/api'
        }
      })
    });
    apps.push(app);

    expect(app.diContainer.hasRegistration('fixtureUserService')).toBe(true);

    const response = await app.inject({ method: 'GET', url: '/api/users' });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ label: 'discovered' });
  });

  it('creates module fixtures from module.yaml boundaries', async () => {
    const root = await mkdtemp(join(tmpdir(), 'stratix-testing-module-'));
    const moduleRoot = join(root, 'src', 'modules', 'users');
    await mkdir(join(moduleRoot, 'controllers'), { recursive: true });
    await mkdir(join(moduleRoot, 'services'), { recursive: true });
    await mkdir(join(moduleRoot, 'repositories'), { recursive: true });
    await writeFile(
      join(moduleRoot, 'module.yaml'),
      [
        'name: users',
        'root: src/modules/users',
        'tags:',
        '  - core',
        'layers:',
        '  controllers: controllers/**/*.ts',
        '  services: services/**/*.ts',
        '  repositories: repositories/**/*.ts',
        'contracts:',
        '  openapiTag: Users',
        'boundaries:',
        '  owns:',
        '    - userService',
        '  allows:',
        '    imports:',
        '      - billing'
      ].join('\n')
    );

    const fixture = await createModuleFixture({
      rootDir: root,
      module: 'users'
    });

    expect(fixture.manifest.name).toBe('users');
    expect(fixture.moduleRoot).toBe(moduleRoot);
    expect(fixture.discovery.rootDir).toBe(moduleRoot);
    expect(fixture.owns('userService')).toBe(true);
    expect(fixture.allowsImport('billing')).toBe(true);
  });

  it('wraps repository fixtures in rollbackable transactions', async () => {
    const rolledBack: string[] = [];
    const fixture = await createRepositoryFixture({
      repository: {
        list: () => ['real']
      },
      transaction: {
        begin: () => ({ id: 'tx-1' }),
        rollback: (transaction) => {
          rolledBack.push(transaction.id);
        }
      },
      bindTransaction: (repository, transaction) => ({
        ...repository,
        transactionId: transaction.id
      })
    });

    expect(fixture.transaction).toEqual({ id: 'tx-1' });
    expect((fixture.repository as any).transactionId).toBe('tx-1');

    await fixture.teardown();

    expect(rolledBack).toEqual(['tx-1']);
  });
});
