# Quality Check Report

- Checked at: 2026-06-26
- Overall status: `REMOTE_CI_PASSED_RELEASE_EVIDENCE_PENDING`

## Current Gate Summary

- Latest remote `Quality Gate` run `28234054546` passed on commit `457357f6e3285afdd7f5ed6f496cdf8962fd0183`.
- Previous failed run `28231936087` missed create/forge `admin-mock` `.env.example.tpl` template files because `.gitignore` ignored `.env.*` and did not allow `.env.example.tpl`.
- Remediation: `.gitignore` allows `.env.example.tpl`; both required template files are included in Git.
- Remote install, build, typecheck, lint, tests, core coverage, packed API smoke, docs, security audit, and release dry-run passed in run `28234054546`.

## Historical Passing Signals

These signals are retained as historical evidence. Latest remote `Quality Gate` run `28234054546` now supports RC-candidate wording.

- Root `CI=true pnpm install --frozen-lockfile`
- Root `CI=true pnpm install --frozen-lockfile --offline`
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
- `@stratix/core` registers DI/routes through `registerFromManifest`, preferring v2 production manifest `compiledFile` entries while keeping v1 source-file compatibility
- `@stratix/core` provides Phase 5 observability/security presets: request/trace ids, health, metrics, traces, CORS, headers, body limit, and rate limit
- `@stratix/devtools` exposes production views for routes, DI, plugins, redacted config, health, and traces
- `@stratix/forge` validates release readiness through `stratix release gate --manifest <file>`
- `@stratix/forge` plans monorepo release readiness through `stratix release gate --scope workspace --dry-run`
- Built forge CLI workspace release gate dry-runs pass with and without offline/registry optional checks
- Built forge CLI workspace release gate execution passes build/test/docs/pack/API and fails only at release-surface before final exact tags are created
- Workspace release gate validates supported package tarballs for package entry files and development-file leakage
- Workspace release gate can validate public npmjs exact-version availability through `--include-registry`
- `@stratix/core` unified error envelope and response schema failure normalization tests pass
- `@stratix/testing` contract tests validate shared Stratix error envelope responses
- `@stratix/testing` Phase 4 platform helpers pass test/typecheck/build: test app, DI override, plugin fixture, discovery fixture, module fixture, and rollbackable repository fixture
- All 10 supported public workspace packages compile on the upgraded baseline
- `examples/web-admin-preview` install, build, test, and preview startup

## Failing Signals

- Exact release tags are not pushed to origin and must point at the final release commit.
- npm publish has not been performed.
- Peer compatibility warnings around TypeScript 6 / ESLint 10 remain non-blocking warnings.

## Release Preconditions

- Remote `Quality Gate` must pass on the latest `1.1.0` commit; run `28234054546` satisfies this for `457357f6e3285afdd7f5ed6f496cdf8962fd0183`.
- Create and push exact git tags for the 10 supported packages on the final Phase 6 release-readiness commit.
- Run `node packages/forge/dist/bin/stratix.js release gate --scope workspace --include-offline-install --include-registry`.
- npm publish requires maintainer credentials and is not performed by the repository refactor.

## Action Focus

1. Ensure exact release tags point at the final release-readiness commit.
2. Push exact release tags to origin.
3. Run full `release:gate` and publish with maintainer credentials.
