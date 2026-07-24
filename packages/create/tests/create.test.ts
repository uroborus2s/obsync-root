import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';
import { runCreate } from '../src/run-create.ts';
import type { CliOutput } from '../src/core/output.ts';

interface MemoryOutput extends CliOutput {
  messages: Array<{ level: string; message: string }>;
}

function createMemoryOutput(): MemoryOutput {
  const messages: Array<{ level: string; message: string }> = [];
  return {
    messages,
    log(message: string): void {
      messages.push({ level: 'log', message });
    },
    info(message: string): void {
      messages.push({ level: 'info', message });
    },
    success(message: string): void {
      messages.push({ level: 'success', message });
    },
    warn(message: string): void {
      messages.push({ level: 'warn', message });
    },
    error(message: string): void {
      messages.push({ level: 'error', message });
    }
  };
}

function createTempRoot(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'stratix-create-'));
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

const BUSINESS_ENV_KEYS =
  /^(PORT|HOST|UPSTREAM_URL|DB_|DATABASE_|REDIS_|OSSP_|WPS_)/m;

describe('@stratix/create', () => {
  it('creates an api application with forge as the project toolchain', async () => {
    const cwd = createTempRoot();
    const output = createMemoryOutput();

    await runCreate(['app', 'api', 'demo-api', '--no-install'], {
      cwd,
      output
    });

    const packageJson = readJson<{
      scripts: Record<string, string>;
      dependencies: Record<string, string>;
      devDependencies: Record<string, string>;
    }>(path.join(cwd, 'demo-api', 'package.json'));
    const manifest = readJson<{
      schemaVersion: number;
      template: {
        contribution: {
          dependencies: {
            dev: Record<string, string>;
          };
        };
      };
    }>(path.join(cwd, 'demo-api', '.stratix', 'project.json'));

    assert.equal(manifest.schemaVersion, 2);
    assert.equal(
      manifest.template.contribution.dependencies.dev['@stratix/forge'],
      '^1.1.4'
    );
    assert.equal(packageJson.dependencies['@stratix/core'], '^1.1.0');
    assert.equal(packageJson.devDependencies['@stratix/forge'], '^1.1.4');
    assert.equal(packageJson.devDependencies['@stratix/cli'], undefined);
    assert.equal(
      packageJson.scripts['security:audit'],
      'pnpm audit --prod --audit-level high'
    );
    assert.ok(
      fs.existsSync(path.join(cwd, 'demo-api', '.stratix', 'project.json'))
    );
    assert.equal(
      fs.existsSync(
        path.join(cwd, 'demo-api', 'src', 'config', 'stratix.generated.ts')
      ),
      false
    );
    assert.match(
      fs.readFileSync(
        path.join(cwd, 'demo-api', 'pnpm-workspace.yaml'),
        'utf8'
      ),
      /allowBuilds:\n  esbuild: true/
    );
    assert.doesNotMatch(
      fs.readFileSync(path.join(cwd, 'demo-api', '.env.example'), 'utf8'),
      BUSINESS_ENV_KEYS
    );
    assert.match(
      fs.readFileSync(
        path.join(cwd, 'demo-api', 'src', 'controllers', 'HealthController.ts'),
        'utf8'
      ),
      /config:\s*\{\s*operationId: 'HealthController_check'/
    );
    assert.ok(
      output.messages.some(
        (message) =>
          message.level === 'success' &&
          message.message.includes('Created Stratix app: demo-api')
      )
    );
  });

  it('rejects removed tasks preset', async () => {
    const cwd = createTempRoot();
    const output = createMemoryOutput();

    await assert.rejects(
      runCreate(
        ['app', 'api', 'legacy-task-app', '--preset', 'tasks', '--no-install'],
        {
          cwd,
          output
        }
      ),
      (error) =>
        error instanceof Error &&
        error.message.includes('Preset "tasks" was not found')
    );

    assert.equal(fs.existsSync(path.join(cwd, 'legacy-task-app')), false);
  });

  it('maps app config to sensitiveConfig without business env fallbacks', async () => {
    const cwd = createTempRoot();
    const output = createMemoryOutput();

    await runCreate(
      [
        'app',
        'api',
        'env-config-app',
        '--preset',
        'database,redis,ossp,was-v7',
        '--no-install'
      ],
      {
        cwd,
        output
      }
    );

    const appConfig = fs.readFileSync(
      path.join(cwd, 'env-config-app', 'src', 'stratix.config.ts'),
      'utf8'
    );
    const envExample = fs.readFileSync(
      path.join(cwd, 'env-config-app', '.env.example'),
      'utf8'
    );

    assert.match(appConfig, /const serverConfig = sensitiveConfig\.server/);
    assert.match(appConfig, /databaseConfig\.host \|\| 'localhost'/);
    assert.match(appConfig, /redisConfig\.host \|\| 'localhost'/);
    assert.match(appConfig, /accessKey: osspConfig\.accessKey/);
    assert.match(appConfig, /appSecret: wasV7Config\.appSecret/);
    assert.match(appConfig, /rootDir: sourceRoot/);
    assert.doesNotMatch(appConfig, /patterns: \['src\/\*\*\/\*\.ts'\]/);
    assert.doesNotMatch(appConfig, /process\.env\./);
    assert.doesNotMatch(envExample, BUSINESS_ENV_KEYS);
    assert.doesNotMatch(appConfig, /minioadmin/);
    assert.doesNotMatch(appConfig, /your-app-secret/);
    assert.equal(
      fs.existsSync(
        path.join(
          cwd,
          'env-config-app',
          'src',
          'config',
          'stratix.generated.ts'
        )
      ),
      false
    );
  });

  it('keeps gateway and preset business config out of ordinary env files', async () => {
    const cwd = createTempRoot();
    const output = createMemoryOutput();

    await runCreate(['app', 'gateway', 'gateway-app', '--no-install'], {
      cwd,
      output
    });

    const projectDir = path.join(cwd, 'gateway-app');
    const envExample = fs.readFileSync(
      path.join(projectDir, '.env.example'),
      'utf8'
    );
    const proxyRegistry = fs.readFileSync(
      path.join(projectDir, 'src', 'services', 'ProxyRegistryService.ts'),
      'utf8'
    );

    assert.doesNotMatch(envExample, BUSINESS_ENV_KEYS);
    assert.doesNotMatch(proxyRegistry, /process\.env\./);
    assert.match(proxyRegistry, /target: 'http:\/\/127\.0\.0\.1:3001'/);
  });

  it('lists only creation templates and presets', async () => {
    const cwd = createTempRoot();
    const output = createMemoryOutput();

    await runCreate(['list', 'templates'], { cwd, output });

    const lines = output.messages.map((message) => message.message);
    assert.ok(lines.some((line) => line.startsWith('app:api')));
    assert.ok(lines.some((line) => line.startsWith('plugin:')));
    assert.equal(
      lines.some((line) => line.startsWith('resource:')),
      false
    );
  });

  it('creates a plugin project with a governance manifest', async () => {
    const cwd = createTempRoot();
    const output = createMemoryOutput();

    await runCreate(['plugin', 'data', '@demo/cache-plugin', '--no-install'], {
      cwd,
      output
    });

    const pluginManifest = readJson<{
      schemaVersion: number;
      name: string;
      version: string;
      capabilities: string[];
      provides: string[];
      requires: string[];
      health: boolean;
    }>(path.join(cwd, 'cache-plugin', '.stratix', 'plugin.json'));

    assert.equal(pluginManifest.schemaVersion, 1);
    assert.equal(pluginManifest.name, '@demo/cache-plugin');
    assert.equal(pluginManifest.version, '0.1.0');
    assert.deepEqual(pluginManifest.capabilities, ['data']);
    assert.deepEqual(pluginManifest.provides, ['cachePluginApi']);
    assert.deepEqual(pluginManifest.requires, ['@stratix/database']);
    assert.equal(pluginManifest.health, true);
  });
});
