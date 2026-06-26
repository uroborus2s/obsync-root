#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, '../../..');
const pnpm = process.env.npm_execpath || 'pnpm';
const node = process.execPath;

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    encoding: 'utf8',
    env: {
      ...process.env,
      CI: '1'
    },
    stdio: ['ignore', 'pipe', 'pipe'],
    ...options
  });

  if (result.status !== 0) {
    const renderedCommand = [command, ...args].join(' ');
    throw new Error(
      [
        `Command failed: ${renderedCommand}`,
        result.stdout.trim(),
        result.stderr.trim()
      ]
        .filter(Boolean)
        .join('\n')
    );
  }

  return result.stdout;
}

function resolvePackedTarball(packOutput) {
  const parsed = JSON.parse(packOutput.trim());
  const entry = Array.isArray(parsed) ? parsed[0] : parsed;
  const filename = entry?.filename;
  if (typeof filename !== 'string' || filename.length === 0) {
    throw new Error(`Unable to resolve packed tarball from: ${packOutput}`);
  }
  return isAbsolute(filename) ? filename : resolve(repoRoot, filename);
}

const tempRoot = await mkdtemp(join(tmpdir(), 'stratix-core-api-smoke-'));

try {
  run(pnpm, ['--filter', '@stratix/core', 'run', 'build']);
  const packOutput = run(pnpm, [
    '--filter',
    '@stratix/core',
    'pack',
    '--pack-destination',
    tempRoot,
    '--json'
  ]);
  const tarball = resolvePackedTarball(packOutput);
  const consumerRoot = join(tempRoot, 'consumer');

  await mkdir(consumerRoot, { recursive: true });
  await writeFile(
    join(consumerRoot, 'package.json'),
    JSON.stringify(
      {
        name: 'stratix-core-api-smoke',
        private: true,
        type: 'module'
      },
      null,
      2
    )
  );

  const installArgs = ['add', '--ignore-scripts', tarball];
  if (process.env.STRATIX_SMOKE_OFFLINE === '1') {
    installArgs.splice(1, 0, '--offline');
  }

  run(pnpm, installArgs, {
    cwd: consumerRoot
  });

  const smokeFile = join(consumerRoot, 'smoke.mjs');
  await writeFile(
    smokeFile,
    `
import { ConfigurationError, Service, Stratix } from '@stratix/core';
import { hasPermission } from '@stratix/core/auth';
import { createContext } from '@stratix/core/context';
import { createErrorEnvelope, getControllerRouteContracts } from '@stratix/core/contracts';
import { chunk, deepMerge } from '@stratix/core/data';
import { createDIGraph } from '@stratix/core/diagnostics';
import { getNodeEnv } from '@stratix/core/environment';
import { ApplicationBootstrap, BootstrapPhase } from '@stratix/core/internal';
import { LoggerFactory } from '@stratix/core/logger';
import { RESOLVER, withRegisterAutoDI } from '@stratix/core/plugin';
import { createServiceFunction } from '@stratix/core/service';

const assertFunction = (name, value) => {
  if (typeof value !== 'function') {
    throw new Error(name + ' must be a function');
  }
};

assertFunction('Stratix.run', Stratix.run);
assertFunction('Service', Service);
assertFunction('ConfigurationError', ConfigurationError);
assertFunction('hasPermission', hasPermission);
assertFunction('createContext', createContext);
assertFunction('createErrorEnvelope', createErrorEnvelope);
assertFunction('getControllerRouteContracts', getControllerRouteContracts);
assertFunction('chunk', chunk);
assertFunction('deepMerge', deepMerge);
assertFunction('createDIGraph', createDIGraph);
assertFunction('getNodeEnv', getNodeEnv);
assertFunction('ApplicationBootstrap', ApplicationBootstrap);
assertFunction('LoggerFactory.createUnifiedLogger', LoggerFactory.createUnifiedLogger);
assertFunction('withRegisterAutoDI', withRegisterAutoDI);
assertFunction('createServiceFunction', createServiceFunction);

if (typeof BootstrapPhase !== 'object' || BootstrapPhase.READY !== 'ready') {
  throw new Error('BootstrapPhase contract mismatch');
}
if (RESOLVER === undefined) {
  throw new Error('RESOLVER must be exported');
}
if (chunk([1, 2, 3], 2).length !== 2) {
  throw new Error('data subpath behavior mismatch');
}

const app = await Stratix.run({
  type: 'cli',
  gracefulShutdown: false,
  config: {
    server: {},
    plugins: [],
    autoLoad: {},
    discovery: { enabled: false }
  }
});

await app.stop();
console.log('packed @stratix/core API smoke passed');
`
  );

  process.stdout.write(run(node, [smokeFile], { cwd: consumerRoot }));
} finally {
  if (process.env.KEEP_STRATIX_SMOKE_TMP !== '1') {
    await rm(tempRoot, { recursive: true, force: true });
  }
}
