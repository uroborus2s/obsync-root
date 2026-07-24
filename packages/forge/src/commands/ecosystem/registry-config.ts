import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { RegistryConfig } from './types.js';

export const DEFAULT_REGISTRY = 'https://registry.npmjs.org/';

function parseNpmrc(source: string): Record<string, string> {
  const result: Record<string, string> = {};

  for (const line of source.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith(';')) {
      continue;
    }
    const separator = trimmed.indexOf('=');
    if (separator < 0) {
      continue;
    }
    result[trimmed.slice(0, separator).trim()] = trimmed
      .slice(separator + 1)
      .trim();
  }

  return result;
}

export function normalizeRegistry(
  value: string | undefined
): string | undefined {
  if (!value) return undefined;
  return value.endsWith('/') ? value : `${value}/`;
}

export function readRegistryConfig(cwd = process.cwd()): RegistryConfig {
  const files = [path.join(os.homedir(), '.npmrc'), path.join(cwd, '.npmrc')];
  const merged: Record<string, string> = {};
  const sources: string[] = [];

  for (const file of files) {
    if (!fs.existsSync(file)) {
      continue;
    }
    Object.assign(merged, parseNpmrc(fs.readFileSync(file, 'utf8')));
    sources.push(file);
  }

  const registry = normalizeRegistry(merged.registry) || DEFAULT_REGISTRY;
  const hasToken = Object.keys(merged).some((key) =>
    /:_authToken$|:_auth$|:username$|:_password$/.test(key)
  );

  return {
    registry,
    ...(merged['@stratix:registry'] && {
      stratixRegistry: normalizeRegistry(merged['@stratix:registry'])
    }),
    hasToken,
    sources
  };
}

export function resolvePackageRegistry(
  config: RegistryConfig,
  packageName: string,
  override?: string
): string {
  if (override) {
    return normalizeRegistry(override) || DEFAULT_REGISTRY;
  }
  if (packageName.startsWith('@stratix/') && config.stratixRegistry) {
    return config.stratixRegistry;
  }
  return config.registry;
}

export function resolveSearchRegistry(
  config: RegistryConfig,
  override?: string
): string {
  return override
    ? normalizeRegistry(override) || DEFAULT_REGISTRY
    : config.registry;
}

export function registryEvidence(
  config: RegistryConfig,
  effectiveRegistry: string
): RegistryConfig {
  return {
    ...config,
    registry: effectiveRegistry
  };
}
