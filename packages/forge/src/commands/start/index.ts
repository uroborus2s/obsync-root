import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import type { ParsedArgs } from '../../core/args.js';
import { CliError } from '../../core/errors.js';

interface StratixRunOptions {
  type?: 'web' | 'cli' | 'worker' | 'service' | 'auto';
  configOptions?: string | Record<string, unknown>;
  envOptions?: {
    override?: boolean;
  };
  server?: {
    host?: string;
    port?: number;
  };
}

interface StratixCoreModule {
  Stratix: {
    run(options?: StratixRunOptions): Promise<unknown>;
  };
}

function packageJsonPath(projectDir: string, packageName: string): string {
  return path.join(
    projectDir,
    'node_modules',
    ...packageName.split('/'),
    'package.json'
  );
}

function importEntryFromPackageJson(packageJson: Record<string, any>): string {
  const exportsField = packageJson.exports;
  const rootExport =
    exportsField &&
    typeof exportsField === 'object' &&
    !Array.isArray(exportsField)
      ? exportsField['.'] || exportsField
      : exportsField;

  if (typeof rootExport === 'string') {
    return rootExport;
  }

  if (rootExport && typeof rootExport === 'object') {
    for (const condition of ['import', 'default', 'module']) {
      if (typeof rootExport[condition] === 'string') {
        return rootExport[condition];
      }
    }
  }

  if (typeof packageJson.module === 'string') {
    return packageJson.module;
  }
  if (typeof packageJson.main === 'string') {
    return packageJson.main;
  }

  throw new CliError(
    '@stratix/core package.json does not declare an importable entrypoint.'
  );
}

async function loadProjectStratixCore(
  projectDir: string
): Promise<StratixCoreModule> {
  let resolvedPath: string;

  try {
    const manifestPath = packageJsonPath(projectDir, '@stratix/core');
    const packageJson = JSON.parse(
      fs.readFileSync(manifestPath, 'utf8')
    ) as Record<string, any>;
    resolvedPath = path.resolve(
      path.dirname(manifestPath),
      importEntryFromPackageJson(packageJson)
    );
  } catch (error) {
    if (error instanceof CliError) {
      throw error;
    }
    throw new CliError(
      'Cannot resolve @stratix/core from the current project. Please install the project dependencies before running stratix start.'
    );
  }

  const module = (await import(
    pathToFileURL(resolvedPath).href
  )) as Partial<StratixCoreModule>;

  if (!module.Stratix || typeof module.Stratix.run !== 'function') {
    throw new CliError(
      'The resolved @stratix/core module does not export Stratix.run().'
    );
  }

  return module as StratixCoreModule;
}

export async function startCommand(argv: ParsedArgs): Promise<void> {
  const type = typeof argv.type === 'string' ? argv.type : 'auto';
  const config = typeof argv.config === 'string' ? argv.config : undefined;
  const host = typeof argv.host === 'string' ? argv.host : undefined;
  const port = typeof argv.port === 'string' ? Number(argv.port) : undefined;
  const { Stratix } = await loadProjectStratixCore(process.cwd());

  const options: StratixRunOptions = {
    type: type as StratixRunOptions['type'],
    configOptions: config,
    server: {
      host,
      port
    },
    envOptions: {
      override: true
    }
  };

  await Stratix.run(options);
}
