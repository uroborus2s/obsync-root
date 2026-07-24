import {
  readRegistryConfig,
  registryEvidence,
  resolveSearchRegistry
} from './registry-config.js';
import { searchFastifyPlugins } from './fastify-source.js';
import { fetchGithubEvidence } from './github-source.js';
import { searchNpmRegistry } from './npm-source.js';
import { searchStratixCatalog } from './stratix-source.js';
import { withSignals } from './signals.js';
import type { Candidate, EcosystemSource, RegistryConfig } from './types.js';

function mergeCandidates(candidates: Candidate[]): Candidate[] {
  const merged = new Map<string, Candidate>();

  for (const candidate of candidates) {
    const existing = merged.get(candidate.name);
    if (!existing) {
      merged.set(candidate.name, candidate);
      continue;
    }
    merged.set(candidate.name, {
      ...existing,
      ecosystem: existing.ecosystem,
      version: existing.version || candidate.version,
      description: existing.description || candidate.description,
      repository: existing.repository || candidate.repository,
      keywords: Array.from(
        new Set([...existing.keywords, ...candidate.keywords])
      ),
      presets: existing.presets || candidate.presets,
      capabilities: existing.capabilities || candidate.capabilities,
      score: Math.max(existing.score, candidate.score),
      evidence: [...existing.evidence, ...candidate.evidence],
      signals: existing.signals
    });
  }

  return [...merged.values()];
}

function sourceRank(candidate: Candidate): number {
  if (candidate.signals.stratixNative) {
    return 0;
  }
  if (
    candidate.ecosystem === 'fastify' &&
    candidate.fastifyCategory === 'core'
  ) {
    return 1;
  }
  if (candidate.ecosystem === 'fastify') {
    return 2;
  }
  return 3;
}

export async function searchEcosystem(options: {
  query: string;
  limit: number;
  registry?: string;
  cwd?: string;
  sources?: EcosystemSource[];
}): Promise<{ registry: RegistryConfig; candidates: Candidate[] }> {
  const registry = readRegistryConfig(options.cwd);
  const registryUrl = resolveSearchRegistry(registry, options.registry);
  const sources = options.sources || ['stratix', 'fastify', 'npm'];
  const [stratix, fastify, npm] = await Promise.all([
    sources.includes('stratix')
      ? Promise.resolve(searchStratixCatalog(options.query))
      : Promise.resolve([]),
    sources.includes('fastify')
      ? searchFastifyPlugins(options.query).catch(() => [])
      : Promise.resolve([]),
    sources.includes('npm')
      ? searchNpmRegistry({
          query: options.query,
          registry: registryUrl,
          limit: options.limit
        }).catch(() => [])
      : Promise.resolve([])
  ]);
  const merged = mergeCandidates([...stratix, ...fastify, ...npm])
    .sort((left, right) => {
      const rankDelta = sourceRank(left) - sourceRank(right);
      if (rankDelta !== 0) return rankDelta;
      return right.score - left.score || left.name.localeCompare(right.name);
    })
    .slice(0, options.limit);

  const candidates = await Promise.all(
    merged.map(async (candidate) => {
      const github = await fetchGithubEvidence(candidate.repository).catch(
        () => undefined
      );
      return withSignals(
        {
          ...candidate,
          evidence: [
            ...candidate.evidence,
            ...(github
              ? [
                  {
                    source: 'github' as const,
                    stars: github.stars,
                    archived: github.archived,
                    pushedAt: github.pushedAt,
                    license: github.license,
                    topics: github.topics
                  }
                ]
              : [])
          ]
        },
        github
      );
    })
  );

  return { registry: registryEvidence(registry, registryUrl), candidates };
}
