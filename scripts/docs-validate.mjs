#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { delimiter, join } from 'node:path';

const repoPath = process.argv[2] ?? '.';
const docsStrategoArgs = [
  '--from',
  'docs-stratego',
  'docs-stratego',
  'source',
  'validate',
  '--repo-path',
  repoPath
];

function run(command, args, options = {}) {
  return spawnSync(command, args, {
    stdio: 'inherit',
    ...options
  });
}

function canRun(command, args, options = {}) {
  const result = spawnSync(command, args, {
    stdio: 'ignore',
    ...options
  });
  return result.status === 0;
}

function exitWith(result) {
  process.exit(result.status ?? 1);
}

function tempUvEnv(targetDir) {
  return {
    ...process.env,
    PYTHONPATH: [targetDir, process.env.PYTHONPATH]
      .filter(Boolean)
      .join(delimiter),
    UV_CACHE_DIR:
      process.env.UV_CACHE_DIR ?? join(tmpdir(), 'stratix-docs-uv-cache'),
    UV_TOOL_DIR:
      process.env.UV_TOOL_DIR ?? join(tmpdir(), 'stratix-docs-uv-tools')
  };
}

if (canRun('uvx', ['--version'])) {
  exitWith(run('uvx', docsStrategoArgs));
}

if (canRun('uv', ['--version'])) {
  exitWith(run('uv', ['tool', 'run', ...docsStrategoArgs]));
}

if (canRun('python3', ['-m', 'uv', '--version'])) {
  exitWith(run('python3', ['-m', 'uv', 'tool', 'run', ...docsStrategoArgs]));
}

const targetDir =
  process.env.STRATIX_DOCS_UV_TARGET ?? join(tmpdir(), 'stratix-docs-uv');
mkdirSync(targetDir, { recursive: true });

const env = tempUvEnv(targetDir);

if (!canRun('python3', ['-m', 'uv', '--version'], { env })) {
  const installResult = run(
    'python3',
    ['-m', 'pip', 'install', '--target', targetDir, 'uv'],
    {
      env: {
        ...process.env,
        PIP_CACHE_DIR:
          process.env.PIP_CACHE_DIR ?? join(tmpdir(), 'stratix-docs-pip-cache')
      }
    }
  );

  if (installResult.status !== 0) {
    process.exit(installResult.status ?? 1);
  }
}

exitWith(
  run('python3', ['-m', 'uv', 'tool', 'run', ...docsStrategoArgs], { env })
);
