import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const packageJson = JSON.parse(
  readFileSync(new URL('../../package.json', import.meta.url), 'utf8')
) as {
  peerDependencies: Record<string, string>;
  peerDependenciesMeta?: Record<string, { optional?: boolean }>;
  devDependencies: Record<string, string>;
};

const expectedPeerDependencies = {
  '@stratix/core': 'workspace:^1.1.0',
  'better-sqlite3': '^12.11.1',
  mysql2: '^3.22.5',
  pg: '^8.21.0',
  tarn: '^3.0.2',
  tedious: '^19.2.1'
};

const expectedDriverDevDependencies = {
  'better-sqlite3': '^13.0.1',
  mysql2: '^3.23.1',
  pg: '^8.22.0',
  tarn: '^3.1.2',
  tedious: '^20.0.0'
};

const optionalDriverPeers = [
  'better-sqlite3',
  'mysql2',
  'pg',
  'tarn',
  'tedious'
];

describe('published peer dependency contract', () => {
  it('keeps Core required and marks dialect-specific drivers optional', () => {
    expect(packageJson.peerDependencies).toEqual(expectedPeerDependencies);
    expect(packageJson.devDependencies).toMatchObject(
      expectedDriverDevDependencies
    );
    expect(packageJson.peerDependenciesMeta?.['@stratix/core']).toBeUndefined();
    expect(Object.keys(packageJson.peerDependenciesMeta ?? {}).sort()).toEqual(
      optionalDriverPeers
    );

    for (const driver of optionalDriverPeers) {
      expect(packageJson.peerDependencies[driver]).toBeTypeOf('string');
      expect(packageJson.peerDependenciesMeta?.[driver]).toEqual({
        optional: true
      });
    }
  });
});
