import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { isAbsolute, resolve } from 'node:path';
import { z } from 'zod';
import { ConfigurationError } from '../errors/index.js';
import type { RegistrationPlan } from '../registration/registration-plan.js';

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
  compiledFile?: string;
}

export interface ProductionManifestDIToken {
  token: string;
  className?: string;
  dependencies?: string[];
  sourceFile?: string;
  compiledFile?: string;
}

export interface ProductionManifestPluginLock {
  name: string;
  version: string;
  preset: string;
}

export interface ProductionManifestProject {
  kind: string;
  type: string;
  runtime: string;
  presets: string[];
}

export interface ProductionManifestDiscovery {
  rootDir?: string;
  patterns?: string[];
  routing?: {
    enabled?: boolean;
  };
}

export interface ProductionManifestV1 {
  schemaVersion: 1;
  generatedAt?: string;
  project: ProductionManifestProject;
  discovery: ProductionManifestDiscovery;
  routes: ProductionManifestRoute[];
  di: {
    tokens: ProductionManifestDIToken[];
    issues: unknown[];
  };
  modules: unknown[];
  moduleIssues: unknown[];
  plugins: ProductionManifestPluginLock[];
}

export interface ProductionManifestGenerator {
  name: string;
  version?: string;
  command?: string;
}

export interface ProductionManifestRuntime {
  packageName: string;
  packageVersion?: string;
  compatibleVersions: string[];
  node?: string;
}

export interface ProductionManifestArtifactFile {
  sourceFile: string;
  sourceHash?: string;
  compiledFile?: string;
  compiledHash?: string;
  size?: number;
}

export interface ProductionManifestArtifacts {
  algorithm: 'sha256';
  files: ProductionManifestArtifactFile[];
}

export interface ProductionManifestV2 {
  schemaVersion: 2;
  generatedAt?: string;
  generator: ProductionManifestGenerator;
  runtime: ProductionManifestRuntime;
  project: ProductionManifestProject;
  discovery: ProductionManifestDiscovery;
  registrationPlan: RegistrationPlan;
  artifacts: ProductionManifestArtifacts;
  routes: ProductionManifestRoute[];
  di: {
    tokens: ProductionManifestDIToken[];
    issues: unknown[];
  };
  modules: unknown[];
  moduleIssues: unknown[];
  plugins: ProductionManifestPluginLock[];
}

export type ProductionManifest = ProductionManifestV1 | ProductionManifestV2;

export type LoadedProductionManifest = ProductionManifest & {
  sourceFile: string;
};

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
    sourceFile: z.string().optional(),
    compiledFile: z.string().optional()
  })
  .catchall(z.unknown());

const ProductionManifestDITokenSchema = z
  .object({
    token: z.string(),
    className: z.string().optional(),
    dependencies: z.array(z.string()).optional(),
    sourceFile: z.string().optional(),
    compiledFile: z.string().optional()
  })
  .catchall(z.unknown());

const ProductionManifestPluginLockSchema = z
  .object({
    name: z.string(),
    version: z.string(),
    preset: z.string()
  })
  .catchall(z.unknown());

const ProductionManifestProjectSchema = z
  .object({
    kind: z.string(),
    type: z.string(),
    runtime: z.string(),
    presets: z.array(z.string())
  })
  .catchall(z.unknown());

const ProductionManifestDiscoverySchema = z
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
  .catchall(z.unknown());

