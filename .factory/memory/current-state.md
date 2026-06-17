# Current State

- Snapshot date: 2026-06-17
- Recommended software-factory stage: `ANALYSIS`
- Repository type: historical Stratix source monorepo
- Toolchain baseline:
  - Node `24.14.1`
  - pnpm `10.33.0`
  - TypeScript `6.0.2`
- Workspace reality:
  - 10 public `@stratix/*` packages
  - 0 workspace apps
  - 1 non-workspace preview sample at `examples/web-admin-preview`
  - `@stratix/utils` removed from the current workspace; shared utility APIs are owned by `@stratix/core/utils`
- Stable docs were missing before this baseline; `docs/`, `.factory/`, `AGENTS.md`, `GEMINI.md` are now present.
- Developer guides now include beginner-oriented paths for backend apps, plugins, and the CLI scaffold.
- `@stratix/database` has started a database-only clean breaking refactor: `DatabaseAPI` was removed from the package, module-level database manager/global connection helpers were removed, and `BaseRepository` now requires an explicit `DatabaseConnectionProvider`.
- `@stratix/core` has completed a package-level breaking discovery refactor: application discovery is now driven by `config.discovery` and `ApplicationDiscoveryPipeline`, while old application-level discovery entry points were removed from the root export surface.

## Verified Facts

- Root and preview-sample lockfiles were refreshed after the dependency upgrade.
- `CI=true pnpm install --frozen-lockfile --ignore-scripts` passes after removing `packages/utils` from the workspace lockfile.
- Root `CI=true pnpm install --frozen-lockfile` passes on pnpm `10.33.0`.
- Preview sample `CI=true pnpm install --ignore-workspace --frozen-lockfile` passes.
- Root `pnpm build` delegates to `build:supported` and passes for supported packages with `@stratix/tasks` excluded.
- Root `pnpm build:supported` passes:
  - 9 supported packages
  - `@stratix/tasks` explicitly excluded
- Explicit all-package `pnpm build:all` is still expected to fail at `@stratix/tasks` until that deprecated package is migrated or removed:
  - `@stratix/tasks` still imports the removed `DatabaseAPI`
  - `@stratix/tasks` still calls the old `BaseRepository` constructor shape
- Root `pnpm test` delegates to `test:supported` and passes for supported packages with `@stratix/tasks` excluded.
- Root `pnpm test:supported` passes across supported packages.
- `pnpm --filter @stratix/core build` passes after the breaking application discovery refactor.
- `pnpm --filter @stratix/core exec tsc -p tsconfig.json --noEmit` passes.
- `CI=true pnpm --filter @stratix/core exec vitest run` passes:
  - 26 test files
  - 199 tests
- `pnpm --filter @stratix/core pack --pack-destination /tmp` passes and produces `/tmp/stratix-core-1.1.0.tgz`.
- `uvx --from docs-stratego docs-stratego source validate --repo-path .` passes:
  - 82 pages
  - 0 contracts
- `@stratix/cli` can build and run `--help` on the Node 24 baseline.
- `examples/web-admin-preview` can install independently, build, test, and preview on the upgraded frontend stack.
- `pnpm --filter @stratix/database build` passes after the database-only clean breaking refactor.
- `pnpm --filter @stratix/database exec vitest run` passes after the database quality-gate refactor:
  - 8 test files
  - 48 tests
- `pnpm --filter @stratix/database lint` fails before linting source files because the workspace ESLint 10 setup still receives an eslintrc-style `parser` key instead of flat-config `languageOptions.parser`.
- `pnpm --filter @stratix/was-v7 test` passes:
  - 11 test files
  - 120 tests
- `@stratix/devtools`, `@stratix/ossp`, `@stratix/queue`, and `@stratix/testing` now have smoke tests so the supported root test profile is not broken by no-test packages.
- The upgraded toolchain still emits peer warnings because `@typescript-eslint` does not yet declare TypeScript 6 support and `eslint-plugin-import` does not yet declare ESLint 10 support.

## Release Surface

- Local manifest versions are ahead of git tags for several public packages.
- npm registry verification only found `@stratix/core@0.8.2`.
- Current package names for most other public packages returned 404 on npm registry at check time.

## Immediate Priorities

1. Restore reproducible offline installation.
2. Reconcile manifest versions, git tags, and npm registry reality.
3. Decide whether `@stratix/tasks` remains permanently deprecated or is removed from the workspace surface.

## Canonical Detailed Report

- `docs/04-project-development/02-discovery/current-state-analysis.md`
- `docs/04-project-development/02-discovery/core-framework-review-report.md`
- `docs/04-project-development/02-discovery/database-plugin-review-report.md`
