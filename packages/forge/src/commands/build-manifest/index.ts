import path from 'node:path';
import type { ParsedArgs } from '../../core/args.js';
import type { CliOutput } from '../../core/output.js';
import { analyzeSourceDI } from '../doctor/di-source-analysis.js';
import { analyzeSourceRoutes } from '../openapi/source-route-analysis.js';
import { analyzeProjectModules } from '../../modules/module-analysis.js';
import { loadProjectManifest } from '../../project/load-project-manifest.js';
import { readJsonFile, writeJsonFile } from '../../utils/fs.js';

interface ProductionManifestPluginLock {
  name: string;
  version: string;
  preset: string;
}

function printBuildManifestUsage(output: CliOutput): void {
  output.log(`Usage: stratix build-manifest [options]

Options:
  --output <file>  Write production manifest to file, defaults to .stratix/production-manifest.json
  --help           Show this help message`);
}

function stringArg(value: unknown): string | undefined {
  if (Array.isArray(value)) {
    return value.at(-1) === undefined ? undefined : String(value.at(-1));
  }
  return value === undefined ? undefined : String(value);
}

function presetPackageName(preset: string): string | undefined {
  if (preset === 'admin-mock') {
    return undefined;
  }

  if (preset === 'testing') {
    return '@stratix/testing';
  }

  if (preset === 'was-v7') {
    return '@stratix/was-v7';
  }

  return `@stratix/${preset}`;
}

function packageDependencies(rootDir: string): Record<string, string> {
  const packageJson = readJsonFile<Record<string, any>>(
    path.join(rootDir, 'package.json')
  );

  return {
    ...(packageJson.dependencies || {}),
    ...(packageJson.devDependencies || {}),
    ...(packageJson.peerDependencies || {})
  };
}

function pluginLock(
  rootDir: string,
  presets: string[]
): ProductionManifestPluginLock[] {
  const dependencies = packageDependencies(rootDir);

  return presets
    .map((preset) => {
      const packageName = presetPackageName(preset);
      if (!packageName || !dependencies[packageName]) {
        return undefined;
      }

      return {
        name: packageName,
        version: dependencies[packageName],
        preset
      };
    })
    .filter((entry): entry is ProductionManifestPluginLock => Boolean(entry));
}

export async function buildManifestCommand(
  argv: ParsedArgs,
  output: CliOutput
): Promise<void> {
  if (argv.help || argv._[1] === 'help') {
    printBuildManifestUsage(output);
    return;
  }

  const { rootDir, manifest } = loadProjectManifest(process.cwd());
  const routes = analyzeSourceRoutes(rootDir).map((contract) => ({
    method: contract.method,
    path: contract.path,
    openApiPath: contract.openApiPath,
    operationId:
      contract.schema?.operationId ||
      `${contract.controllerName}_${contract.handlerName}`,
    controllerName: contract.controllerName,
    handlerName: contract.handlerName,
    sourceFile: contract.sourceFile
  }));
  const di = analyzeSourceDI(rootDir);
  const moduleAnalysis = analyzeProjectModules(rootDir);
  const productionManifest = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    project: {
      kind: manifest.kind,
      type: manifest.type,
      runtime: manifest.runtime,
      presets: manifest.presets
    },
    discovery: {
      rootDir: '.',
      patterns: ['src/**/*.ts'],
      routing: {
        enabled: true
      }
    },
    routes,
    di: {
      tokens: di.nodes,
      issues: di.issues
    },
    modules: moduleAnalysis.modules,
    moduleIssues: moduleAnalysis.issues,
    plugins: pluginLock(rootDir, manifest.presets)
  };
  const outputFile =
    stringArg(argv.output) || path.join('.stratix', 'production-manifest.json');
  const targetPath = path.resolve(rootDir, outputFile);

  writeJsonFile(targetPath, productionManifest);
  output.success(`Production manifest generated: ${targetPath}`);
}
