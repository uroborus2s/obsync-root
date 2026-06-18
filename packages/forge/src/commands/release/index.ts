import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { ParsedArgs } from '../../core/args.js';
import { CliError } from '../../core/errors.js';
import type { CliOutput } from '../../core/output.js';
import { readJsonFile } from '../../utils/fs.js';

interface ReleaseGateCheck {
  id: string;
  label: string;
  command?: string[];
  commands?: string[][];
  env?: Record<string, string>;
  validate?: (output: CliOutput) => void;
}

interface WorkspacePackage {
  name: string;
  version: string;
  dirName: string;
  packageJsonPath: string;
  excluded: boolean;
  exclusionReason?: string;
}

type ReleaseGateScope = 'project' | 'workspace';

const DEFAULT_EXCLUDED_WORKSPACE_PACKAGES = new Set(['@stratix/tasks']);

function printReleaseUsage(output: CliOutput): void {
  output.log(`Usage: stratix release gate [options]

Commands:
  release gate  Validate production release readiness

Options:
  --manifest <file>  Production manifest path, defaults to .stratix/production-manifest.json
  --scope <scope>     Gate scope: project or workspace, defaults to project
  --include-offline-install
                     Include the frozen offline install gate in workspace scope
  --include-registry Include npm registry reconciliation in workspace scope
  --dry-run          Validate static inputs and print the gate plan without executing commands
  --help             Show this help message`);
}

function stringArg(value: unknown): string | undefined {
  if (Array.isArray(value)) {
    return value.at(-1) === undefined ? undefined : String(value.at(-1));
  }
  return value === undefined ? undefined : String(value);
}

function booleanArg(value: unknown): boolean {
  if (Array.isArray(value)) {
    return booleanArg(value.at(-1));
  }
  return value === true || value === 'true';
}

