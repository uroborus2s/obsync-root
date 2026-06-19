import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ConfigurationError } from '../../errors/index.js';
import {
  createProductionManifestRegistrationPlan,
  loadProductionManifest
} from '../production-manifest.js';

describe('production manifest', () => {
  const sha256 = (content: string) =>
    `sha256-${createHash('sha256').update(content).digest('hex')}`;

  async function writeManifestFixture(options: {
    sourceHash?: string;
    compiledHash?: string;
    writeCompiled?: boolean;
  }) {
    const root = await mkdtemp(join(tmpdir(), 'stratix-manifest-v2-'));
    await mkdir(join(root, 'src'), { recursive: true });
    await mkdir(join(root, 'dist'), { recursive: true });
    const sourceContent = 'export class HealthService {}';
    const compiledContent = 'export class HealthService {}';
    await writeFile(join(root, 'src', 'health.ts'), sourceContent);
    if (options.writeCompiled !== false) {
      await writeFile(join(root, 'dist', 'health.js'), compiledContent);
    }

    const manifestPath = join(root, 'production-manifest.json');
    await writeFile(
      manifestPath,
      JSON.stringify(
        {
          schemaVersion: 2,
          generatedAt: '2026-06-19T00:00:00.000Z',
          generator: {
            name: '@stratix/forge',
            version: '1.1.0',
            command: 'build-manifest'
          },
          runtime: {
            packageName: '@stratix/core',
            compatibleVersions: ['1.1.x'],
            node: '>=24.0.0'
          },
          project: {
            kind: 'app',
            type: 'api',
            runtime: 'web',
            presets: []
          },
          discovery: {
            rootDir: '.',
            patterns: ['src/**/*.ts'],
            routing: {
              enabled: true
            }
          },
          registrationPlan: {
            id: 'production-manifest:test-app',
            source: 'production-manifest',
            owner: {
              type: 'manifest',
              name: 'test-app'
            },
            tokens: [
              {
                token: 'healthService',
                kind: 'service',
                registrationType: 'class',
                scope: 'root',
                visibility: 'public',
                dependencies: [],
                source: 'src/health.ts',
                metadata: {
                  className: 'HealthService',
                  sourceFile: 'src/health.ts',
                  compiledFile: 'dist/health.js'
                }
              }
            ],
            routes: [],
            adapters: [],
            lifecycle: [],
            diagnostics: []
          },
          artifacts: {
            algorithm: 'sha256',
            files: [
              {
                sourceFile: 'src/health.ts',
                sourceHash: options.sourceHash || sha256(sourceContent),
                compiledFile: 'dist/health.js',
                compiledHash: options.compiledHash || sha256(compiledContent)
              }
            ]
          },
          routes: [],
          di: {
            tokens: [
              {
                token: 'healthService',
                className: 'HealthService',
                dependencies: [],
                sourceFile: 'src/health.ts',
                compiledFile: 'dist/health.js'
              }
            ],
            issues: []
          },
          modules: [],
          moduleIssues: [],
          plugins: []
        },
        null,
        2
      )
    );

    return { root, manifestPath };
  }

  it('loads production manifest v2 and prefers compiled files for registration', async () => {
    const { root, manifestPath } = await writeManifestFixture({});

    const manifest = loadProductionManifest(root, {
      enabled: true,
      path: manifestPath,
      strict: true
    });

    expect(manifest?.schemaVersion).toBe(2);
    const plan = createProductionManifestRegistrationPlan(manifest!);
    expect(plan.sourceFiles).toEqual(['dist/health.js']);
    expect(plan.tokenEntries).toEqual([
      {
        token: 'healthService',
        className: 'HealthService',
        sourceFile: 'dist/health.js'
      }
    ]);
  });

  it('fails strict loading when a source hash is stale', async () => {
    const { root, manifestPath } = await writeManifestFixture({
      sourceHash: 'sha256-stale'
    });

    expect(() =>
      loadProductionManifest(root, {
        enabled: true,
        path: manifestPath,
        strict: true
      })
    ).toThrow(ConfigurationError);
  });

  it('fails strict loading when a compiled artifact is missing', async () => {
    const { root, manifestPath } = await writeManifestFixture({
      writeCompiled: false
    });

    expect(() =>
      loadProductionManifest(root, {
        enabled: true,
        path: manifestPath,
        strict: true
      })
    ).toThrow(ConfigurationError);
  });

  it('allows stale v2 artifacts when strict mode is disabled', async () => {
    const { root, manifestPath } = await writeManifestFixture({
      compiledHash: 'sha256-stale'
    });

    const manifest = loadProductionManifest(root, {
      enabled: true,
      path: manifestPath,
      strict: false
    });

    expect(manifest?.schemaVersion).toBe(2);
  });
});
