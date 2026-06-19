import fs from 'node:fs';
import { isAbsolute, resolve } from 'node:path';
import { z } from 'zod';
import { ConfigurationError } from '../errors/index.js';

export interface ProductionManifestDiscoveryConfig {
  enabled?: boolean;
  path?: string;
  skipRuntimeDiscovery?: boolean;
  registerFromManifest?: boolean;
  strict?: boolean;
}

export interface ProductionManifestRoute {
  method: string;
  path: string;
  openApiPath?: string;
  operationId?: string;
  controllerName?: string;
  handlerName?: string;
  sourceFile?: string;
}

export interface ProductionManifestDIToken {
  token: string;
  className?: string;
  dependencies?: string[];
  sourceFile?: string;
}

export interface ProductionManifestPluginLock {
  name: string;
  version: string;
  preset: string;
}

export interface ProductionManifest {
  schemaVersion: 1;
  generatedAt?: string;
  project: {
    kind: string;
    type: string;
    runtime: string;
    presets: string[];
  };
  discovery: {
    rootDir?: string;
    patterns?: string[];
    routing?: {
      enabled?: boolean;
    };
  };
  routes: ProductionManifestRoute[];
  di: {
    tokens: ProductionManifestDIToken[];
    issues: unknown[];
  };
  modules: unknown[];
  moduleIssues: unknown[];
  plugins: ProductionManifestPluginLock[];
}

export interface LoadedProductionManifest extends ProductionManifest {
  sourceFile: string;
}

export interface ProductionManifestRegistrationPlan {
  sourceFiles: string[];
  tokens: string[];
  tokenEntries: Array<{
    token: string;
    className?: string;
    sourceFile: string;
  }>;
  routes: Array<{
    method: string;
    path: string;
    controllerName: string;
    handlerName?: string;
    sourceFile: string;
  }>;
  issues: Array<{
    section: string;
    message: string;
    entry: unknown;
  }>;
}

const DEFAULT_PRODUCTION_MANIFEST_PATH = '.stratix/production-manifest.json';

const ProductionManifestRouteSchema = z
  .object({
    method: z.string(),
    path: z.string(),
    openApiPath: z.string().optional(),
    operationId: z.string().optional(),
    controllerName: z.string().optional(),
    handlerName: z.string().optional(),
    sourceFile: z.string().optional()
  })
  .catchall(z.unknown());

const ProductionManifestDITokenSchema = z
  .object({
    token: z.string(),
    className: z.string().optional(),
    dependencies: z.array(z.string()).optional(),
    sourceFile: z.string().optional()
  })
  .catchall(z.unknown());

const ProductionManifestPluginLockSchema = z
  .object({
    name: z.string(),
    version: z.string(),
    preset: z.string()
  })
  .catchall(z.unknown());

const ProductionManifestSchema = z
  .object({
    schemaVersion: z.literal(1),
    generatedAt: z.string().optional(),
    project: z
      .object({
        kind: z.string(),
        type: z.string(),
        runtime: z.string(),
        presets: z.array(z.string())
      })
      .catchall(z.unknown()),
    discovery: z
      .object({
        rootDir: z.string().optional(),
        patterns: z.array(z.string()).optional(),
        routing: z
          .object({
            enabled: z.boolean().optional()
          })
          .catchall(z.unknown())
          .optional()
      })
      .catchall(z.unknown()),
    routes: z.array(ProductionManifestRouteSchema),
    di: z
      .object({
        tokens: z.array(ProductionManifestDITokenSchema),
        issues: z.array(z.unknown())
      })
      .catchall(z.unknown()),
    modules: z.array(z.unknown()),
    moduleIssues: z.array(z.unknown()),
    plugins: z.array(ProductionManifestPluginLockSchema)
  })
  .catchall(z.unknown());

export function resolveProductionManifestPath(
  rootDir: string,
  config: ProductionManifestDiscoveryConfig
): string {
  const manifestPath = config.path || DEFAULT_PRODUCTION_MANIFEST_PATH;
  return isAbsolute(manifestPath)
    ? manifestPath
    : resolve(rootDir, manifestPath);
}

