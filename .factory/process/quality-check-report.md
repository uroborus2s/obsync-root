# Quality Check Report

- Checked at: 2026-06-18
- Overall status: `GREEN_WITH_EXCLUSIONS`

## Passing Signals

- Root `CI=true pnpm install --frozen-lockfile`
- Root `pnpm build` through `build:supported`
- Root `pnpm test` through `test:supported`
- `pnpm run build:supported` passed across 10 supported packages
- `pnpm run test:supported` passed across 12 turbo tasks
- `uvx --from docs-stratego docs-stratego source validate --repo-path .` passed, 85 pages / 0 contracts
- Core, forge, and devtools package tarballs can be produced under `/tmp`
- Preview sample `CI=true pnpm install --ignore-workspace --frozen-lockfile`
- `@stratix/create` and `@stratix/forge` build/test/typecheck on the Node 24 baseline
- `@stratix/forge` source is physically under `packages/forge`; the lockfile importer is no longer `packages/cli`
- `@stratix/forge` Module governance tests pass after adding `module.yaml`, `doctor modules`, and `graph modules`
- `@stratix/forge` advanced typed client tests pass for path/query/body/header parameters, auth provider, and before/after hooks
- `@stratix/create` writes plugin governance manifests and `@stratix/forge` validates/graphs them through `doctor plugins` and `graph plugins`
- `@stratix/forge` generates production manifest artifacts with route, DI, module, and runtime plugin-lock evidence through `build-manifest`
- `@stratix/core` consumes production manifest artifacts through `discovery.productionManifest`, exposes loaded startup evidence, and can skip application-level runtime glob discovery
- `@stratix/core` registers DI/routes from production manifest source files through `registerFromManifest`
- `@stratix/core` provides Phase 5 observability/security presets: request/trace ids, health, metrics, traces, CORS, headers, body limit, and rate limit
- `@stratix/devtools` exposes production views for routes, DI, plugins, redacted config, health, and traces
- `@stratix/forge` validates release readiness through `stratix release gate --manifest <file>`
- `@stratix/forge` plans monorepo release readiness through `stratix release gate --scope workspace --dry-run`
- Built forge CLI workspace release gate dry-runs pass with and without offline/registry optional checks
- `@stratix/core` unified error envelope and response schema failure normalization tests pass
- `@stratix/testing` contract tests validate shared Stratix error envelope responses
- `@stratix/testing` Phase 4 platform helpers pass test/typecheck/build: test app, DI override, plugin fixture, discovery fixture, module fixture, and rollbackable repository fixture
- All 10 supported public workspace packages compile on the upgraded baseline
- `examples/web-admin-preview` install, build, test, and preview startup

## Failing Signals

- Frozen offline install reproducibility
- Explicit all-package `build:all` still fails at deprecated `@stratix/tasks`
- Exact git tags and npm registry versions remain unreconciled for the current supported package versions
- Peer compatibility warnings around TypeScript 6 / ESLint 10

## Action Focus

1. Execute the real Phase 6 workspace release gate and record which gate blocks release.
2. Restore reproducible offline installation or document unsupported offline release policy.
3. Reconcile exact git tags, npm registry reality, and local package manifest versions.
