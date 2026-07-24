import fs from 'node:fs';
import path from 'node:path';
import { toCamelCase } from '../utils/case.js';
import { fileExists, readJsonFile } from '../utils/fs.js';

export interface PluginManifest {
  schemaVersion: 1;
  name: string;
  version: string;
  capabilities: string[];
  provides: string[];
  requires: string[];
  health: boolean;
  sourceFile: string;
}

export interface PluginGraphNode extends Omit<
  PluginManifest,
  'capabilities' | 'provides' | 'requires'
> {
  capabilities: Array<{ capability: string }>;
  provides: Array<{ token: string }>;
  requires: Array<{ dependency: string }>;
}

export interface PluginIssue {
  code:
    | 'PLUGIN_MANIFEST_MISSING'
    | 'PLUGIN_SCHEMA'
    | 'PLUGIN_DEPENDENCY_MISSING'
    | 'PLUGIN_DUPLICATE_PROVIDE'
    | 'PLUGIN_PROVIDE_NOT_BACKED_BY_ADAPTER'
    | 'PLUGIN_ADAPTER_NOT_DECLARED';
  pluginName?: string;
  sourceFile?: string;
  message: string;
}

export interface PluginAnalysis {
  plugins: PluginGraphNode[];
  issues: PluginIssue[];
}

const PLUGIN_MANIFEST_PATH = path.join('.stratix', 'plugin.json');
const ADAPTER_FILE_EXTENSIONS = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.mjs',
  '.cjs',
  '.mts',
  '.cts'
]);
const PLUGIN_INDEX_EXTENSIONS = [
  '.ts',
  '.tsx',
  '.js',
  '.mjs',
  '.cjs',
  '.mts',
  '.cts'
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  return value.filter((entry): entry is string => typeof entry === 'string');
}

