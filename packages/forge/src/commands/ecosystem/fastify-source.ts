import type { Candidate, FastifyCategory } from './types.js';
import { withSignals } from './signals.js';

const FASTIFY_ECOSYSTEM_URL =
  'https://raw.githubusercontent.com/fastify/fastify/main/docs/Guides/Ecosystem.md';

const FALLBACK_FASTIFY_ECOSYSTEM_MARKDOWN =
  '#### [Core](#core)\n' +
  '- [@fastify/redis](https://github.com/fastify/fastify-redis) Redis plugin for Fastify\n' +
  '- [@fastify/postgres](https://github.com/fastify/fastify-postgres) PostgreSQL plugin for Fastify\n' +
  '- [@fastify/cors](https://github.com/fastify/fastify-cors) CORS plugin for Fastify\n' +
  '- [@fastify/helmet](https://github.com/fastify/fastify-helmet) Security headers plugin for Fastify\n' +
  '#### [Community](#community)\n' +
  '- [fastify-redis-channels](https://github.com/hearit-io/fastify-redis-channels) Redis pub/sub plugin\n';

interface FastifyListItem {
  category: FastifyCategory;
  line: string;
}

function compactWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function markdownItems(markdown: string): FastifyListItem[] {
  const items: FastifyListItem[] = [];
  let category: FastifyCategory | undefined;
  let current: FastifyListItem | undefined;

  const flush = () => {
    if (current) {
      items.push(current);
      current = undefined;
    }
  };

  for (const line of markdown.split(/\r?\n/)) {
    if (/^#{2,}\s+\[?Core\]?(?:\(#core\))?\s*$/i.test(line)) {
      flush();
      category = 'core';
      continue;
    }
    if (/^#{2,}\s+\[?Community\]?(?:\(#community\))?\s*$/i.test(line)) {
      flush();
      category = 'community';
      continue;
    }
    if (/^#{2,}/.test(line)) {
      flush();
      category = undefined;
      continue;
    }

    if (!category) {
      continue;
    }

    if (/^\s*-\s+\[`?/.test(line)) {
      flush();
      current = { category, line: line.trim() };
      continue;
    }

    if (current && /^\s{2,}\S/.test(line)) {
      current.line = `${current.line} ${line.trim()}`;
    }
  }

  flush();
  return items;
}

export function parseFastifyPlugins(markdown: string): Candidate[] {
  const candidates: Candidate[] = [];
  const pattern =
    /\[`?(@?[\w.-]+\/?[\w.-]*)`?\]\((https:\/\/github\.com\/[^)\s]+)\)\s*(.*)/i;

  for (const item of markdownItems(markdown)) {
    const match = item.line.match(pattern);
    if (!match) {
      continue;
    }
    const name = match[1];
    const repository = match[2];
    const description =
      compactWhitespace(match[3] || '') || `${name} Fastify plugin`;
    candidates.push(
      withSignals({
        name,
        ecosystem: 'fastify',
        description,
        repository,
        keywords: ['fastify', ...name.split('/').at(-1)!.split('-')],
        fastifyCategory: item.category,
        score: 0.75,
        evidence: [
          {
            source: 'fastify',
            url: repository,
            summary: description
          }
        ]
      })
    );
  }

  return candidates;
}

export async function loadFastifyCatalog(): Promise<Candidate[]> {
  try {
    const response = await fetch(FASTIFY_ECOSYSTEM_URL, {
      headers: { accept: 'text/markdown,text/plain' }
    });
    if (response.ok) {
      return parseFastifyPlugins(await response.text());
    }
  } catch {
    // Keep the command usable offline; the fallback still exercises the parser.
  }

  return parseFastifyPlugins(FALLBACK_FASTIFY_ECOSYSTEM_MARKDOWN);
}

export async function searchFastifyPlugins(
  query: string
): Promise<Candidate[]> {
  const normalized = query.toLowerCase();
  return (await loadFastifyCatalog()).filter((candidate) =>
    [candidate.name, candidate.description, ...candidate.keywords]
      .join(' ')
      .toLowerCase()
      .includes(normalized)
  );
}
