import type { Candidate, GithubEvidence, Signal } from './types.js';

export function buildSignals(options: {
  name: string;
  evidenceSources: string[];
  fastifyCategory?: string;
  github?: GithubEvidence;
}): Signal {
  const fastifyCore =
    options.name.startsWith('@fastify/') || options.fastifyCategory === 'core';
  const stratixNative = options.name.startsWith('@stratix/');
  const fastifyPlugin =
    fastifyCore || options.evidenceSources.includes('fastify');

  return {
    fastifyCore,
    stratixNative,
    requiresAdapter: fastifyPlugin && !stratixNative,
    archived: options.github?.archived === true
  };
}

export function withSignals(
  candidate: Omit<Candidate, 'signals'>,
  github?: GithubEvidence
): Candidate {
  return {
    ...candidate,
    signals: buildSignals({
      name: candidate.name,
      evidenceSources: candidate.evidence.map((entry) => entry.source),
      fastifyCategory: candidate.fastifyCategory,
      github
    })
  };
}
