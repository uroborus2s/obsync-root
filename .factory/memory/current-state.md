# Current State

- Snapshot date: 2026-03-28
- Recommended software-factory stage: `ANALYSIS`
- Repository type: historical Stratix source monorepo
- Workspace reality:
  - 10 public `@stratix/*` packages
  - 0 workspace apps
  - 1 non-workspace preview sample at `examples/web-admin-preview`
  - 1 archived legacy package baseline at `legacy/packages/utils`
- Stable docs were missing before this baseline; `docs/`, `.factory/`, `AGENTS.md`, `GEMINI.md` are now present.

## Verified Facts

- Root `CI=true pnpm install --frozen-lockfile` now passes.
- Root offline frozen install still fails because required tarballs are not fully cached.
- `@stratix/cli` can build and run `--help`.
- Sequential package builds now pass for `@stratix/core`, `@stratix/database`, `@stratix/redis`, `@stratix/ossp`, `@stratix/queue`, `@stratix/was-v7`, and `@stratix/tasks`.
- `examples/web-admin-preview` can install independently, build, test, and preview.
- Root `pnpm build` is broken because the root script passes `--filter` without a value.
- Root `pnpm build:all` was not re-verified after the package-level compatibility fixes and still needs fresh end-to-end validation.
- Root `pnpm test` is blocked by multiple workspace test-profile regressions.

## Release Surface

- Local manifest versions are ahead of git tags for several public packages.
- npm registry verification only found `@stratix/core@0.8.2`.
- Current package names for most other public packages returned 404 on npm registry at check time.

## Immediate Priorities

1. Fix root build/install validation path.
2. Re-verify and repair the root package-graph build/test path after the package-level compatibility fixes.
3. Reconcile manifest versions, git tags, and npm registry reality.

## Canonical Detailed Report

- `docs/01-framework-development/01-discovery/current-state-analysis.md`
