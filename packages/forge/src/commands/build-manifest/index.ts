import { createHash } from 'node:crypto';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import type { ParsedArgs } from '../../core/args.js';
import { CliError } from '../../core/errors.js';
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

interface ManifestArtifactFile {
  sourceFile: string;
  sourceHash: string;
  compiledFile?: string;
  compiledHash?: string;
  size: number;
}

const require = createRequire(import.meta.url);

function printBuildManifestUsage(output: CliOutput): void {
  output.log(`Usage: stratix build-manifest [options]

Options:
  --output <file>          Write production manifest to file, defaults to .stratix/production-manifest.json
  --schema-version <1|2>   Production manifest schema version, defaults to 2
  --compiled-root <dir>    Compiled output root for v2 artifact mapping, defaults to dist
  --help                   Show this help message`);
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

function numericArg(value: unknown): number | undefined {
  const raw = stringArg(value);
  return raw === undefined ? undefined : Number(raw);
}

function forgeVersion(): string {
  try {
    const packageJson = require('../../../package.json') as { version?: string };
    return packageJson.version || 'unknown';
  } catch {
    return 'unknown';
  }
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

function sha256File(filePath: string): string {
  return `sha256-${createHash('sha256')
    .update(fs.readFileSync(filePath))
    .digest('hex')}`;
}

function compiledFileForSource(sourceFile: string, compiledRoot: string): string {
  const normalizedSource = sourceFile.replace(/\\/g, '/');
  const withoutSourceRoot = normalizedSource.startsWith('src/')
    ? normalizedSource.slice('src/'.length)
    : normalizedSource;
  return path
    .join(
      compiledRoot,
      withoutSourceRoot.replace(/\.(tsx|ts|mts|cts)$/, '.js')
    )
    .replace(/\\/g, '/');
}

function buildArtifacts(
  rootDir: string,
  sourceFiles: string[],
  compiledRoot: string
): ManifestArtifactFile[] {
  return Array.from(new Set(sourceFiles))
    .sort()
    .flatMap((sourceFile) => {
      const sourcePath = path.join(rootDir, sourceFile);
      if (!fs.existsSync(sourcePath)) {
        return [];
      }

      const artifact: ManifestArtifactFile = {
        sourceFile,
        sourceHash: sha256File(sourcePath),
        size: fs.statSync(sourcePath).size
      };
      const compiledFile = compiledFileForSource(sourceFile, compiledRoot);
      const compiledPath = path.join(rootDir, compiledFile);
      if (fs.existsSync(compiledPath)) {
        artifact.compiledFile = compiledFile;
        artifact.compiledHash = sha256File(compiledPath);
      }

      return [artifact];
    });
}

function tokenKind(sourceFile: string): string {
  const normalized = sourceFile.replace(/\\/g, '/');
  if (normalized.includes('/controllers/')) return 'controller';
  if (normalized.includes('/services/')) return 'service';
  if (normalized.includes('/repositories/')) return 'repository';
  return 'component';
}

function camelCaseName(name: string): string {
  return name.charAt(0).toLowerCase() + name.slice(1);
}

function buildRegistrationPlan(options: {
  projectName?: string;
  routes: Array<{
    method: string;
    path: string;
    openApiPath: string;
    operationId: string;
    controllerName: string;
    handlerName: string;
    sourceFile: string;
  }>;
  di: ReturnType<typeof analyzeSourceDI>;
  artifacts: ManifestArtifactFile[];
}) {
  const artifactsBySource = new Map(
    options.artifacts.map((artifact) => [artifact.sourceFile, artifact])
  );

  return {
    id: `production-manifest:${options.projectName || 'app'}`,
    source: 'production-manifest',
    owner: {
      type: 'manifest',
      name: options.projectName || 'app'
    },
    tokens: options.di.nodes.map((node) => {
      const artifact = artifactsBySource.get(node.sourceFile);
      return {
        token: node.token,
        kind: tokenKind(node.sourceFile),
        registrationType: 'class',
        scope: 'root',
        visibility: 'public',
        lifetime: 'SINGLETON',
        injectionMode: 'CLASSIC',
        dependencies: node.dependencies,
        source: node.sourceFile,
        metadata: {
          className: node.className,
          sourceFile: node.sourceFile,
          ...(artifact?.compiledFile
            ? { compiledFile: artifact.compiledFile }
            : {})
        }
      };
    }),
    routes: options.routes.map((route) => {
      const artifact = artifactsBySource.get(route.sourceFile);
      return {
        method: route.method,
        path: route.path,
        controllerName: route.controllerName,
        handlerName: route.handlerName,
        token: camelCaseName(route.controllerName),
        scope: 'root',
        source: route.sourceFile,
        metadata: {
          operationId: route.operationId,
          openApiPath: route.openApiPath,
          sourceFile: route.sourceFile,
          ...(artifact?.compiledFile
            ? { compiledFile: artifact.compiledFile }
            : {})
        }
      };
    }),
    adapters: [],
    lifecycle: [],
    diagnostics: options.di.issues.map((issue) => ({
      code: issue.code,
      severity: 'error',
      message: issue.message,
      token: issue.token,
      metadata: {
        dependency: issue.dependency,
        sourceFile: issue.sourceFile,
        cycle: issue.cycle
      }
    })),
    metadata: {
      schemaVersion: 1
    }
  };
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
  const schemaVersion = numericArg(argv['schema-version']) || 2;
  if (schemaVersion !== 1 && schemaVersion !== 2) {
    throw new CliError(
      `Unsupported production manifest schema version: ${schemaVersion}`
    );
  }
  const compiledRoot = stringArg(argv['compiled-root']) || 'dist';
  const productionManifest = {
    schemaVersion,
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
  if (schemaVersion === 2) {
    const sourceFiles = [
      ...routes.map((route) => route.sourceFile),
      ...di.nodes.map((node) => node.sourceFile)
    ];
    const artifacts = buildArtifacts(rootDir, sourceFiles, compiledRoot);
    const registrationPlan = buildRegistrationPlan({
      projectName: path.basename(rootDir),
      routes,
      di,
      artifacts
    });
    Object.assign(productionManifest, {
      generator: {
        name: '@stratix/forge',
        version: forgeVersion(),
        command: 'build-manifest'
      },
      runtime: {
        packageName: '@stratix/core',
        compatibleVersions: ['1.1.x'],
        node: '>=24.0.0'
      },
      registrationPlan,
      plans: {
        app: registrationPlan,
        plugins: []
      },
      artifacts: {
        algorithm: 'sha256',
        files: artifacts
      }
    });
  }
  const outputFile =
    stringArg(argv.output) || path.join('.stratix', 'production-manifest.json');
  const targetPath = path.resolve(rootDir, outputFile);

  writeJsonFile(targetPath, productionManifest);
  output.success(`Production manifest generated: ${targetPath}`);
}
