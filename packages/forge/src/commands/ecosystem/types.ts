export type EcosystemSource = 'stratix' | 'fastify' | 'npm';
export type EvidenceSource = EcosystemSource | 'github';
export type FastifyCategory = 'core' | 'community';

export interface Evidence {
  source: EvidenceSource;
  url?: string;
  version?: string;
  summary?: string;
  score?: number;
  stars?: number;
  archived?: boolean;
  pushedAt?: string;
  license?: string;
  topics?: string[];
}

export interface Signal {
  fastifyCore: boolean;
  stratixNative: boolean;
  requiresAdapter: boolean;
  archived: boolean;
}

export interface Candidate {
  name: string;
  ecosystem: EcosystemSource;
  version?: string;
  description?: string;
  keywords: string[];
  repository?: string;
  presets?: string[];
  capabilities?: string[];
  fastifyCategory?: FastifyCategory;
  score: number;
  evidence: Evidence[];
  signals: Signal;
}

export interface RegistryConfig {
  registry: string;
  stratixRegistry?: string;
  hasToken: boolean;
  sources: string[];
}

export interface PackageEvidence {
  name: string;
  version?: string;
  description?: string;
  repository?: string;
  keywords: string[];
}

export interface GithubEvidence {
  owner: string;
  repo: string;
  archived: boolean;
  pushedAt?: string;
  stars?: number;
  license?: string;
  topics: string[];
}