function packageBaseName(packageName: string): string {
  return packageName.replace(/^@[^/]+\//, '');
}

function pluginFunctionNameFromIndex(rootDir: string): string | undefined {
  const indexPath = PLUGIN_INDEX_EXTENSIONS.map((extension) =>
    path.join(rootDir, 'src', `index${extension}`)
  ).find((candidate) => fileExists(candidate));

  if (!indexPath) {
    return undefined;
  }
  const source = fs.readFileSync(indexPath, 'utf8');
  const match = source.match(
    /withRegisterAutoDI(?:<[^>]+>)?\(\s*([A-Za-z_$][\w$]*)/
  );
  return match?.[1];
}

function capitalizeIdentifier(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function buildAdapterToken(pluginName: string, adapterName: string): string {
  if (adapterName === pluginName) {
    return adapterName;
  }

  if (adapterName.startsWith(pluginName)) {
    const nextCharacter = adapterName.charAt(pluginName.length);
    if (nextCharacter !== '' && nextCharacter === nextCharacter.toUpperCase()) {
      return adapterName;
    }
  }

  return `${pluginName}${capitalizeIdentifier(adapterName)}`;
}

function manifestPath(rootDir: string): string {
  return path.join(rootDir, PLUGIN_MANIFEST_PATH);
}

function dependencyVersions(rootDir: string): Record<string, string> {
  const packageJsonPath = path.join(rootDir, 'package.json');
  if (!fileExists(packageJsonPath)) {
    return {};
  }

  const packageJson = readJsonFile<Record<string, any>>(packageJsonPath);
  return {
    ...(packageJson.dependencies || {}),
    ...(packageJson.devDependencies || {}),
    ...(packageJson.peerDependencies || {})
  };
}

function parsePluginManifest(
  rootDir: string,
  issues: PluginIssue[]
): PluginManifest | null {
  const sourcePath = manifestPath(rootDir);
  const sourceFile = PLUGIN_MANIFEST_PATH.split(path.sep).join('/');

  if (!fileExists(sourcePath)) {
    issues.push({
      code: 'PLUGIN_MANIFEST_MISSING',
      sourceFile,
      message: `Plugin manifest not found: ${sourceFile}`
    });
    return null;
  }

  const raw = readJsonFile<unknown>(sourcePath);
  if (!isRecord(raw)) {
    issues.push({
      code: 'PLUGIN_SCHEMA',
      sourceFile,
      message: `Invalid plugin manifest: ${sourceFile}`
    });
    return null;
  }

  const capabilities = stringArray(raw.capabilities);
  const provides = stringArray(raw.provides);
  const requires = stringArray(raw.requires);
  const name = typeof raw.name === 'string' ? raw.name : '';
  const version = typeof raw.version === 'string' ? raw.version : '';

  if (raw.schemaVersion !== 1) {
    issues.push({
      code: 'PLUGIN_SCHEMA',
      sourceFile,
      message: `Plugin manifest has unsupported schemaVersion: ${sourceFile}`
    });
  }

  if (!name) {
    issues.push({
      code: 'PLUGIN_SCHEMA',
      sourceFile,
      message: 'Plugin manifest is missing required field: name'
    });
  }

  if (!version) {
    issues.push({
      code: 'PLUGIN_SCHEMA',
      pluginName: name,
      sourceFile,
      message: 'Plugin manifest is missing required field: version'
    });
  }

  if (!capabilities || capabilities.length === 0) {
    issues.push({
      code: 'PLUGIN_SCHEMA',
      pluginName: name,
      sourceFile,
      message: 'Plugin manifest is missing required field: capabilities'
    });
  }

  if (!provides) {
    issues.push({
      code: 'PLUGIN_SCHEMA',
      pluginName: name,
      sourceFile,
      message: 'Plugin manifest is missing required field: provides'
    });
  }

  if (!requires) {
    issues.push({
      code: 'PLUGIN_SCHEMA',
      pluginName: name,
      sourceFile,
      message: 'Plugin manifest is missing required field: requires'
    });
  }

  if (typeof raw.health !== 'boolean') {
    issues.push({
      code: 'PLUGIN_SCHEMA',
      pluginName: name,
      sourceFile,
      message: 'Plugin manifest is missing required field: health'
    });
  }

  return {
    schemaVersion: 1,
    name,
    version,
    capabilities: capabilities || [],
    provides: provides || [],
    requires: requires || [],
    health: raw.health === true,
    sourceFile
  };
}

function adapterFiles(rootDir: string): string[] {
  const adaptersDir = path.join(rootDir, 'src', 'adapters');
  if (!fs.existsSync(adaptersDir)) {
    return [];
  }

  const files: string[] = [];
  const visit = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const absolutePath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        visit(absolutePath);
        continue;
      }

      if (ADAPTER_FILE_EXTENSIONS.has(path.extname(entry.name))) {
        files.push(absolutePath);
      }
    }
  };

  visit(adaptersDir);
  return files.sort();
}

function lowerFirst(value: string): string {
  return value.charAt(0).toLowerCase() + value.slice(1);
}

function adapterNameFromClassName(className: string): string | undefined {
  const withoutSuffix = className.replace(/Adapter$/, '');
  return withoutSuffix ? lowerFirst(withoutSuffix) : undefined;
}

function adapterNameFromFileName(filePath: string): string | undefined {
  const fileName = path.basename(filePath, path.extname(filePath));
  const withoutSuffix = fileName
    .replace(/[-_]?adapter$/i, '')
    .replace(/[-_]?api$/i, '');
  const adapterName = withoutSuffix.replace(/[-_]([a-z])/g, (_, letter) =>
    String(letter).toUpperCase()
  );
  return adapterName ? lowerFirst(adapterName) : undefined;
}

function staticAdapterName(source: string): string | undefined {
  const match =
    source.match(/static\s+adapterName\s*=\s*['"]([^'"]+)['"]/) ||
    source.match(/adapterName\s*:\s*['"]([^'"]+)['"]/);
  return match?.[1];
}

function classAdapterName(source: string): string | undefined {
  const match = source.match(/class\s+([A-Za-z_$][\w$]*)/);
  return match?.[1] ? adapterNameFromClassName(match[1]) : undefined;
}