const ProductionManifestV1Schema = z
  .object({
    schemaVersion: z.literal(1),
    generatedAt: z.string().optional(),
    project: ProductionManifestProjectSchema,
    discovery: ProductionManifestDiscoverySchema,
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

const RegistrationPlanTokenSchema = z
  .object({
    token: z.string(),
    kind: z.string(),
    registrationType: z.string(),
    scope: z.string(),
    visibility: z.string(),
    lifetime: z.string().optional(),
    injectionMode: z.string().optional(),
    dependencies: z.array(z.string()).optional(),
    source: z.string().optional(),
    metadata: z.record(z.string(), z.unknown()).optional()
  })
  .catchall(z.unknown());

const RegistrationPlanRouteSchema = z
  .object({
    method: z.string(),
    path: z.string(),
    controllerName: z.string(),
    handlerName: z.string(),
    token: z.string().optional(),
    scope: z.string(),
    prefix: z.string().optional(),
    source: z.string().optional(),
    metadata: z.record(z.string(), z.unknown()).optional()
  })
  .catchall(z.unknown());

const RegistrationPlanSchema = z
  .object({
    id: z.string(),
    source: z.literal('production-manifest'),
    owner: z
      .object({
        type: z.literal('manifest'),
        name: z.string().optional()
      })
      .catchall(z.unknown()),
    tokens: z.array(RegistrationPlanTokenSchema),
    routes: z.array(RegistrationPlanRouteSchema),
    adapters: z.array(z.record(z.string(), z.unknown())),
    lifecycle: z.array(z.record(z.string(), z.unknown())),
    diagnostics: z.array(
      z
        .object({
          code: z.string(),
          severity: z.enum(['error', 'warning']),
          message: z.string()
        })
        .catchall(z.unknown())
    ),
    metadata: z.record(z.string(), z.unknown()).optional()
  })
  .catchall(z.unknown());

const ProductionManifestArtifactFileSchema = z
  .object({
    sourceFile: z.string(),
    sourceHash: z.string().optional(),
    compiledFile: z.string().optional(),
    compiledHash: z.string().optional(),
    size: z.number().optional()
  })
  .catchall(z.unknown());

const ProductionManifestV2Schema = z
  .object({
    schemaVersion: z.literal(2),
    generatedAt: z.string().optional(),
    generator: z
      .object({
        name: z.string(),
        version: z.string().optional(),
        command: z.string().optional()
      })
      .catchall(z.unknown()),
    runtime: z
      .object({
        packageName: z.string(),
        packageVersion: z.string().optional(),
        compatibleVersions: z.array(z.string()),
        node: z.string().optional()
      })
      .catchall(z.unknown()),
    project: ProductionManifestProjectSchema,
    discovery: ProductionManifestDiscoverySchema,
    registrationPlan: RegistrationPlanSchema,
    artifacts: z
      .object({
        algorithm: z.literal('sha256'),
        files: z.array(ProductionManifestArtifactFileSchema)
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

const ProductionManifestSchema = z.union([
  ProductionManifestV1Schema,
  ProductionManifestV2Schema
]);

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

  const manifest = parsed.data as ProductionManifest;
  assertManifestHasNoUnresolvedIssues(manifest, config, sourceFile);
  assertProductionManifestV2Integrity(manifest, config, sourceFile, rootDir);

  return {
    ...manifest,
    sourceFile
  };
}

export function collectProductionManifestSourceFiles(
  manifest: ProductionManifest
): string[] {
  if (manifest.schemaVersion === 2) {
    return createProductionManifestRegistrationPlan(manifest).sourceFiles;
  }

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

  if (manifest.schemaVersion === 2) {
    for (const token of manifest.registrationPlan.tokens) {
      const sourceFile = productionManifestPlanTokenFile(token);
      if (!sourceFile) {
        issues.push({
          section: 'registrationPlan.tokens',
          message: `Registration plan token ${token.token} is missing sourceFile or compiledFile`,
          entry: token
        });
        continue;
      }

      sourceFiles.add(sourceFile);
      tokenEntries.push({
        token: token.token,
        className: productionManifestPlanClassName(token),
        sourceFile
      });
    }

    for (const route of manifest.registrationPlan.routes) {
      const sourceFile = productionManifestPlanRouteFile(route);
      if (!sourceFile) {
        issues.push({
          section: 'registrationPlan.routes',
          message: `Registration plan route ${route.method} ${route.path} is missing sourceFile or compiledFile`,
          entry: route
        });
        continue;
      }

      sourceFiles.add(sourceFile);
      routes.push({
        method: route.method,
        path: route.path,
        controllerName: route.controllerName,
        handlerName: route.handlerName,
        sourceFile
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

  for (const token of manifest.di.tokens) {
    const sourceFile = token.compiledFile || token.sourceFile;
    if (!sourceFile) {
      issues.push({
        section: 'di.tokens',
        message: `DI token ${token.token} is missing sourceFile`,
        entry: token
      });
      continue;
    }

    sourceFiles.add(sourceFile);
    tokenEntries.push({
      token: token.token,
      className: token.className,
      sourceFile
    });
  }

  for (const route of manifest.routes) {
    const sourceFile = route.compiledFile || route.sourceFile;
    if (!sourceFile) {
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

    sourceFiles.add(sourceFile);
    routes.push({
      method: route.method,
      path: route.path,
      controllerName: route.controllerName,
      handlerName: route.handlerName,
      sourceFile
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

function metadataString(
  metadata: Record<string, unknown> | undefined,
  key: string
): string | undefined {
  const value = metadata?.[key];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function productionManifestPlanTokenFile(
  token: RegistrationPlan['tokens'][number]
): string | undefined {
  return (
    metadataString(token.metadata, 'compiledFile') ||
    metadataString(token.metadata, 'sourceFile') ||
    token.source
  );
}

function productionManifestPlanRouteFile(
  route: RegistrationPlan['routes'][number]
): string | undefined {
  return (
    metadataString(route.metadata, 'compiledFile') ||
    metadataString(route.metadata, 'sourceFile') ||
    route.source
  );
}

function productionManifestPlanClassName(
  token: RegistrationPlan['tokens'][number]
): string | undefined {
  return metadataString(token.metadata, 'className');
}

function assertManifestHasNoUnresolvedIssues(
  manifest: ProductionManifest,
  config: ProductionManifestDiscoveryConfig,
  sourceFile: string
): void {
  if (config.strict === false) {
    return;
  }

  const registrationPlanErrors =
    manifest.schemaVersion === 2
      ? manifest.registrationPlan.diagnostics.filter(
          (diagnostic) => diagnostic.severity === 'error'
        )
      : [];
  const issueCount =
    manifest.di.issues.length +
    manifest.moduleIssues.length +
    registrationPlanErrors.length;
  if (issueCount === 0) {
    return;
  }

  throw new ConfigurationError(
    `Production manifest contains unresolved issues: ${sourceFile}`,
    {
      sourceFile,
      diIssues: manifest.di.issues,
      moduleIssues: manifest.moduleIssues,
      registrationPlanErrors
    }
  );
}

function assertProductionManifestV2Integrity(
  manifest: ProductionManifest,
  config: ProductionManifestDiscoveryConfig,
  sourceFile: string,
  rootDir: string
): void {
  if (config.strict === false || manifest.schemaVersion !== 2) {
    return;
  }

  if (manifest.runtime.packageName !== '@stratix/core') {
    throw new ConfigurationError(
      `Production manifest runtime is incompatible: ${sourceFile}`,
      {
        sourceFile,
        runtime: manifest.runtime
      }
    );
  }

  const issues: Array<{
    file: string;
    section: string;
    message: string;
  }> = [];

  for (const artifact of manifest.artifacts.files) {
    if (!artifact.sourceHash && !artifact.compiledHash) {
      issues.push({
        file: artifact.sourceFile,
        section: 'artifacts.files',
        message: 'Production manifest v2 artifact has no hash'
      });
    }

    if (artifact.sourceHash) {
      assertManifestFileHash({
        rootDir,
        filePath: artifact.sourceFile,
        expectedHash: artifact.sourceHash,
        section: 'source',
        issues
      });
    }

    if (artifact.compiledHash) {
      if (!artifact.compiledFile) {
        issues.push({
          file: artifact.sourceFile,
          section: 'artifacts.files',
          message: 'Production manifest v2 compiledHash requires compiledFile'
        });
      } else {
        assertManifestFileHash({
          rootDir,
          filePath: artifact.compiledFile,
          expectedHash: artifact.compiledHash,
          section: 'compiled',
          issues
        });
      }
    }
  }

  if (issues.length > 0) {
    throw new ConfigurationError(
      `Production manifest artifact integrity failed: ${sourceFile}`,
      {
        sourceFile,
        issues
      }
    );
  }
}

function assertManifestFileHash(options: {
  rootDir: string;
  filePath: string;
  expectedHash: string;
  section: string;
  issues: Array<{ file: string; section: string; message: string }>;
}): void {
  const absolutePath = isAbsolute(options.filePath)
    ? options.filePath
    : resolve(options.rootDir, options.filePath);

  if (!fs.existsSync(absolutePath)) {
    options.issues.push({
      file: options.filePath,
      section: options.section,
      message: `Production manifest v2 ${options.section} file is missing`
    });
    return;
  }

  const actualHash = `sha256-${createHash('sha256')
    .update(fs.readFileSync(absolutePath))
    .digest('hex')}`;
  if (actualHash !== options.expectedHash) {
    options.issues.push({
      file: options.filePath,
      section: options.section,
      message: `Production manifest v2 ${options.section} hash mismatch`
    });
  }
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
