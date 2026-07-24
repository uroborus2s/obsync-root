import type { GithubEvidence } from './types.js';

export function parseGithubRepository(
  repository: string | undefined
): { owner: string; repo: string } | undefined {
  if (!repository) return undefined;
  const match = repository.match(/github\.com[:/]([^/\s]+)\/([^/\s#?]+)/i);
  if (!match) return undefined;
  return {
    owner: match[1],
    repo: match[2].replace(/\.git$/, '')
  };
}

export async function fetchGithubEvidence(
  repository: string | undefined
): Promise<GithubEvidence | undefined> {
  const parsed = parseGithubRepository(repository);
  if (!parsed) return undefined;

  const headers: Record<string, string> = {
    accept: 'application/vnd.github+json'
  };
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  if (token) {
    headers.authorization = `Bearer ${token}`;
  }

  const response = await fetch(
    `https://api.github.com/repos/${parsed.owner}/${parsed.repo}`,
    { headers }
  );
  if (!response.ok) {
    return undefined;
  }

  const payload = (await response.json()) as any;
  return {
    owner: parsed.owner,
    repo: parsed.repo,
    archived: payload.archived === true,
    pushedAt:
      typeof payload.pushed_at === 'string' ? payload.pushed_at : undefined,
    stars:
      typeof payload.stargazers_count === 'number'
        ? payload.stargazers_count
        : undefined,
    license:
      typeof payload.license?.spdx_id === 'string'
        ? payload.license.spdx_id
        : undefined,
    topics: Array.isArray(payload.topics)
      ? payload.topics.filter((topic: unknown) => typeof topic === 'string')
      : []
  };
}
