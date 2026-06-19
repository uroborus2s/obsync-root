import fs from 'node:fs';
import path from 'node:path';
import { toCamelCase } from '../utils/case.js';
import { fileExists } from '../utils/fs.js';
import {
  analyzeSourceDI,
  type SourceDINode
} from '../commands/doctor/di-source-analysis.js';

export interface ModuleManifest {
  name: string;
  title?: string;
  root: string;
  owner?: string;
  tags: string[];
  layers: Record<string, string>;
  contracts: {
    openapiTag?: string;
  };
  boundaries: {
    owns: string[];
    allows: {
      imports: string[];
    };
  };
  sourceFile: string;
}

export interface ModuleTokenNode extends SourceDINode {
  kind: 'controller' | 'service' | 'repository' | 'component' | 'unknown';
  routes: Array<{ method: string; path: string }>;
}

export interface ModuleGraphNode {
  name: string;
  title?: string;
  root: string;
  owner?: string;
  tags: string[];
  contracts: {
    openapiTag?: string;
  };
  tokens: ModuleTokenNode[];
  dependencies: string[];
}

export interface ModuleIssue {
  code:
    | 'MODULE_SCHEMA'
    | 'MODULE_ROOT_MISMATCH'
    | 'MODULE_LAYER_MISSING'
    | 'MODULE_DUPLICATE_NAME'
    | 'MODULE_OWNED_TOKEN_MISSING'
    | 'MODULE_BOUNDARY_VIOLATION'
    | 'MODULE_DEPENDENCY_CYCLE';
  moduleName?: string;
  sourceFile?: string;
  message: string;
}

export interface ModuleAnalysis {
  modules: ModuleGraphNode[];
  issues: ModuleIssue[];
}

const BUILT_IN_TOKENS = new Set([
  'config',
  'logger',
  'request',
  'reply',
  'requestId',
  'diScope'
]);

