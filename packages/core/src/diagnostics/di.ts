import type { AwilixContainer } from 'awilix';
import type { RegistrationPlanRecordMetadata } from '../registration/index.js';

export type DIRegistrationType = 'class' | 'function' | 'value' | 'unknown';
export type DIRegistrationConfidence = 'explicit' | 'inferred' | 'unknown';
export type DIDiagnosticSeverity = 'error' | 'warning';

export interface DIRegistrationRecord {
  token: string;
  registrationType: DIRegistrationType;
  lifetime?: string;
  injectionMode?: string;
  dependencies?: string[];
  target?: unknown;
  source?: string;
  plan?: RegistrationPlanRecordMetadata;
}

export interface DIGraphNode {
  token: string;
  dependencies: string[];
  registrationType: DIRegistrationType;
  confidence: DIRegistrationConfidence;
  lifetime?: string;
  injectionMode?: string;
  source?: string;
  plan?: RegistrationPlanRecordMetadata;
}

export interface DIGraph {
  nodes: DIGraphNode[];
}

export interface DIDiagnostic {
  code:
    | 'DI_DUPLICATE_TOKEN'
    | 'DI_MISSING_DEPENDENCY'
    | 'DI_CYCLE'
    | 'DI_LIFETIME_RISK';
  severity: DIDiagnosticSeverity;
  token: string;
  dependency?: string;
  cycle?: string[];
  plan?: RegistrationPlanRecordMetadata;
  message: string;
}

export interface DIDiagnosticsResult {
  graph: DIGraph;
  diagnostics: DIDiagnostic[];
}

export interface DIDiagnosticOptions {
  builtInTokens?: string[];
}

const DEFAULT_BUILT_IN_TOKENS = [
  'config',
  'logger',
  'request',
  'reply',
  'requestId',
  'diScope'
];

const registrationRecords = new WeakMap<
  AwilixContainer,
  DIRegistrationRecord[]
>();

function cleanSource(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
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

export function extractConstructorDependencies(target: unknown): string[] {
  if (typeof target !== 'function') {
    return [];
  }

  const source = cleanSource(Function.prototype.toString.call(target));
  const constructorMatch = source.match(/constructor\s*\(([^)]*)\)/m);
  const functionMatch = source.match(/^[^(]*\(([^)]*)\)/m);
  const parameterList = constructorMatch?.[1] ?? functionMatch?.[1] ?? '';

  return splitParameters(parameterList)
    .map(normalizeParameterName)
    .filter((name): name is string => Boolean(name));
}

export function recordDIRegistration(
  container: AwilixContainer,
  record: DIRegistrationRecord
): void {
  const records = registrationRecords.get(container) || [];
  records.push(record);
  registrationRecords.set(container, records);
}

function getKnownRegistrations(
  container: AwilixContainer
): DIRegistrationRecord[] {
  return registrationRecords.get(container) || [];
}

function getContainerRegistrations(
  container: AwilixContainer
): Record<string, any> {
  return (
    (container as unknown as { registrations?: Record<string, any> })
      .registrations || {}
  );
}

export function createDIGraph(container: AwilixContainer): DIGraph {
  const records = getKnownRegistrations(container);
  const nodes: DIGraphNode[] = records.map((record) => ({
    token: record.token,
    dependencies:
      record.dependencies || extractConstructorDependencies(record.target),
    registrationType: record.registrationType,
    confidence: record.dependencies ? 'explicit' : 'inferred',
    lifetime: record.lifetime,
    injectionMode: record.injectionMode,
    source: record.source,
    plan: record.plan
  }));

  const knownTokens = new Set(records.map((record) => record.token));
  for (const [token, registration] of Object.entries(
    getContainerRegistrations(container)
  )) {
    if (knownTokens.has(token)) {
      continue;
    }

    nodes.push({
      token,
      dependencies: [],
      registrationType: 'unknown',
      confidence: 'unknown',
      lifetime: registration?.lifetime,
      injectionMode: registration?.injectionMode
    });
  }

  return { nodes };
}

function findCycles(graph: DIGraph): string[][] {
  const adjacency = new Map<string, string[]>();
  for (const node of graph.nodes) {
    if (!adjacency.has(node.token)) {
      adjacency.set(node.token, node.dependencies);
    }
  }

  const cycles: string[][] = [];
  const visited = new Set<string>();
  const active = new Set<string>();

  function visit(token: string, path: string[]): void {
    if (active.has(token)) {
      const cycleStart = path.indexOf(token);
      if (cycleStart >= 0) {
        const cycle = path.slice(cycleStart);
        cycles.push(
          cycle[cycle.length - 1] === token ? cycle : [...cycle, token]
        );
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
        visit(dependency, [...path, dependency]);
      }
    }

    active.delete(token);
  }

  for (const token of adjacency.keys()) {
    visit(token, [token]);
  }

  return cycles;
}

export function diagnoseDIGraph(
  graph: DIGraph,
  options: DIDiagnosticOptions = {}
): DIDiagnostic[] {
  const diagnostics: DIDiagnostic[] = [];
  const builtInTokens = new Set([
    ...DEFAULT_BUILT_IN_TOKENS,
    ...(options.builtInTokens || [])
  ]);
  const tokenCounts = new Map<string, number>();

  for (const node of graph.nodes) {
    tokenCounts.set(node.token, (tokenCounts.get(node.token) || 0) + 1);
  }

  const tokenSet = new Set(graph.nodes.map((node) => node.token));

  for (const [token, count] of tokenCounts.entries()) {
    if (count > 1) {
      diagnostics.push({
        code: 'DI_DUPLICATE_TOKEN',
        severity: 'error',
        token,
        message: `DI duplicate token: ${token}`
      });
    }
  }

  for (const node of graph.nodes) {
    for (const dependency of node.dependencies) {
      if (!tokenSet.has(dependency) && !builtInTokens.has(dependency)) {
        diagnostics.push({
          code: 'DI_MISSING_DEPENDENCY',
          severity: 'error',
          token: node.token,
          dependency,
          plan: node.plan,
          message: `DI missing dependency: ${node.token} -> ${dependency}`
        });
      }
    }
  }

  for (const cycle of findCycles(graph)) {
    diagnostics.push({
      code: 'DI_CYCLE',
      severity: 'error',
      token: cycle[0],
      cycle,
      message: `DI dependency cycle: ${cycle.join(' -> ')}`
    });
  }

  return diagnostics;
}

export function runDIDiagnostics(
  container: AwilixContainer,
  options: DIDiagnosticOptions = {}
): DIDiagnosticsResult {
  const graph = createDIGraph(container);
  return {
    graph,
    diagnostics: diagnoseDIGraph(graph, options)
  };
}
