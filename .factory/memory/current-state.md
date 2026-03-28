# Current State

- Snapshot date: 2026-03-29
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
  - 1 archived legacy package baseline at `legacy/packages/utils`
- Stable docs were missing before this baseline; `docs/`, `.factory/`, `AGENTS.md`, `GEMINI.md` are now present.
- Developer guides now include beginner-oriented paths for backend apps, plugins, and the CLI scaffold.

## Verified Facts

- Root and preview-sample lockfiles were refreshed after the dependency upgrade.
- Root `CI=true pnpm install --frozen-lockfile` passes on pnpm `10.33.0`.
- Preview sample `CI=true pnpm install --ignore-workspace --frozen-lockfile` passes.
- Root `pnpm build` now delegates to `build:all` and passes.
- Root `pnpm build:all` passes for all 10 public workspace packages on the Node 24 / TypeScript 6 baseline.
- `@stratix/cli` can build and run `--help` on the Node 24 baseline.
- `examples/web-admin-preview` can install independently, build, test, and preview on the upgraded frontend stack.
- Root `pnpm test` still fails, but the failure frontier has moved to the workspace test profile:
  - `@stratix/ossp` and `@stratix/queue` exit 1 on `No test files found`
  - several other package suites still need individual Vitest 4 triage
- The upgraded toolchain still emits peer warnings because `@typescript-eslint` does not yet declare TypeScript 6 support and `eslint-plugin-import` does not yet declare ESLint 10 support.

## Release Surface

- Local manifest versions are ahead of git tags for several public packages.
- npm registry verification only found `@stratix/core@0.8.2`.
- Current package names for most other public packages returned 404 on npm registry at check time.

## Immediate Priorities

1. Stabilize the root `pnpm test` profile, especially the no-test-package policy and remaining suite triage.
2. Restore reproducible offline installation.
3. Reconcile manifest versions, git tags, and npm registry reality.

## Canonical Detailed Report

- `docs/04-project-development/02-discovery/current-state-analysis.md`
