import type { ParsedArgs } from '../../core/args.js';
import { CliError } from '../../core/errors.js';
import type { CliOutput } from '../../core/output.js';
import {
  analyzeProjectModules,
  renderModuleGraphMermaid
} from '../../modules/module-analysis.js';
import {
  analyzeProjectPlugins,
  renderPluginGraphMermaid
} from '../../plugins/plugin-analysis.js';
import { loadProjectManifest } from '../../project/load-project-manifest.js';

function printGraphUsage(output: CliOutput): void {
  output.log(`Usage: stratix graph <modules|plugins> [options]

Commands:
  graph modules  Print the Stratix module governance graph
  graph plugins  Print the Stratix plugin capability graph

Options:
  --format json|mermaid  Output format, defaults to json
  --help                 Show this help message`);
}

export async function graphCommand(
  argv: ParsedArgs,
  output: CliOutput
): Promise<void> {
  const subcommand = argv._[1];
  if (argv.help || subcommand === 'help') {
    printGraphUsage(output);
    return;
  }

  if (subcommand !== 'modules' && subcommand !== 'plugins') {
    throw new CliError(`Unknown graph command: ${subcommand || ''}`.trim());
  }

  const format = argv.format || 'json';
  if (format !== 'json' && format !== 'mermaid') {
    throw new CliError(`Unsupported graph format: ${format}`);
  }

  const { rootDir } = loadProjectManifest(process.cwd());
  if (subcommand === 'plugins') {
    const analysis = analyzeProjectPlugins(rootDir);

    if (format === 'mermaid') {
      output.log(renderPluginGraphMermaid(analysis));
      return;
    }

    output.log(JSON.stringify(analysis, null, 2));
    return;
  }

  const analysis = analyzeProjectModules(rootDir);

  if (format === 'mermaid') {
    output.log(renderModuleGraphMermaid(analysis));
    return;
  }

  output.log(JSON.stringify(analysis, null, 2));
}
