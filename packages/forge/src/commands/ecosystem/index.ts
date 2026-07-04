import type { ParsedArgs } from '../../core/args.js';
import { CliError } from '../../core/errors.js';
import type { CliOutput } from '../../core/output.js';
import { buildAdaptPlan, writeAdaptPlan, type AdaptPlan } from './adapt.js';
import { listEcosystemCatalog } from './catalog.js';
import { inspectEcosystemPackage } from './inspect.js';
import { searchEcosystem } from './search.js';
import type { Candidate, EcosystemSource } from './types.js';

function printUsage(output: CliOutput): void {
  output.log(`Usage: stratix ecosystem <search|inspect|adapt|catalog> [args] [options]

Commands:
  ecosystem search <query>       Search Stratix, Fastify, and npm plugin candidates
  ecosystem inspect <package>    Inspect npm, GitHub, and Stratix evidence for a package
  ecosystem adapt <package>      Generate a Stratix adapter wrapper for a Fastify plugin
  ecosystem catalog list         List local Stratix and Fastify catalog entries

Options:
  --format table|json  Output format, defaults to table
  --source <list>      Comma-separated sources: stratix,fastify,npm
  --limit <number>     Search result limit, defaults to 10
  --registry <url>     Override npm registry URL
  --name <name>        Adapter name for ecosystem adapt
  --target <dir>       Target directory for ecosystem adapt
  --dry-run            Print generated files without writing them
  --help               Show this help message`);
}

function stringArg(value: unknown): string | undefined {
  if (Array.isArray(value)) {
    return value.at(-1) === undefined ? undefined : String(value.at(-1));
  }
  return value === undefined ? undefined : String(value);
}

function numberArg(value: unknown, fallback: number): number {
  const parsed = Number(stringArg(value));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function jsonCandidate(candidate: Candidate): Record<string, unknown> {
  return {
    name: candidate.name,
    ecosystem: candidate.ecosystem,
    version: candidate.version,
    description: candidate.description,
    keywords: candidate.keywords,
    repository: candidate.repository,
    presets: candidate.presets,
    capabilities: candidate.capabilities,
    fastifyCategory: candidate.fastifyCategory,
    score: candidate.score,
    signals: candidate.signals,
    evidence: candidate.evidence
  };
}

function printTable(candidates: Candidate[], output: CliOutput): void {
  output.log('name\tsource\tversion\tsignals\tdescription');
  for (const candidate of candidates) {
    const signals = Object.entries(candidate.signals)
      .filter(([, value]) => value)
      .map(([key]) => key)
      .join(',');
    output.log(
      `${candidate.name}\t${candidate.ecosystem}\t${candidate.version || ''}\t${signals}\t${candidate.description || ''}`
    );
  }
}

function parseSources(value: unknown): EcosystemSource[] {
  const raw = stringArg(value);
  if (!raw) {
    return ['stratix', 'fastify', 'npm'];
  }
  const valid = new Set<EcosystemSource>(['stratix', 'fastify', 'npm']);
  const sources = raw
    .split(',')
    .map((source) => source.trim())
    .filter(Boolean);
  for (const source of sources) {
    if (!valid.has(source as EcosystemSource)) {
      throw new CliError(`Unsupported ecosystem source: ${source}`);
    }
  }
  return sources as EcosystemSource[];
}

function jsonAdaptPlan(plan: AdaptPlan): Record<string, unknown> {
  return {
    packageName: plan.packageName,
    adapterName: plan.adapterName,
    targetDir: plan.targetDir,
    files: plan.files.map((file) => ({
      path: file.path,
      content: file.content
    }))
  };
}

export async function ecosystemCommand(
  argv: ParsedArgs,
  output: CliOutput
): Promise<void> {
  const subcommand = argv._[1];
  if (argv.help || subcommand === 'help') {
    printUsage(output);
    return;
  }

  const format = stringArg(argv.format) || 'table';
  if (format !== 'table' && format !== 'json') {
    throw new CliError(`Unsupported ecosystem output format: ${format}`);
  }

  if (subcommand === 'search') {
    const query = argv._[2];
    if (!query) {
      throw new CliError('Usage: stratix ecosystem search <query>');
    }
    const result = await searchEcosystem({
      query,
      limit: numberArg(argv.limit, 10),
      registry: stringArg(argv.registry),
      sources: parseSources(argv.source)
    });

    if (format === 'json') {
      output.log(JSON.stringify(result.candidates.map(jsonCandidate), null, 2));
      return;
    }
    printTable(result.candidates, output);
    return;
  }

  if (subcommand === 'inspect') {
    const name = argv._[2];
    if (!name) {
      throw new CliError('Usage: stratix ecosystem inspect <package>');
    }
    const result = await inspectEcosystemPackage({
      name,
      registry: stringArg(argv.registry)
    });
    const payload = {
      ...jsonCandidate(result.candidate),
      evidence: result.evidence
    };

    if (format === 'json') {
      output.log(JSON.stringify(payload, null, 2));
      return;
    }
    output.log(`${result.candidate.name} ${result.candidate.version || ''}`);
    output.log(JSON.stringify(result.evidence, null, 2));
    return;
  }

  if (subcommand === 'catalog') {
    if (argv._[2] !== 'list') {
      throw new CliError('Usage: stratix ecosystem catalog list');
    }
    const sources = parseSources(argv.source).filter(
      (source) => source !== 'npm'
    );
    if (sources.length === 0) {
      throw new CliError('catalog list supports only stratix and fastify');
    }
    const candidates = await listEcosystemCatalog({ sources });
    if (format === 'json') {
      output.log(JSON.stringify(candidates.map(jsonCandidate), null, 2));
      return;
    }
    printTable(candidates, output);
    return;
  }

  if (subcommand === 'adapt') {
    const packageName = argv._[2];
    const adapterName = stringArg(argv.name);
    const target = stringArg(argv.target);
    if (!packageName || !adapterName || !target) {
      throw new CliError(
        'Usage: stratix ecosystem adapt <package> --name <name> --target <dir>'
      );
    }
    const plan = buildAdaptPlan({
      packageName,
      adapterName,
      targetDir: target
    });
    if (argv['dry-run']) {
      if (format === 'json') {
        output.log(JSON.stringify(jsonAdaptPlan(plan), null, 2));
        return;
      }
      output.log(`Dry run: ${plan.packageName} -> ${plan.targetDir}`);
      for (const file of plan.files) {
        output.log(file.path);
      }
      return;
    }

    writeAdaptPlan(plan, argv.force === true);
    for (const file of plan.files) {
      output.success(`Generated ${file.path}`);
    }
    return;
  }

  throw new CliError('Usage: stratix ecosystem <search|inspect|adapt|catalog>');
}
