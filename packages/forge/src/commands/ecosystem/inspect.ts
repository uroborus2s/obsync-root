import { fetchGithubEvidence } from './github-source.js';
import { fetchNpmPackage } from './npm-source.js';
import { readRegistryConfig } from './registry-config.js';
import { withSignals } from './signals.js';
import { inspectStratixCatalog } from './stratix-source.js';
import type { Candidate } from './types.js';

export async function inspectEcosystemPackage(options: {
  name: string;
  registry?: string;
  cwd?: string;
}): Promise<{
  candidate: Candidate;
  evidence: Record<string, unknown>;
}> {
  const registry = readRegistryConfig(options.cwd);
  const registryUrl = options.registry || registry.registry;
  const stratix = inspectStratixCatalog(options.name);
  const npm = await fetchNpmPackage(options.name, registryUrl).catch(
    () => undefined
  );
  const repository = stratix?.repository || npm?.repository;
  const github = await fetchGithubEvidence(repository).catch(() => undefined);

  const candidate = withSignals(
    {
      name: options.name,
      ecosystem: stratix ? 'stratix' : 'npm',
      version: stratix?.version || npm?.version,
      description: stratix?.description || npm?.description,
      repository,
      keywords: Array.from(
        new Set([...(stratix?.keywords || []), ...(npm?.keywords || [])])
      ),
      presets: stratix?.presets,
      capabilities: stratix?.capabilities,
      score: stratix ? 1 : 0.5,
      evidence: [
        ...(stratix?.evidence || []),
        ...(npm
          ? [
              {
                source: 'npm' as const,
                version: npm.version,
                summary: npm.description
              }
            ]
          : []),
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

  return {
    candidate,
    evidence: {
      ...(stratix && {
        stratix: {
          version: stratix.version,
          presets: stratix.presets,
          capabilities: stratix.capabilities
        }
      }),
      ...(npm && {
        npm: {
          version: npm.version,
          description: npm.description,
          repository: npm.repository,
          keywords: npm.keywords
        }
      }),
      ...(github && {
        github: {
          owner: github.owner,
          repo: github.repo,
          archived: github.archived,
          pushedAt: github.pushedAt,
          stars: github.stars,
          license: github.license,
          topics: github.topics
        }
      }),
      registry: {
        registry: registry.registry,
        stratixRegistry: registry.stratixRegistry,
        hasToken: registry.hasToken,
        sources: registry.sources
      }
    }
  };
}
