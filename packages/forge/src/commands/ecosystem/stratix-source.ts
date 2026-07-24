import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Candidate } from './types.js';
import { withSignals } from './signals.js';

export interface StratixCatalogEntry {
  name: string;
  version: string;
  description: string;
  keywords: string[];
  presets?: string[];
  capabilities?: string[];
  repository?: string;
}

const FALLBACK_CATALOG: StratixCatalogEntry[] = [
  {
    name: '@stratix/database',
    version: '1.1.0',
    description: 'Repository-first database plugin for Stratix applications',
    keywords: ['stratix', 'database', 'repository', 'postgres'],
    presets: ['database'],
    capabilities: ['database', 'repository']
  },
  {
    name: '@stratix/redis',
    version: '1.0.0-beta.2',
    description: 'Redis adapter plugin for Stratix applications',
    keywords: ['stratix', 'redis', 'cache'],
    presets: ['redis'],
    capabilities: ['redis', 'cache']
  },
  {
    name: '@stratix/queue',
    version: '1.0.0-beta.2',
    description: 'Queue plugin built on Stratix Redis integration',
    keywords: ['stratix', 'queue', 'worker', 'redis'],
    presets: ['queue', 'redis'],
    capabilities: ['queue', 'worker']
  },
  {
    name: '@stratix/ossp',
    version: '1.1.0-beta.0',
    description:
      'Object storage plugin for MinIO, S3 compatible, and Aliyun OSS',
    keywords: ['stratix', 'oss', 's3', 'aliyun'],
    presets: ['ossp'],
    capabilities: ['object-storage']
  },
  {
    name: '@stratix/was-v7',
    version: '1.0.0-beta.36',
    description: 'WPS WAS V7 integration plugin',
    keywords: ['stratix', 'wps', 'was-v7'],
    presets: ['was-v7'],
    capabilities: ['wps']
  }
];

function scoreEntry(entry: StratixCatalogEntry, query: string): number {
  const haystack = [
    entry.name,
    entry.description,
    ...(entry.keywords || []),
    ...(entry.presets || []),
    ...(entry.capabilities || [])
  ]
    .join(' ')
    .toLowerCase();
  const normalized = query.toLowerCase();
  if (!normalized) return 1;
  if (entry.name.toLowerCase().includes(normalized)) return 1;
  if (haystack.includes(normalized)) return 0.9;
  return 0;
}

export function loadStratixCatalog(): StratixCatalogEntry[] {
  const catalogPath = path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    'catalog',
    'stratix.json'
  );
  if (!fs.existsSync(catalogPath)) {
    return FALLBACK_CATALOG;
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
    return Array.isArray(parsed) ? parsed : FALLBACK_CATALOG;
  } catch {
    return FALLBACK_CATALOG;
  }
}

export function toStratixCandidate(
  entry: StratixCatalogEntry,
  score = 1
): Candidate {
  return withSignals({
    name: entry.name,
    ecosystem: 'stratix',
    version: entry.version,
    description: entry.description,
    keywords: entry.keywords || [],
    presets: entry.presets,
    capabilities: entry.capabilities,
    repository: entry.repository,
    score,
    evidence: [
      {
        source: 'stratix',
        version: entry.version,
        summary: entry.description
      }
    ]
  });
}

export function searchStratixCatalog(query: string): Candidate[] {
  return loadStratixCatalog()
    .map((entry) => ({ entry, score: scoreEntry(entry, query) }))
    .filter(({ score }) => score > 0)
    .map(({ entry, score }) => toStratixCandidate(entry, score));
}

export function inspectStratixCatalog(name: string): Candidate | undefined {
  return searchStratixCatalog('').find((entry) => entry.name === name);
}
