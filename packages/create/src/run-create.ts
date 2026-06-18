import { parseArgs as parseCliArgs, type ParsedArgs } from './core/args.js';
import { CliError, toCliError } from './core/errors.js';
import { createConsoleOutput, type CliOutput } from './core/output.js';
import type { CliPrompter } from './core/prompt.js';

export interface CreateRunOptions {
  output?: CliOutput;
  cwd?: string;
  prompter?: CliPrompter;
}

function normalizeArgs(args: string[]): string[] {
  const command = args[0];
  if (!command) {
    return ['init'];
  }
  if (command === 'init' || command === 'list' || command === 'help') {
    return args;
  }

  return ['init', ...args];
}

function parseArgs(args: string[]): ParsedArgs {
  return parseCliArgs(normalizeArgs(args), {
    boolean: ['help', 'install', 'no-install', 'yes'],
    string: ['preset', 'pm'],
    alias: {
      h: 'help'
    }
  });
}

function printHelp(output: CliOutput): void {
  output.log(`Usage: create-stratix <app|plugin> <type> <name> [options]

Commands:
  app <type> <name>     Create a Stratix application
  plugin <type> <name>  Create a Stratix plugin
  list templates        List application and plugin templates
  list presets          List creation presets

Options:
  --preset <ids>        Comma-separated presets
  --pm <pm>             Package manager: pnpm, npm, or yarn
  --install             Install dependencies after creation
  --no-install          Skip dependency installation
  --yes                 Fail instead of prompting for missing arguments
  --help                Show this help message`);
}

export async function runCreate(
  args: string[],
  options: CreateRunOptions = {}
): Promise<void> {
  const output = options.output || createConsoleOutput();
  const argv = parseArgs(args);
  const command = argv._[0];

  if (!command || argv.help || command === 'help') {
    printHelp(output);
    return;
  }

  const originalCwd = process.cwd();
  if (options.cwd) {
    process.chdir(options.cwd);
  }

  try {
    switch (command) {
      case 'init':
        await import('./commands/init/index.js').then(({ initCommand }) =>
          initCommand(argv, output, { prompter: options.prompter })
        );
        break;
      case 'list':
        await import('./commands/list/index.js').then(({ listCommand }) =>
          listCommand(argv, output)
        );
        break;
      default:
        throw new CliError(`Unknown create command: ${command}`);
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
