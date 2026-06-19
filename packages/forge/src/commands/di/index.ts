import type { ParsedArgs } from '../../core/args.js';
import { CliError } from '../../core/errors.js';
import type { CliOutput } from '../../core/output.js';
import { loadProjectManifest } from '../../project/load-project-manifest.js';
import {
  analyzeSourceDI,
  type SourceDINode
} from '../doctor/di-source-analysis.js';

function printDIUsage(output: CliOutput): void {
  output.log(`Usage: stratix di <graph> [options]

Commands:
  di graph  Print the Stratix DI token graph

Options:
  --format json|mermaid  Output format, defaults to json
  --help                 Show this help message`);
}

function renderMermaid(nodes: SourceDINode[]): string {
  const lines = ['flowchart TD'];
  for (const node of nodes) {
    if (node.dependencies.length === 0) {
      lines.push(`  ${node.token}["${node.token}"]`);
      continue;
    }

    for (const dependency of node.dependencies) {
      lines.push(
        `  ${node.token}["${node.token}"] --> ${dependency}["${dependency}"]`
      );
    }
  }

  return lines.join('\n');
}

export async function diCommand(
  argv: ParsedArgs,
  output: CliOutput
): Promise<void> {
  const subcommand = argv._[1];
  if (argv.help || subcommand === 'help') {
    printDIUsage(output);
    return;
  }

  if (subcommand !== 'graph') {
    throw new CliError(`Unknown di command: ${subcommand || ''}`.trim());
  }

  const format = argv.format || 'json';
  if (format !== 'json' && format !== 'mermaid') {
    throw new CliError(`Unsupported DI graph format: ${format}`);
  }

  const { rootDir } = loadProjectManifest(process.cwd());
  const graph = analyzeSourceDI(rootDir);

  if (format === 'mermaid') {
    output.log(renderMermaid(graph.nodes));
    return;
  }

  output.log(JSON.stringify(graph, null, 2));
}
