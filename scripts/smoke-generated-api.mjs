#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import {
  appendFile,
  mkdtemp,
  readFile,
  rm,
  writeFile
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, '..');
const node = process.execPath;
const pnpm = process.env.npm_execpath || 'pnpm';
const createCli = join(
  repoRoot,
  'packages/create/dist/bin/create-stratix.js'
);
const forbiddenBusinessEnv =
  /^(PORT|HOST|UPSTREAM_URL|DB_|DATABASE_|REDIS_|OSSP_|WPS_)/m;

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
    throw new Error(
      [
        `Command failed: ${[command, ...args].join(' ')}`,
        result.stdout.trim(),
        result.stderr.trim()
      ]
        .filter(Boolean)
        .join('\n')
    );
  }

  return result.stdout;
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'));
}

async function writeJson(filePath, value) {
  await writeFile(filePath, JSON.stringify(value, null, 2) + '\n');
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const tempRoot = await mkdtemp(join(tmpdir(), 'stratix-generated-smoke-'));

try {
  const apiName = 'generated-api-smoke';
  const presetApiName = 'generated-preset-api-smoke';
  const gatewayName = 'generated-gateway-smoke';
  const apiDir = join(tempRoot, apiName);
  const presetApiDir = join(tempRoot, presetApiName);
  const gatewayDir = join(tempRoot, gatewayName);

  run(node, [createCli, 'app', 'api', apiName, '--no-install'], {
    cwd: tempRoot
  });
  run(
    node,
    [
      createCli,
      'app',
      'api',
      presetApiName,
      '--preset',
      'database,redis,ossp,was-v7',
      '--no-install'
    ],
    { cwd: tempRoot }
  );
  run(node, [createCli, 'app', 'gateway', gatewayName, '--no-install'], {
    cwd: tempRoot
  });

  const apiPackage = await readJson(join(apiDir, 'package.json'));
  apiPackage.devDependencies['@stratix/forge'] =
    `file:${join(repoRoot, 'packages/forge')}`;
  await writeJson(join(apiDir, 'package.json'), apiPackage);
  await appendFile(
    join(apiDir, 'pnpm-workspace.yaml'),
    `overrides:\n  '@stratix/core': file:${join(repoRoot, 'packages/core')}\n`
  );

  const apiEnv = await readFile(join(apiDir, '.env.example'), 'utf8');
  const presetApiEnv = await readFile(
    join(presetApiDir, '.env.example'),
    'utf8'
  );
  const gatewayEnv = await readFile(join(gatewayDir, '.env.example'), 'utf8');
  const gatewayProxy = await readFile(
    join(gatewayDir, 'src/services/ProxyRegistryService.ts'),
    'utf8'
  );

  assert(
    !forbiddenBusinessEnv.test(apiEnv),
    'api .env.example contains business configuration keys'
  );
  assert(
    !forbiddenBusinessEnv.test(presetApiEnv),
    'preset api .env.example contains business configuration keys'
  );
  assert(
    !forbiddenBusinessEnv.test(gatewayEnv),
    'gateway .env.example contains business configuration keys'
  );
  assert(
    !/process\.env\./.test(gatewayProxy),
    'gateway proxy template reads process.env'
  );

  run(pnpm, ['install'], { cwd: apiDir });
  run(pnpm, ['build'], { cwd: apiDir });
  run(pnpm, ['exec', 'stratix', 'doctor'], { cwd: apiDir });
  run(pnpm, ['exec', 'stratix', 'config', 'encrypt', '--help'], {
    cwd: apiDir
  });
  run(
    pnpm,
    [
      'exec',
      'stratix',
      'openapi',
      'generate',
      '--output',
      'openapi.json',
      '--strict'
    ],
    { cwd: apiDir }
  );

  const openApi = await readJson(join(apiDir, 'openapi.json'));
  const health = openApi.paths?.['/health']?.get;
  assert(health, 'generated OpenAPI is missing GET /health');
  assert(
    health.operationId === 'HealthController_check',
    'generated OpenAPI has wrong /health operationId'
  );
  assert(health.responses?.['200'], 'generated OpenAPI is missing 200 response');

  console.log('generated API consumer smoke passed');
} finally {
  if (process.env.KEEP_STRATIX_SMOKE_TMP !== '1') {
    await rm(tempRoot, { recursive: true, force: true });
  }
}