export function loadProductionManifest(
  rootDir: string,
  config?: ProductionManifestDiscoveryConfig
): LoadedProductionManifest | undefined {
  if (config?.enabled !== true) {
    return undefined;
  }

  const sourceFile = resolveProductionManifestPath(rootDir, config);
  if (!fs.existsSync(sourceFile)) {
    return handleInvalidManifest(
      config,
      sourceFile,
      `Production manifest not found: ${sourceFile}`
    );
  }

  let raw: unknown;
  try {
    raw = JSON.parse(fs.readFileSync(sourceFile, 'utf8'));
  } catch (error) {
    return handleInvalidManifest(
      config,
      sourceFile,
      `Production manifest is not valid JSON: ${sourceFile}`,
      error
    );
  }

  const parsed = ProductionManifestSchema.safeParse(raw);
  if (!parsed.success) {
    return handleInvalidManifest(
      config,
      sourceFile,
      `Invalid production manifest: ${sourceFile}`,
      parsed.error.issues
    );
  }

  assertManifestHasNoUnresolvedIssues(parsed.data, config, sourceFile);

  return {
    ...parsed.data,
    sourceFile
  };
}

export function collectProductionManifestSourceFiles(
  manifest: ProductionManifest
): string[] {
  const files = new Set<string>();

  for (const route of manifest.routes) {
    if (route.sourceFile) {
      files.add(route.sourceFile);
    }
  }

  for (const token of manifest.di.tokens) {
    if (token.sourceFile) {
      files.add(token.sourceFile);
    }
  }

  return [...files];
}

export function createProductionManifestRegistrationPlan(
  manifest: ProductionManifest
): ProductionManifestRegistrationPlan {
  const sourceFiles = new Set<string>();
  const tokenEntries: ProductionManifestRegistrationPlan['tokenEntries'] = [];
  const routes: ProductionManifestRegistrationPlan['routes'] = [];
  const issues: ProductionManifestRegistrationPlan['issues'] = [];

  for (const token of manifest.di.tokens) {
    if (!token.sourceFile) {
      issues.push({
        section: 'di.tokens',
        message: `DI token ${token.token} is missing sourceFile`,
        entry: token
      });
      continue;
    }

    sourceFiles.add(token.sourceFile);
    tokenEntries.push({
      token: token.token,
      className: token.className,
      sourceFile: token.sourceFile
    });
  }

  for (const route of manifest.routes) {
    if (!route.sourceFile) {
      issues.push({
        section: 'routes',
        message: `Route ${route.method} ${route.path} is missing sourceFile`,
        entry: route
      });
      continue;
    }
    if (!route.controllerName) {
      issues.push({
        section: 'routes',
        message: `Route ${route.method} ${route.path} is missing controllerName`,
        entry: route
      });
      continue;
    }

    sourceFiles.add(route.sourceFile);
    routes.push({
      method: route.method,
      path: route.path,
      controllerName: route.controllerName,
      handlerName: route.handlerName,
      sourceFile: route.sourceFile
    });
  }

  return {
    sourceFiles: [...sourceFiles],
    tokens: tokenEntries.map((token) => token.token),
    tokenEntries,
    routes,
    issues
  };
}

function assertManifestHasNoUnresolvedIssues(
  manifest: ProductionManifest,
  config: ProductionManifestDiscoveryConfig,
  sourceFile: string
): void {
  if (config.strict === false) {
    return;
  }

  const issueCount = manifest.di.issues.length + manifest.moduleIssues.length;
  if (issueCount === 0) {
    return;
  }

  throw new ConfigurationError(
    `Production manifest contains unresolved issues: ${sourceFile}`,
    {
      sourceFile,
      diIssues: manifest.di.issues,
      moduleIssues: manifest.moduleIssues
    }
  );
}

function handleInvalidManifest(
  config: ProductionManifestDiscoveryConfig,
  sourceFile: string,
  message: string,
  cause?: unknown
): undefined {
  if (config.strict === false) {
    return undefined;
  }

  throw new ConfigurationError(message, { sourceFile, cause });
}
