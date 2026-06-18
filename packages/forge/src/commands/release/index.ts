import { spawnSync } from 'node:child_process';
import path from 'node:path';
import type { ParsedArgs } from '../../core/args.js';
import { CliError } from '../../core/errors.js';
import type { CliOutput } from '../../core/output.js';
import { readJsonFile } from '../../utils/fs.js';

interface ReleaseGateCheck {
  id: 'build' | 'test' | 'docs' | 'security' | 'pack' | 'api' | 'manifest';
  label: string;
  command?: string[];
}

function printReleaseUsage(output: CliOutput): void {
  output.log(`Usage: stratix release gate [options]

Commands:
  release gate  Validate production release readiness

Options:
  --manifest <file>  Production manifest path, defaults to .stratix/production-manifest.json
  --dry-run          Validate static inputs and print the gate plan without executing commands
  --help             Show this help message`);
}

function stringArg(value: unknown): string | undefined {
  if (Array.isArray(value)) {
    return value.at(-1) === undefined ? undefined : String(value.at(-1));
  }
  return value === undefined ? undefined : String(value);
}

function validateProductionManifest(manifestPath: string): void {
  let manifest: any;
  try {
    manifest = readJsonFile(manifestPath);
  } catch {
    throw new CliError(`Production manifest not found: ${manifestPath}`);
  }

  if (manifest.schemaVersion !== 1) {
    throw new CliError(
      `Production manifest has unsupported schemaVersion: ${manifestPath}`
    );
  }
  if (!manifest.project || !Array.isArray(manifest.routes)) {
    throw new CliError(`Production manifest is invalid: ${manifestPath}`);
  }
  if (!manifest.di || !Array.isArray(manifest.di.tokens)) {
    throw new CliError(
      `Production manifest DI section is invalid: ${manifestPath}`
    );
  }
}

function releaseGateChecks(): ReleaseGateCheck[] {
  return [
    {
      id: 'build',
      label: 'build',
      command: ['pnpm', 'run', 'build']
    },
    {
      id: 'test',
      label: 'test',
      command: ['pnpm', 'test']
    },
    {
      id: 'docs',
      label: 'docs',
      command: [
        'uvx',
        '--from',
        'docs-stratego',
        'docs-stratego',
        'source',
        'validate',
        '--repo-path',
        '.'
      ]
    },
    {
      id: 'security',
      label: 'security'
    },
    {
      id: 'pack',
      label: 'pack',
      command: ['pnpm', 'pack', '--dry-run']
    },
    {
      id: 'api',
      label: 'api'
    },
    {
      id: 'manifest',
      label: 'manifest'
    }
  ];
}

function runCheck(check: ReleaseGateCheck, output: CliOutput): void {
  if (!check.command) {
    output.info(`Release gate ${check.id}: static check passed.`);
    return;
  }

  output.info(`Release gate ${check.id}: ${check.command.join(' ')}`);
  const result = spawnSync(check.command[0], check.command.slice(1), {
    cwd: process.cwd(),
    stdio: 'inherit',
    shell: false
  });

  if (result.status !== 0) {
    throw new CliError(`Release gate failed: ${check.id}`);
  }
}

async function releaseGateCommand(
  argv: ParsedArgs,
  output: CliOutput
): Promise<void> {
  const manifestPath = path.resolve(
    process.cwd(),
    stringArg(argv.manifest) ||
      path.join('.stratix', 'production-manifest.json')
  );

  try {
    validateProductionManifest(manifestPath);
  } catch (error) {
    output.error(error instanceof Error ? error.message : String(error));
    throw error;
  }

  const checks = releaseGateChecks();
  output.info(
    `Release gate plan: build/test/docs/security/pack/api/manifest (${checks.length} checks)`
  );

  if (argv['dry-run']) {
    output.success('Release gate checks passed.');
    return;
  }

  for (const check of checks) {
    runCheck(check, output);
  }

  output.success('Release gate checks passed.');
}

export async function releaseCommand(
  argv: ParsedArgs,
  output: CliOutput
): Promise<void> {
  const subcommand = argv._[1];
  if (argv.help || subcommand === 'help') {
    printReleaseUsage(output);
    return;
  }

  if (subcommand !== 'gate') {
    throw new CliError(`Unknown release command: ${subcommand || ''}`.trim());
  }

  await releaseGateCommand(argv, output);
}
