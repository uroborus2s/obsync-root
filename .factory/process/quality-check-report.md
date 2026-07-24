# Quality Check Report

- Checked at: 2026-07-24
- Overall status: `BASELINE_CLOSED_RELEASE_OWNER_EVIDENCE_PENDING`

## Current Gate Summary

- Local `pnpm run quality:release` passed after `CR-002`: TypeScript 7 build/typecheck, type-aware Oxlint, 12 supported test tasks, Core 34 files / 263 tests and coverage ratchet, packed/generated API smoke, 89-page docs validation, zero known production vulnerabilities, and 10-package release dry-run all completed.
- Root and preview `CI=true pnpm install --frozen-lockfile` both passed with refreshed lockfiles.
- Active package manifests, lockfiles, configs, scripts, templates, and preview files contain no ESLint dependency/configuration surface; all direct TypeScript declarations use `7.0.2`.
- Latest remote `Quality Gate` run `28234054546` passed on commit `457357f6e3285afdd7f5ed6f496cdf8962fd0183`.
- Previous failed run `28231936087` missed create/forge `admin-mock` `.env.example.tpl` template files because `.gitignore` ignored `.env.*` and did not allow `.env.example.tpl`.
- Remediation: `.gitignore` allows `.env.example.tpl`; both required template files are included in Git.
- Remote install, build, typecheck, lint, tests, core coverage, packed API smoke, docs, security audit, and release dry-run passed in run `28234054546`.
- Local docs-stratego validation passed after TASK-001 documentation closure: 89 pages / 0 contracts.

## Historical Passing Signals

These signals are retained as historical evidence. Latest remote `Quality Gate` run `28234054546` now supports RC-candidate wording.

- Root `CI=true pnpm install --frozen-lockfile`
- Root `CI=true pnpm install --frozen-lockfile --offline`
- Root `pnpm build` through `build:supported`
- Root `pnpm test` through `test:supported`
- `pnpm run build:supported` passed across 10 supported packages
- `pnpm run test:supported` passed across 12 turbo tasks
- `/opt/homebrew/Cellar/uv/0.9.18/bin/uvx --from docs-stratego docs-stratego source validate --repo-path .` passed, 89 pages / 0 contracts
- Core, forge, and devtools package tarballs can be produced under `/tmp`
- Preview sample `CI=true pnpm install --frozen-lockfile`
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
- Remote CI has not yet run against the local TypeScript 7 and Oxlint migration commit.

## Release Preconditions

- Remote `Quality Gate` must pass on the latest `1.1.0` commit; run `28234054546` satisfies this for `457357f6e3285afdd7f5ed6f496cdf8962fd0183`.
- Create and push exact git tags for the 10 supported packages on the final Phase 6 release-readiness commit.
- Run `node packages/forge/dist/bin/stratix.js release gate --scope workspace --include-offline-install --include-registry`.
- npm publish requires maintainer credentials and is not performed by the repository refactor.

## Action Focus

1. Ensure exact release tags point at the final release-readiness commit.
2. Push exact release tags to origin.
3. Run full `release:gate` and publish with maintainer credentials.
