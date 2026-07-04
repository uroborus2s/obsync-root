import type { Candidate, PackageEvidence } from './types.js';
import { withSignals } from './signals.js';

function registryUrl(registry: string, path: string): string {
  return new URL(path, registry.endsWith('/') ? registry : `${registry}/`).href;
}

function encodePackageName(name: string): string {
  if (!name.startsWith('@')) {
    return encodeURIComponent(name);
  }
  const [scope, packageName] = name.split('/');
  return `${scope}%2f${packageName}`;
}

function repositoryUrl(value: unknown): string | undefined {
  if (typeof value === 'string') return value;
  if (
    value &&
    typeof value === 'object' &&
    'url' in value &&
    typeof value.url === 'string'
  ) {
    return value.url;
  }
  return undefined;
}

function normalizeRepository(value: string | undefined): string | undefined {
  return value
    ?.replace(/^git\+/, '')
    .replace(/\.git$/, '')
    .replace(/^git:\/\//, 'https://');
}

export async function searchNpmRegistry(options: {
  query: string;
  registry: string;
  limit: number;
}): Promise<Candidate[]> {
  const url = registryUrl(
    options.registry,
    `/-/v1/search?text=${encodeURIComponent(options.query)}&size=${options.limit}`
  );
  const response = await fetch(url, {
    headers: { accept: 'application/json' }
  });
  if (!response.ok) {
    return [];
  }
  const payload = (await response.json()) as any;
  const objects = Array.isArray(payload.objects) ? payload.objects : [];

  return objects
    .map((entry: any) => {
      const packageInfo = entry.package || {};
      const name = packageInfo.name;
      if (typeof name !== 'string') return undefined;
      const description =
        typeof packageInfo.description === 'string'
          ? packageInfo.description
          : undefined;
      const version =
        typeof packageInfo.version === 'string'
          ? packageInfo.version
          : undefined;
      const keywords = Array.isArray(packageInfo.keywords)
        ? packageInfo.keywords.filter(
            (keyword: unknown) => typeof keyword === 'string'
          )
        : [];
      const repository = normalizeRepository(
        repositoryUrl(packageInfo.repository || packageInfo.links?.repository)
      );

      return withSignals({
        name,
        ecosystem: 'npm',
        version,
        description,
        keywords,
        repository,
        score: Number(entry.score?.final || 0.5),
        evidence: [
          {
            source: 'npm',
            version,
            score: Number(entry.score?.final || 0.5),
            summary: description
          }
        ]
      });
    })
    .filter((entry: Candidate | undefined): entry is Candidate =>
      Boolean(entry)
    );
}

export async function fetchNpmPackage(
  name: string,
  registry: string
): Promise<PackageEvidence | undefined> {
  const response = await fetch(registryUrl(registry, encodePackageName(name)), {
    headers: { accept: 'application/json' }
  });
  if (!response.ok) {
    return undefined;
  }
  const payload = (await response.json()) as any;
  return {
    name,
    version:
      typeof payload.version === 'string'
        ? payload.version
        : payload['dist-tags']?.latest,
    description:
      typeof payload.description === 'string' ? payload.description : undefined,
    repository: normalizeRepository(repositoryUrl(payload.repository)),
    keywords: Array.isArray(payload.keywords)
      ? payload.keywords.filter(
          (keyword: unknown) => typeof keyword === 'string'
        )
      : []
  };
}