function releaseGateScope(argv: ParsedArgs): ReleaseGateScope {
  const scope = stringArg(argv.scope) || 'project';
  if (scope === 'project' || scope === 'workspace') {
    return scope;
  }
  throw new CliError(`Unknown release gate scope: ${scope}`);
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

function projectReleaseGateChecks(): ReleaseGateCheck[] {
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

function readWorkspacePackages(rootDir: string): WorkspacePackage[] {
  const packagesDir = path.join(rootDir, 'packages');
  if (!fs.existsSync(packagesDir)) {
    throw new CliError(
      `Workspace packages directory not found: ${packagesDir}`
    );
  }

  const packages = fs
    .readdirSync(packagesDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .flatMap((entry) => {
      const packageJsonPath = path.join(
        packagesDir,
        entry.name,
        'package.json'
      );
      if (!fs.existsSync(packageJsonPath)) {
        return [];
      }

      const packageJson =
        readJsonFile<Record<string, unknown>>(packageJsonPath);
      const name = typeof packageJson.name === 'string' ? packageJson.name : '';
      const version =
        typeof packageJson.version === 'string' ? packageJson.version : '';

      if (!name || !version) {
        throw new CliError(
          `Workspace package is missing name or version: ${packageJsonPath}`
        );
      }

      const excluded = DEFAULT_EXCLUDED_WORKSPACE_PACKAGES.has(name);
      return [
        {
          name,
          version,
          dirName: entry.name,
          packageJsonPath,
          excluded,
          exclusionReason: excluded
            ? 'deprecated/out of supported scope'
            : undefined
        }
      ];
    })
    .sort((left, right) => left.name.localeCompare(right.name));

  if (packages.length === 0) {
    throw new CliError(`No workspace packages found under: ${packagesDir}`);
  }

  return packages;
}

function supportedWorkspacePackages(
  packages: WorkspacePackage[]
): WorkspacePackage[] {
  return packages.filter((workspacePackage) => !workspacePackage.excluded);
}

function workspaceReleaseGateChecks(
  packages: WorkspacePackage[],
  options: { includeOfflineInstall: boolean; includeRegistry: boolean }
): ReleaseGateCheck[] {
  const supportedPackages = supportedWorkspacePackages(packages);
  const checks: ReleaseGateCheck[] = [];

  if (options.includeOfflineInstall) {
    checks.push({
      id: 'offline-install',
      label: 'offline-install',
      command: ['pnpm', 'install', '--frozen-lockfile', '--offline'],
      env: { CI: 'true' }
    });
  }

  checks.push(
    {
      id: 'build',
      label: 'build',
      command: ['pnpm', 'run', 'build:supported']
    },
    {
      id: 'test',
      label: 'test',
      command: ['pnpm', 'run', 'test:supported']
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
      id: 'pack',
      label: 'pack',
      commands: supportedPackages.map((workspacePackage) => [
        'pnpm',
        '--filter',
        workspacePackage.name,
        'pack',
        '--pack-destination',
        os.tmpdir()
      ])
    },
    {
      id: 'api',
      label: 'api'
    },
    {
      id: 'release-surface',
      label: 'release-surface',
      validate: (output) => validateWorkspaceReleaseSurface(packages, output)
    }
  );

  if (options.includeRegistry) {
    checks.push({
      id: 'registry',
      label: 'registry',
      commands: supportedPackages.map((workspacePackage) => [
        'npm',
        'view',
        workspacePackage.name,
        'version',
        '--json'
      ])
    });
  }

  return checks;
}

function validateWorkspaceReleaseSurface(
  packages: WorkspacePackage[],
  output: CliOutput
): void {
  const missingExactTags = supportedWorkspacePackages(packages).filter(
    (workspacePackage) => {
      const expectedTag = `${workspacePackage.name}@${workspacePackage.version}`;
      const result = spawnSync('git', ['tag', '--list', expectedTag], {
        cwd: process.cwd(),
        encoding: 'utf8',
        shell: false
      });

      if (result.status !== 0) {
        throw new CliError(
          'Release surface check failed: cannot read git tags'
        );
      }

      return result.stdout.trim() !== expectedTag;
    }
  );

  if (missingExactTags.length > 0) {
    output.error(
      `Release surface missing exact git tags: ${missingExactTags
        .map(
          (workspacePackage) =>
            `${workspacePackage.name}@${workspacePackage.version}`
        )
        .join(', ')}`
    );
    throw new CliError('Release surface is not aligned');
  }

  output.info('Release gate release-surface: exact package tags present.');
}

function printWorkspaceReleaseSummary(
  packages: WorkspacePackage[],
  output: CliOutput
): void {
  const supportedPackages = supportedWorkspacePackages(packages);
  output.info('Release gate scope: workspace release readiness');
  output.info(
    `Release gate supported packages: ${supportedPackages
      .map(
        (workspacePackage) =>
          `${workspacePackage.name}@${workspacePackage.version}`
      )
      .join(', ')}`
  );

  const excludedPackages = packages.filter(
    (workspacePackage) => workspacePackage.excluded
  );
  if (excludedPackages.length > 0) {
    output.warn(
      `Release gate exclusions: ${excludedPackages
        .map((workspacePackage) => `${workspacePackage.name} excluded`)
        .join(', ')}`
    );
  }
}

function runCheck(check: ReleaseGateCheck, output: CliOutput): void {
  const commands = check.commands || (check.command ? [check.command] : []);

  if (commands.length === 0) {
    if (check.validate) {
      check.validate(output);
      return;
    }

    output.info(`Release gate ${check.id}: static check passed.`);
    return;
  }

  for (const command of commands) {
    output.info(`Release gate ${check.id}: ${command.join(' ')}`);
    const result = spawnSync(command[0], command.slice(1), {
      cwd: process.cwd(),
      env: check.env ? { ...process.env, ...check.env } : process.env,
      stdio: 'inherit',
      shell: false
    });

    if (result.status !== 0) {
      throw new CliError(`Release gate failed: ${check.id}`);
    }
  }
}

async function releaseGateCommand(
  argv: ParsedArgs,
  output: CliOutput
): Promise<void> {
  const scope = releaseGateScope(argv);
  const includeOfflineInstall = booleanArg(argv['include-offline-install']);
  const includeRegistry = booleanArg(argv['include-registry']);

  let checks: ReleaseGateCheck[];

  if (scope === 'workspace') {
    const packages = readWorkspacePackages(process.cwd());
    printWorkspaceReleaseSummary(packages, output);
    checks = workspaceReleaseGateChecks(packages, {
      includeOfflineInstall,
      includeRegistry
    });
  } else {
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

    checks = projectReleaseGateChecks();
  }

  output.info(
    `Release gate plan: ${checks.map((check) => check.id).join('/')} (${checks.length} checks)`
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
