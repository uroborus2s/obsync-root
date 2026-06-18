import fs from 'node:fs';
import path from 'node:path';

export interface SourceDINode {
  token: string;
  dependencies: string[];
  sourceFile: string;
  className: string;
}

export interface SourceDIIssue {
  code: 'DI_DUPLICATE_TOKEN' | 'DI_MISSING_DEPENDENCY' | 'DI_CYCLE';
  token: string;
  dependency?: string;
  cycle?: string[];
  sourceFile?: string;
  message: string;
}

const DECORATED_CLASS_PATTERN =
  /@(Controller|Service|Repository|Component)(?:\(([\s\S]*?)\))?\s*(?:export\s+)?(?:default\s+)?class\s+([A-Za-z_$][A-Za-z0-9_$]*)/g;

const BUILT_IN_TOKENS = new Set([
  'config',
  'logger',
  'request',
  'reply',
  'requestId',
  'diScope'
]);

function collectTypeScriptFiles(rootDir: string): string[] {
  if (!fs.existsSync(rootDir)) {
    return [];
  }

  const files: string[] = [];
  for (const entry of fs.readdirSync(rootDir, { withFileTypes: true })) {
    const nextPath = path.join(rootDir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectTypeScriptFiles(nextPath));
    } else if (
      entry.isFile() &&
      nextPath.endsWith('.ts') &&
      !nextPath.endsWith('.d.ts') &&
      !nextPath.endsWith('.test.ts') &&
      !nextPath.endsWith('.spec.ts')
    ) {
      files.push(nextPath);
    }
  }

  return files;
}

function camelCaseName(name: string): string {
  return name.charAt(0).toLowerCase() + name.slice(1);
}

function cleanSource(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '');
}

function splitParameters(parameterList: string): string[] {
  const parameters: string[] = [];
  let current = '';
  let depth = 0;

  for (const char of parameterList) {
    if (char === ',' && depth === 0) {
      parameters.push(current);
      current = '';
      continue;
    }

    if (char === '(' || char === '{' || char === '[') {
      depth += 1;
    } else if (char === ')' || char === '}' || char === ']') {
      depth -= 1;
    }

    current += char;
  }

  if (current.trim()) {
    parameters.push(current);
  }

  return parameters;
}

function normalizeParameterName(parameter: string): string | null {
  const cleaned = parameter
    .trim()
    .replace(/^(public|private|protected|readonly|override)\s+/g, '')
    .replace(/^(public|private|protected|readonly|override)\s+/g, '')
    .replace(/^\.{3}/, '')
    .replace(/\?.*$/, '')
    .replace(/=.*/, '')
    .replace(/:.*/, '')
    .trim();

  if (!cleaned || cleaned.startsWith('{') || cleaned.startsWith('[')) {
    return null;
  }

  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(cleaned) ? cleaned : null;
}

function extractDependencies(classSource: string): string[] {
  const source = cleanSource(classSource);
  const constructorMatch = source.match(/constructor\s*\(([\s\S]*?)\)/m);
  if (!constructorMatch) {
    return [];
  }

  return splitParameters(constructorMatch[1])
    .map(normalizeParameterName)
    .filter((name): name is string => Boolean(name));
}

function extractExplicitName(optionsSource: string | undefined): string | null {
  if (!optionsSource) {
    return null;
  }

  const match = optionsSource.match(/\bname\s*:\s*['"]([^'"]+)['"]/);
  return match?.[1] || null;
}

function extractSourceDINodes(rootDir: string): SourceDINode[] {
  const nodes: SourceDINode[] = [];

  for (const filePath of collectTypeScriptFiles(path.join(rootDir, 'src'))) {
    const source = fs.readFileSync(filePath, 'utf8');
    const matches = Array.from(source.matchAll(DECORATED_CLASS_PATTERN));

    for (let index = 0; index < matches.length; index += 1) {
      const match = matches[index];
      const className = match[3];
      const classStart = match.index ?? 0;
      const classEnd = matches[index + 1]?.index ?? source.length;
      const classSource = source.slice(classStart, classEnd);
      const explicitName = extractExplicitName(match[2]);

      nodes.push({
        token: explicitName || camelCaseName(className),
        dependencies: extractDependencies(classSource),
        sourceFile: path.relative(rootDir, filePath),
        className
      });
    }
  }

  return nodes;
}

function findCycles(nodes: SourceDINode[]): string[][] {
  const adjacency = new Map<string, string[]>();
  for (const node of nodes) {
    if (!adjacency.has(node.token)) {
      adjacency.set(
        node.token,
        node.dependencies.filter((dependency) => !BUILT_IN_TOKENS.has(dependency))
      );
    }
  }

  const cycles: string[][] = [];
  const visited = new Set<string>();
  const active = new Set<string>();

  function visit(token: string, pathStack: string[]): void {
    if (active.has(token)) {
      const start = pathStack.indexOf(token);
      if (start >= 0) {
        const cycle = pathStack.slice(start);
        cycles.push(cycle[cycle.length - 1] === token ? cycle : [...cycle, token]);
      }
      return;
    }

    if (visited.has(token)) {
      return;
    }

    visited.add(token);
    active.add(token);

    for (const dependency of adjacency.get(token) || []) {
      if (adjacency.has(dependency)) {
        visit(dependency, [...pathStack, dependency]);
      }
    }

    active.delete(token);
  }

  for (const token of adjacency.keys()) {
    visit(token, [token]);
  }

  return cycles;
}

export function analyzeSourceDI(rootDir: string): {
  nodes: SourceDINode[];
  issues: SourceDIIssue[];
} {
  const nodes = extractSourceDINodes(rootDir);
  const issues: SourceDIIssue[] = [];
  const tokenCounts = new Map<string, SourceDINode[]>();

  for (const node of nodes) {
    const existing = tokenCounts.get(node.token) || [];
    existing.push(node);
    tokenCounts.set(node.token, existing);
  }

  const tokens = new Set(nodes.map((node) => node.token));

  for (const [token, matches] of tokenCounts.entries()) {
    if (matches.length > 1) {
      issues.push({
        code: 'DI_DUPLICATE_TOKEN',
        token,
        sourceFile: matches.map((match) => match.sourceFile).join(', '),
        message: `DI duplicate token: ${token}`
      });
    }
  }

  for (const node of nodes) {
    for (const dependency of node.dependencies) {
      if (!tokens.has(dependency) && !BUILT_IN_TOKENS.has(dependency)) {
        issues.push({
          code: 'DI_MISSING_DEPENDENCY',
          token: node.token,
          dependency,
          sourceFile: node.sourceFile,
          message: `DI missing dependency: ${node.token} -> ${dependency}`
        });
      }
    }
  }

  for (const cycle of findCycles(nodes)) {
    issues.push({
      code: 'DI_CYCLE',
      token: cycle[0],
      cycle,
      message: `DI dependency cycle: ${cycle.join(' -> ')}`
    });
  }

  return { nodes, issues };
}