function discoveredAdapterTokens(
  rootDir: string,
  pluginName: string
): string[] {
  const tokens = new Set<string>();

  for (const filePath of adapterFiles(rootDir)) {
    const source = fs.readFileSync(filePath, 'utf8');
    const adapterName =
      staticAdapterName(source) ||
      classAdapterName(source) ||
      adapterNameFromFileName(filePath);
    if (adapterName) {
      tokens.add(buildAdapterToken(pluginName, adapterName));
    }
  }

  return [...tokens].sort();
}

export function analyzeProjectPlugins(rootDir: string): PluginAnalysis {
  const issues: PluginIssue[] = [];
  const manifest = parsePluginManifest(rootDir, issues);
  if (!manifest) {
    return {
      plugins: [],
      issues
    };
  }

  const dependencies = dependencyVersions(rootDir);
  for (const dependency of manifest.requires) {
    if (!dependencies[dependency]) {
      issues.push({
        code: 'PLUGIN_DEPENDENCY_MISSING',
        pluginName: manifest.name,
        sourceFile: manifest.sourceFile,
        message: `Plugin dependency is not installed: ${dependency}`
      });
    }
  }

  const providedTokens = new Set<string>();
  for (const token of manifest.provides) {
    if (providedTokens.has(token)) {
      issues.push({
        code: 'PLUGIN_DUPLICATE_PROVIDE',
        pluginName: manifest.name,
        sourceFile: manifest.sourceFile,
        message: `Plugin manifest provides duplicate token: ${token}`
      });
    }
    providedTokens.add(token);
  }

  const pluginName = pluginFunctionNameFromIndex(rootDir);
  if (pluginName) {
    const adapterTokens = discoveredAdapterTokens(rootDir, pluginName);
    if (adapterTokens.length > 0) {
      const adapterTokenSet = new Set(adapterTokens);
      for (const token of manifest.provides) {
        if (!adapterTokenSet.has(token)) {
          issues.push({
            code: 'PLUGIN_PROVIDE_NOT_BACKED_BY_ADAPTER',
            pluginName: manifest.name,
            sourceFile: manifest.sourceFile,
            message: `Plugin manifest provides token is not backed by a discovered adapter: ${token}. Discovered adapter tokens: ${adapterTokens.join(', ')}`
          });
        }
      }

      for (const token of adapterTokens) {
        if (!providedTokens.has(token)) {
          issues.push({
            code: 'PLUGIN_ADAPTER_NOT_DECLARED',
            pluginName: manifest.name,
            sourceFile: manifest.sourceFile,
            message: `Plugin adapter token is missing from manifest provides: ${token}. Discovered adapter tokens: ${adapterTokens.join(', ')}`
          });
        }
      }
    }
  }

  return {
    plugins: [
      {
        ...manifest,
        capabilities: manifest.capabilities.map((capability) => ({
          capability
        })),
        provides: manifest.provides.map((token) => ({ token })),
        requires: manifest.requires.map((dependency) => ({ dependency }))
      }
    ],
    issues
  };
}

function mermaidId(value: string): string {
  return (
    toCamelCase(packageBaseName(value)) || value.replace(/[^A-Za-z0-9_]/g, '_')
  );
}

export function renderPluginGraphMermaid(analysis: PluginAnalysis): string {
  const lines = ['flowchart TD'];

  for (const plugin of analysis.plugins) {
    const pluginId = mermaidId(plugin.name);
    lines.push(`  ${pluginId}["${plugin.name}"]`);

    for (const provide of plugin.provides) {
      const tokenId = mermaidId(provide.token);
      lines.push(
        `  ${pluginId}["${plugin.name}"] --> ${tokenId}["${provide.token}"]`
      );
    }

    for (const capability of plugin.capabilities) {
      const capabilityId = `${pluginId}${toCamelCase(capability.capability)}Capability`;
      lines.push(
        `  ${pluginId}["${plugin.name}"] --> ${capabilityId}["capability:${capability.capability}"]`
      );
    }

    for (const requirement of plugin.requires) {
      const dependencyId = mermaidId(requirement.dependency);
      lines.push(
        `  ${pluginId}["${plugin.name}"] -.requires.-> ${dependencyId}["${requirement.dependency}"]`
      );
    }
  }

  return lines.join('\n');
}
