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

describe('@stratix/create', () => {
  it('creates an api application with forge as the project toolchain', async () => {
    const cwd = createTempRoot();
    const output = createMemoryOutput();

    await runCreate(['app', 'api', 'demo-api', '--no-install'], { cwd, output });

    const packageJson = readJson<{
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
    assert.equal(manifest.template.contribution.dependencies.dev['@stratix/forge'], '^1.1.0');
    assert.equal(packageJson.dependencies['@stratix/core'], '^1.1.0');
    assert.equal(packageJson.devDependencies['@stratix/forge'], '^1.1.0');
    assert.equal(packageJson.devDependencies['@stratix/cli'], undefined);
    assert.ok(fs.existsSync(path.join(cwd, 'demo-api', '.stratix', 'project.json')));
    assert.ok(
      output.messages.some(
        (message) =>
          message.level === 'success' &&
          message.message.includes('Created Stratix app: demo-api')
      )
    );
  });

  it('lists only creation templates and presets', async () => {
    const cwd = createTempRoot();
    const output = createMemoryOutput();

    await runCreate(['list', 'templates'], { cwd, output });

    const lines = output.messages.map((message) => message.message);
    assert.ok(lines.some((line) => line.startsWith('app:api')));
    assert.ok(lines.some((line) => line.startsWith('plugin:')));
    assert.equal(lines.some((line) => line.startsWith('resource:')), false);
  });
});