const ROUTE_DECORATOR_PATTERN =
  /@(Get|Post|Put|Patch|Delete|Head|Options)\(\s*['"`]([^'"`]+)['"`]/g;

function normalizePath(value: string): string {
  return value
    .split(/[\\/]+/)
    .filter(Boolean)
    .join('/');
}

function indentation(line: string): number {
  return line.match(/^ */)?.[0].length ?? 0;
}

function stripComment(line: string): string {
  const hashIndex = line.indexOf('#');
  return hashIndex === -1 ? line : line.slice(0, hashIndex);
}

function findSection(lines: string[], key: string, indent: number): string[] {
  const headerPattern = new RegExp(`^ {${indent}}${key}:\\s*$`);
  const startIndex = lines.findIndex((line) =>
    headerPattern.test(stripComment(line))
  );

  if (startIndex === -1) {
    return [];
  }

  const section: string[] = [];
  for (let index = startIndex + 1; index < lines.length; index += 1) {
    const line = lines[index];
    const trimmed = stripComment(line).trim();

    if (!trimmed) {
      continue;
    }

    if (indentation(line) <= indent) {
      break;
    }

    section.push(line);
  }

  return section;
}

function readScalar(lines: string[], key: string): string | undefined {
  const pattern = new RegExp(`^${key}:\\s*(.+?)\\s*$`);
  const line = lines.find((candidate) => pattern.test(stripComment(candidate)));
  const match = line ? stripComment(line).match(pattern) : null;
  return match?.[1]?.trim();
}

function readMap(lines: string[], sectionKey: string): Record<string, string> {
  const section = findSection(lines, sectionKey, 0);
  const values: Record<string, string> = {};

  for (const line of section) {
    const match = stripComment(line).match(/^  ([A-Za-z0-9_-]+):\s*(.+?)\s*$/);
    if (match) {
      values[match[1]] = match[2].trim();
    }
  }

  return values;
}

function readList(
  lines: string[],
  sectionKey: string,
  indent: number
): string[] {
  return findSection(lines, sectionKey, indent)
    .map(
      (line) =>
        stripComment(line).match(
          new RegExp(`^ {${indent + 2}}-\\s*(.+?)\\s*$`)
        )?.[1]
    )
    .filter((value): value is string => Boolean(value))
    .map((value) => value.trim());
}

function readNestedMap(
  lines: string[],
  sectionKey: string
): Record<string, string> {
  const section = findSection(lines, sectionKey, 0);
  const values: Record<string, string> = {};

  for (const line of section) {
    const match = stripComment(line).match(/^  ([A-Za-z0-9_-]+):\s*(.+?)\s*$/);
    if (match) {
      values[match[1]] = match[2].trim();
    }
  }

  return values;
}

function parseModuleManifest(
  filePath: string,
  rootDir: string
): ModuleManifest {
  const source = fs.readFileSync(filePath, 'utf8');
  const lines = source.split(/\r?\n/);
  const name = readScalar(lines, 'name') || '';
  const manifestRoot = readScalar(lines, 'root') || '';

  return {
    name,
    title: readScalar(lines, 'title'),
    root: normalizePath(manifestRoot),
    owner: readScalar(lines, 'owner'),
    tags: readList(lines, 'tags', 0),
    layers: readMap(lines, 'layers'),
    contracts: readNestedMap(lines, 'contracts'),
    boundaries: {
      owns: readList(lines, 'owns', 2),
      allows: {
        imports: readList(lines, 'imports', 4)
      }
    },
    sourceFile: normalizePath(path.relative(rootDir, filePath))
  };
}

function collectModuleManifestFiles(rootDir: string): string[] {
  const modulesRoot = path.join(rootDir, 'src', 'modules');
  if (!fileExists(modulesRoot)) {
    return [];
  }

  const files: string[] = [];

  function visit(currentDir: string): void {
    for (const entry of fs.readdirSync(currentDir, { withFileTypes: true })) {
      const nextPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        visit(nextPath);
        continue;
      }

      if (entry.isFile() && entry.name === 'module.yaml') {
        files.push(nextPath);
      }
    }
  }

  visit(modulesRoot);
  return files.sort();
}

function layerBasePath(pattern: string): string {
  const wildcardIndex = pattern.search(/[*{[]/);
  const prefix =
    wildcardIndex === -1 ? pattern : pattern.slice(0, wildcardIndex);
  return normalizePath(prefix.replace(/\/+$/, ''));
}

function validateManifestShape(
  manifest: ModuleManifest,
  rootDir: string,
  issues: ModuleIssue[]
): void {
  if (!manifest.name) {
    issues.push({
      code: 'MODULE_SCHEMA',
      sourceFile: manifest.sourceFile,
      message: `Module manifest is missing required field: name (${manifest.sourceFile})`
    });
  }

  if (!manifest.root) {
    issues.push({
      code: 'MODULE_SCHEMA',
      moduleName: manifest.name,
      sourceFile: manifest.sourceFile,
      message: `Module manifest is missing required field: root (${manifest.sourceFile})`
    });
  }

  const manifestDirectory = normalizePath(path.dirname(manifest.sourceFile));
  if (manifest.root && manifest.root !== manifestDirectory) {
    issues.push({
      code: 'MODULE_ROOT_MISMATCH',
      moduleName: manifest.name,
      sourceFile: manifest.sourceFile,
      message: `Module root mismatch: ${manifest.name} declares ${manifest.root}, expected ${manifestDirectory}`
    });
  }

  for (const layerName of ['controllers', 'services', 'repositories']) {
    const layerPattern = manifest.layers[layerName];
    if (!layerPattern) {
      issues.push({
        code: 'MODULE_SCHEMA',
        moduleName: manifest.name,
        sourceFile: manifest.sourceFile,
        message: `Module manifest is missing required layer: ${manifest.name}.${layerName}`
      });
      continue;
    }

    const basePath = layerBasePath(layerPattern);
    if (basePath && !fileExists(path.join(rootDir, manifest.root, basePath))) {
      issues.push({
        code: 'MODULE_LAYER_MISSING',
        moduleName: manifest.name,
        sourceFile: manifest.sourceFile,
        message: `Module layer path not found: ${manifest.name} ${layerName} -> ${path.posix.join(manifest.root, basePath)}`
      });
    }
  }
}

function tokenKind(sourceFile: string): ModuleTokenNode['kind'] {
  if (sourceFile.includes('/controllers/')) return 'controller';
  if (sourceFile.includes('/services/')) return 'service';
  if (sourceFile.includes('/repositories/')) return 'repository';
  if (sourceFile.includes('/components/')) return 'component';
  return 'unknown';
}

function extractRoutes(
  rootDir: string,
  sourceFile: string
): Array<{ method: string; path: string }> {
  const absoluteFile = path.join(rootDir, sourceFile);
  if (!fileExists(absoluteFile)) {
    return [];
  }

  const source = fs.readFileSync(absoluteFile, 'utf8');
  return Array.from(source.matchAll(ROUTE_DECORATOR_PATTERN)).map((match) => ({
    method: match[1].toUpperCase(),
    path: match[2]
  }));
}

function moduleContainsSource(
  manifest: ModuleManifest,
  sourceFile: string
): boolean {
  return normalizePath(sourceFile).startsWith(`${manifest.root}/`);
}

function findCycles(adjacency: Map<string, Set<string>>): string[][] {
  const cycles: string[][] = [];
  const visited = new Set<string>();
  const active = new Set<string>();

  function visit(name: string, stack: string[]): void {
    if (active.has(name)) {
      const startIndex = stack.indexOf(name);
      if (startIndex >= 0) {
        cycles.push([...stack.slice(startIndex), name]);
      }
      return;
    }

    if (visited.has(name)) {
      return;
    }

    visited.add(name);
    active.add(name);

    for (const dependency of adjacency.get(name) || []) {
      visit(dependency, [...stack, dependency]);
    }

    active.delete(name);
  }

  for (const name of adjacency.keys()) {
    visit(name, [name]);
  }

  return cycles;
}

export function analyzeProjectModules(rootDir: string): ModuleAnalysis {
  const issues: ModuleIssue[] = [];
  const manifests = collectModuleManifestFiles(rootDir).map((filePath) =>
    parseModuleManifest(filePath, rootDir)
  );
  const moduleNames = new Map<string, ModuleManifest[]>();

  for (const manifest of manifests) {
    validateManifestShape(manifest, rootDir, issues);
    const sameName = moduleNames.get(manifest.name) || [];
    sameName.push(manifest);
    moduleNames.set(manifest.name, sameName);
  }

  for (const [name, matches] of moduleNames.entries()) {
    if (name && matches.length > 1) {
      issues.push({
        code: 'MODULE_DUPLICATE_NAME',
        moduleName: name,
        sourceFile: matches.map((match) => match.sourceFile).join(', '),
        message: `Duplicate module name: ${name}`
      });
    }
  }

  const sourceDI = analyzeSourceDI(rootDir);
  const tokenOwner = new Map<string, string>();
  const modules: ModuleGraphNode[] = manifests.map((manifest) => {
    const tokens: ModuleTokenNode[] = sourceDI.nodes
      .filter((node) => moduleContainsSource(manifest, node.sourceFile))
      .map((node) => ({
        ...node,
        kind: tokenKind(node.sourceFile),
        routes: extractRoutes(rootDir, node.sourceFile)
      }));

    for (const token of tokens) {
      tokenOwner.set(token.token, manifest.name);
    }

    return {
      name: manifest.name,
      title: manifest.title,
      root: manifest.root,
      owner: manifest.owner,
      tags: manifest.tags,
      contracts: manifest.contracts,
      tokens,
      dependencies: []
    };
  });

  const moduleByName = new Map(modules.map((module) => [module.name, module]));
  const manifestsByName = new Map(
    manifests.map((manifest) => [manifest.name, manifest])
  );
  const dependencyGraph = new Map<string, Set<string>>();

  for (const module of modules) {
    dependencyGraph.set(module.name, new Set<string>());
  }

  for (const module of modules) {
    const manifest = manifestsByName.get(module.name);
    if (!manifest) {
      continue;
    }

    const tokenSet = new Set(module.tokens.map((token) => token.token));
    for (const ownedToken of manifest.boundaries.owns) {
      if (!tokenSet.has(ownedToken)) {
        issues.push({
          code: 'MODULE_OWNED_TOKEN_MISSING',
          moduleName: module.name,
          sourceFile: manifest.sourceFile,
          message: `Module boundary owns unknown token: ${module.name} -> ${ownedToken}`
        });
      }
    }

    for (const token of module.tokens) {
      for (const dependency of token.dependencies) {
        if (BUILT_IN_TOKENS.has(dependency)) {
          continue;
        }

        const dependencyOwner = tokenOwner.get(dependency);
        if (!dependencyOwner || dependencyOwner === module.name) {
          continue;
        }

        dependencyGraph.get(module.name)?.add(dependencyOwner);
        if (!manifest.boundaries.allows.imports.includes(dependencyOwner)) {
          issues.push({
            code: 'MODULE_BOUNDARY_VIOLATION',
            moduleName: module.name,
            sourceFile: token.sourceFile,
            message: `Module boundary violation: ${module.name} token ${token.token} depends on ${dependencyOwner}.${dependency}`
          });
        }
      }
    }
  }

  for (const module of modules) {
    module.dependencies = Array.from(
      dependencyGraph.get(module.name) || []
    ).sort();
  }

  for (const cycle of findCycles(dependencyGraph)) {
    issues.push({
      code: 'MODULE_DEPENDENCY_CYCLE',
      moduleName: cycle[0],
      message: `Module dependency cycle: ${cycle.join(' -> ')}`
    });
  }

  return {
    modules: modules.filter((module) => moduleByName.has(module.name)),
    issues
  };
}

function mermaidId(value: string): string {
  const camel = toCamelCase(value);
  return camel || value.replace(/[^A-Za-z0-9_]/g, '_');
}

export function renderModuleGraphMermaid(analysis: ModuleAnalysis): string {
  const lines = ['flowchart TD'];

  for (const module of analysis.modules) {
    const moduleId = mermaidId(module.name);
    lines.push(`  ${moduleId}["${module.name}"]`);

    for (const token of module.tokens) {
      const tokenId = mermaidId(token.token);
      lines.push(
        `  ${moduleId}["${module.name}"] --> ${tokenId}["${token.token}"]`
      );

      for (const dependency of token.dependencies) {
        if (BUILT_IN_TOKENS.has(dependency)) {
          continue;
        }
        lines.push(
          `  ${tokenId}["${token.token}"] --> ${mermaidId(dependency)}["${dependency}"]`
        );
      }

      token.routes.forEach((route, index) => {
        const routeId = `${tokenId}Route${index + 1}`;
        lines.push(
          `  ${tokenId}["${token.token}"] --> ${routeId}["${route.method} ${route.path}"]`
        );
      });
    }

    for (const dependency of module.dependencies) {
      lines.push(
        `  ${moduleId}["${module.name}"] -.imports.-> ${mermaidId(dependency)}["${dependency}"]`
      );
    }
  }

  return lines.join('\n');
}
