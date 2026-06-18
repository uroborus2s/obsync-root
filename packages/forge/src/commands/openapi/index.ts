import path from 'node:path';
import type { ParsedArgs } from '../../core/args.js';
import { CliError } from '../../core/errors.js';
import type { CliOutput } from '../../core/output.js';
import { loadProjectManifest } from '../../project/load-project-manifest.js';
import { readJsonFile, writeJsonFile } from '../../utils/fs.js';
import { writeTextFile } from '../../utils/fs.js';
import {
  analyzeSourceRoutes,
  generateSourceOpenApiDocument,
  validateSourceRouteContracts
} from './source-route-analysis.js';
import { generateTypedClient, type OpenApiDocument } from './typed-client.js';

function printOpenApiUsage(output: CliOutput): void {
  output.log(`Usage: stratix openapi generate [options]

Commands:
  openapi generate  Generate an OpenAPI 3.1 document from Stratix route schemas
  openapi client    Generate a TypeScript client from an OpenAPI document

Options:
  --input <file>      OpenAPI JSON input for client generation
  --title <title>      OpenAPI info.title, defaults to package name
  --version <version>  OpenAPI info.version, defaults to package version or 1.0.0
  --output <file>      Write JSON document to file instead of stdout
  --strict             Fail on missing schema, response schema, or operationId
  --help               Show this help message`);
}

function stringArg(value: unknown): string | undefined {
  if (Array.isArray(value)) {
    return value.at(-1) === undefined ? undefined : String(value.at(-1));
  }
  return value === undefined ? undefined : String(value);
}

function packageDefaults(rootDir: string): { title: string; version: string } {
  try {
    const packageJson = readJsonFile<Record<string, unknown>>(
      path.join(rootDir, 'package.json')
    );
    return {
      title:
        typeof packageJson.name === 'string' && packageJson.name.trim()
          ? packageJson.name
          : 'Stratix API',
      version:
        typeof packageJson.version === 'string' && packageJson.version.trim()
          ? packageJson.version
          : '1.0.0'
    };
  } catch {
    return {
      title: 'Stratix API',
      version: '1.0.0'
    };
  }
}

export async function openApiCommand(
  argv: ParsedArgs,
  output: CliOutput
): Promise<void> {
  const subcommand = argv._[1];
  if (argv.help || subcommand === 'help') {
    printOpenApiUsage(output);
    return;
  }

  if (subcommand === 'client') {
    const inputFile = stringArg(argv.input);
    const outputFile = stringArg(argv.output);
    if (!inputFile) {
      throw new CliError('openapi client requires --input <file>');
    }
    if (!outputFile) {
      throw new CliError('openapi client requires --output <file>');
    }

    const { rootDir } = loadProjectManifest(process.cwd());
    const document = readJsonFile<OpenApiDocument>(path.resolve(rootDir, inputFile));
    const source = generateTypedClient(document);
    const targetPath = path.resolve(rootDir, outputFile);
    writeTextFile(targetPath, source);
    output.success(`Typed client generated: ${targetPath}`);
    return;
  }

  if (subcommand !== 'generate') {
    throw new CliError(`Unknown openapi command: ${subcommand || ''}`.trim());
  }

  const { rootDir } = loadProjectManifest(process.cwd());
  const defaults = packageDefaults(rootDir);
  const title = stringArg(argv.title) || defaults.title;
  const version = stringArg(argv.version) || defaults.version;
  const contracts = analyzeSourceRoutes(rootDir);
  const diagnostics = validateSourceRouteContracts(contracts, {
    requireSchema: Boolean(argv.strict),
    requireResponseSchema: Boolean(argv.strict),
    requireOperationId: Boolean(argv.strict)
  });

  if (diagnostics.length > 0) {
    for (const diagnostic of diagnostics) {
      output.error(diagnostic.message);
    }
    throw new CliError(diagnostics[0].message);
  }

  const document = generateSourceOpenApiDocument(contracts, { title, version });
  const outputFile = stringArg(argv.output);

  if (outputFile) {
    const targetPath = path.resolve(rootDir, outputFile);
    writeJsonFile(targetPath, document);
    output.success(`OpenAPI document generated: ${targetPath}`);
    return;
  }

  output.log(JSON.stringify(document, null, 2));
}
