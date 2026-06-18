import path from 'node:path';
import { createRequire } from 'node:module';
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

async function loadProjectStratixCore(projectDir: string): Promise<StratixCoreModule> {
  let resolvedPath: string;

  try {
    const projectRequire = createRequire(path.join(projectDir, 'package.json'));
    resolvedPath = projectRequire.resolve('@stratix/core');
  } catch {
    throw new CliError(
      'Cannot resolve @stratix/core from the current project. Please install the project dependencies before running stratix start.'
    );
  }

  const module = (await import(pathToFileURL(resolvedPath).href)) as Partial<StratixCoreModule>;

  if (!module.Stratix || typeof module.Stratix.run !== 'function') {
    throw new CliError('The resolved @stratix/core module does not export Stratix.run().');
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
