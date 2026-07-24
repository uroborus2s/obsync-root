import { loadFastifyCatalog } from './fastify-source.js';
import { loadStratixCatalog, toStratixCandidate } from './stratix-source.js';
import type { Candidate, EcosystemSource } from './types.js';

export async function listEcosystemCatalog(options: {
  sources: EcosystemSource[];
}): Promise<Candidate[]> {
  const candidates: Candidate[] = [];

  if (options.sources.includes('stratix')) {
    candidates.push(
      ...loadStratixCatalog().map((entry) => toStratixCandidate(entry))
    );
  }

  if (options.sources.includes('fastify')) {
    candidates.push(...(await loadFastifyCatalog()));
  }

  return candidates.sort(
    (left, right) =>
      left.ecosystem.localeCompare(right.ecosystem) ||
      left.name.localeCompare(right.name)
  );
}
