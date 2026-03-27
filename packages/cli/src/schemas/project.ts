import { normalizeProjectPolicies, type ProjectPolicies } from './template.js';

export interface ProjectManifest {
  schemaVersion: 1;
  kind: 'app' | 'plugin';
  type: string;
  runtime: 'web' | 'cli' | 'worker' | 'service';
  templateId: string;
  templateVersion: string;
  packageManager: 'pnpm' | 'npm' | 'yarn';
  presets: string[];
  policies: ProjectPolicies;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function expectString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`Invalid string field: ${field}`);
  }
  return value;
}

function parseStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is string => typeof item === 'string');
}

export function parseProjectManifest(value: unknown): ProjectManifest {
  if (!isRecord(value)) {
    throw new Error('Invalid project manifest');
  }

  if (value.schemaVersion !== 1) {
    throw new Error('Unsupported project manifest schema version');
  }

  if (value.kind !== 'app' && value.kind !== 'plugin') {
    throw new Error('Invalid project kind');
  }

  if (
    value.runtime !== 'web' &&
    value.runtime !== 'cli' &&
    value.runtime !== 'worker' &&
    value.runtime !== 'service'
  ) {
    throw new Error('Invalid runtime');
  }

  if (
    value.packageManager !== 'pnpm' &&
    value.packageManager !== 'npm' &&
    value.packageManager !== 'yarn'
  ) {
    throw new Error('Invalid package manager');
  }

  return {
    schemaVersion: 1,
    kind: value.kind,
    type: expectString(value.type, 'type'),
    runtime: value.runtime,
    templateId: expectString(value.templateId, 'templateId'),
    templateVersion: expectString(value.templateVersion, 'templateVersion'),
    packageManager: value.packageManager,
    presets: parseStringArray(value.presets),
    policies: normalizeProjectPolicies(value.policies)
  };
}
