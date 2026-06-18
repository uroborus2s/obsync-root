import { parseArgs as parseCliArgs, type ParsedArgs } from './core/args.js';
import { CliError, toCliError } from './core/errors.js';
import { createConsoleOutput, type CliOutput } from './core/output.js';
import type { CliPrompter } from './core/prompt.js';

export interface CliRunOptions {
  output?: CliOutput;
  cwd?: string;
  prompter?: CliPrompter;
}

function parseArgs(args: string[]): ParsedArgs {
  return parseCliArgs(args, {
    boolean: [
      'help',
      'install',
      'no-install',
      'yes',
      'dry-run',
      'strict',
      'verbose'
    ],
    string: [
      'preset',
      'pm',
      'config',
      'type',
      'host',
      'port',
      'format',
      'key',
      'required',
      'output',
      'input',
      'length',
      'title',
      'version'
    ],
    alias: {
      h: 'help',
      o: 'output',
      f: 'format',
      k: 'key'
    }
  });
}

function printHelp(output: CliOutput): void {
  output.log(`Usage: stratix <command> [options]

Commands:
  generate  Generate resources in a Stratix project
  add       Add a preset to a Stratix project
  doctor    Validate a Stratix project
  di        Inspect Stratix DI graph
  graph     Inspect Stratix module and plugin graphs
  openapi   Generate OpenAPI artifacts from Stratix route schemas
  build-manifest  Generate a production manifest artifact
  start     Start a Stratix application
  config    Manage encrypted Stratix configuration
  list      List templates and presets
`);
}

export async function runCli(
  args: string[],
  options: CliRunOptions = {}
): Promise<void> {
  const output = options.output || createConsoleOutput();
  const argv = parseArgs(args);
  const command = argv._[0];

  if (!command) {
    printHelp(output);
    return;
  }

  const originalCwd = process.cwd();
  if (options.cwd) {
    process.chdir(options.cwd);
  }

  try {
    switch (command) {
      case 'generate':
      case 'g':
        await import('./commands/generate/index.js').then(
          ({ generateCommand }) => generateCommand(argv, output)
        );
        break;
      case 'add':
        await import('./commands/add/index.js').then(({ addCommand }) =>
          addCommand(argv, output)
        );
        break;
      case 'doctor':
        await import('./commands/doctor/index.js').then(({ doctorCommand }) =>
          doctorCommand(argv, output)
        );
        break;
      case 'di':
        await import('./commands/di/index.js').then(({ diCommand }) =>
          diCommand(argv, output)
        );
        break;
      case 'graph':
        await import('./commands/graph/index.js').then(({ graphCommand }) =>
          graphCommand(argv, output)
        );
        break;
      case 'openapi':
        await import('./commands/openapi/index.js').then(({ openApiCommand }) =>
          openApiCommand(argv, output)
        );
        break;
      case 'build-manifest':
        await import('./commands/build-manifest/index.js').then(
          ({ buildManifestCommand }) => buildManifestCommand(argv, output)
        );
        break;
      case 'start':
        await import('./commands/start/index.js').then(({ startCommand }) =>
          startCommand(argv)
        );
        break;
      case 'config':
        await import('./commands/config/index.js').then(({ configCommand }) =>
          configCommand(argv, output)
        );
        break;
      case 'list':
        await import('./commands/list/index.js').then(({ listCommand }) =>
          listCommand(argv, output)
        );
        break;
      default:
        throw new CliError(`Unknown command: ${command}`);
    }
  } catch (error) {
    const cliError = toCliError(error);
    output.error(cliError.message);
    if (options.cwd) {
      process.chdir(originalCwd);
    }
    throw cliError;
  }

  if (options.cwd) {
    process.chdir(originalCwd);
  }
}
