# Current State

- Snapshot date: 2026-06-26
- Recommended software-factory stage: `PHASE_6_DEVELOPMENT_HARDENING_RELEASE_DEFERRED`
- Repository type: historical Stratix source monorepo
- Toolchain baseline:
  - Node `24.14.1`
  - pnpm `10.33.0`
  - TypeScript `6.0.3`
- Workspace reality:
  - 10 public `@stratix/*` packages
  - 0 workspace apps
  - 1 non-workspace preview sample at `examples/web-admin-preview`
  - `@stratix/utils` and `@stratix/tasks` removed from the current workspace; shared utility APIs are owned by `@stratix/core/utils`
- 2026-06-26 remote Quality Gate status:
  - GitHub Actions run `28231936087` failed in `Test supported packages` before local remediation.
  - Failed task: `@stratix/forge#test`.
  - Root cause: create/forge `admin-mock` preset `.env.example.tpl` template files existed locally but were ignored by `.gitignore` and were not present in remote checkout.
  - Local remediation: `.gitignore` now allows `.env.example.tpl`; both admin-mock template files must be tracked in Git.
  - Local verification after remediation: `CI=true COREPACK_HOME=/private/tmp/corepack npm_config_cache=/private/tmp/npm-cache npm_config_devdir=/private/tmp/node-gyp UV_CACHE_DIR=/private/tmp/uv-cache UV_TOOL_DIR=/private/tmp/uv-tools corepack pnpm run quality:release` passed.
  - Release status: not RC/GA until the remote Quality Gate reruns green on the remediation commit.
- Stable docs were missing before this baseline; `docs/`, `.factory/`, `AGENTS.md`, `GEMINI.md` are now present.
- Developer guides now include beginner-oriented paths for backend apps, plugins, and the create/forge scaffold model.
- `@stratix/database` has started a database-only clean breaking refactor: `DatabaseAPI` was removed from the package, module-level database manager/global connection helpers were removed, and `BaseRepository` now requires an explicit `DatabaseConnectionProvider`.
- `@stratix/core` has completed a package-level breaking discovery refactor: application discovery is now driven by `config.discovery` and `ApplicationDiscoveryPipeline`, while old application-level discovery entry points were removed from the root export surface.
- Phase 1 of the Core concept-model evolution is implemented: `executor` has been removed from `@stratix/core` decorators, metadata, discovery, plugin registration, public exports, and from create/forge generator/template surfaces without compatibility adapters.
- Phase 2 foundation is implemented: `@stratix/core` exposes route contract extraction, route contract validation, OpenAPI document generation, DI graph creation, DI diagnostics, and discovery-time DI metadata recording; `@stratix/forge` exposes `stratix doctor di` and `stratix di graph`.
- Phase 2 extended contract-first workflow is implemented: `@stratix/forge` exposes dependency-free `stratix openapi generate` and `stratix openapi client` with response types, path/query/body/header parameters, auth provider, and request/response hooks; generated controller templates include explicit route schema/operationId/response schema, `@stratix/testing` exposes runner-neutral `contractTest()`, and `@stratix/core` exposes plugin adapter token diagnostics, unified error envelope schema/factory, and strict response-schema failure normalization.
- Phase 3 module governance tooling is implemented: `stratix generate module` writes `module.yaml` plus standard module directories, `stratix doctor modules` validates module manifests/layers/boundaries/cycles, and `stratix graph modules` outputs module -> token -> route -> dependency graphs without changing application runtime startup behavior.
- Phase 4 testing platform baseline is implemented: `@stratix/testing` exposes `createTestApp()`, `createTestContainer()`, `overrideToken()`, `mockPlugin()`, `disablePlugin()`, `createDiscoveryFixture()`, `createRepositoryFixture()`, and `createModuleFixture()` alongside the existing `contractTest()` DSL.
- Plugin manifest and production manifest baselines are implemented: `@stratix/create` writes `.stratix/plugin.json` for plugin projects; `@stratix/forge` exposes `stratix doctor plugins`, `stratix graph plugins`, and `stratix build-manifest` for manifest validation, plugin topology, and CI production artifact generation.
- Phase 5 production baseline is implemented: `@stratix/core` accepts `discovery.productionManifest`, loads and validates `.stratix/production-manifest.json`, exposes the loaded artifact on the application instance, can skip application-level runtime glob discovery when `skipRuntimeDiscovery` is true, can register DI/routes from manifest entries when `registerFromManifest` is true, and provides `observability` / `security` presets. P2 v2 manifests prefer `compiledFile`; v1 manifests remain source-file compatible.
- `@stratix/devtools` exposes Phase 5 production views for routes, DI, plugins, redacted config, health, and traces.
- `@stratix/forge` exposes `stratix release gate` for production manifest release checks and `stratix release gate --scope workspace` for monorepo release-readiness planning.
- `@stratix/tasks` has been physically removed from the workspace and create/forge preset templates; it is no longer a package, preset, release-surface entry, or publish candidate.
- Phase 6 workspace release gate exists and has historical local passing evidence, but the active 2026-06-20 work mode is development hardening with release work deferred until all local code, test, documentation, and defect items are closed.
- Root release gating is now tightened so `release` must pass supported build, supported typecheck, supported test, core coverage ratchet, docs validation, security audit, release gate dry-run, and offline workspace release gate before `changeset publish`.
- GitHub Actions CI has a `Quality Gate` workflow for PRs and pushes to `main` / `1.1.0`; it installs with pnpm and runs the supported build/typecheck/test/coverage/docs/security gates plus workspace release gate dry-run. The latest known remote run failed before remediation and must be rerun after the `.env.example.tpl` tracking fix.
- 2026-06-20 review-thread remediation completed batch 1 and batch 2 locally:
  release gating, CI lint enforcement, deprecated preset blocking, generator
  overwrite protection, scaffolded secret handling, OSSP/WAS placeholder
  validation, default `.stratix` production-manifest root resolution, root
  `HttpError` export, AutoDI fail-fast, `close()` lifecycle parity, and strict
  `compiledOnly` production-manifest validation are implemented with targeted
  tests.
- 2026-06-20 problem 3 / problem 4 remediation is implemented locally:
  root `@stratix/core` is narrowed to stable application APIs while
  plugin-author, contract, diagnostics, experimental, service, and internal APIs
  are exposed through explicit package subpaths. Supported ecosystem packages,
  generated plugin templates no longer import plugin/DI runtime APIs from the
  root entrypoint. `ApplicationBootstrap`
  request identity handling is extracted into `request-identity`, observability
  response headers and injected request-scope `requestId` now share one source,
  AutoDI strict mode rejects anonymous plugin functions, DI graph nodes expose
  `confidence`, and route contract extraction accepts runtime prefixes for
  OpenAPI parity.
- 2026-06-20 development-stage hardening after problem 3 / problem 4 is implemented locally:
  `ApplicationBootstrap` no longer inlines error handling, request context,
  plugin load ordering, eager initialization, lifecycle shutdown, observability,
  or security hook installers. `@stratix/core/internal` is an explicit whitelist,
  config schema no longer uses `z.any()` / `catchall(z.any())`, typed `autoLoad`
  / provider / plugin function configuration is validated, exported package
  subpath files are included in the workspace tarball gate, AutoDI strict mode has
  both negative and positive tests, trace/request id propagation and route-prefix
  normalization are covered, and packed `@stratix/core` tarball API smoke now
  imports all documented subpaths from a temporary consumer project.
- Closed-door review scoring now uses fixed rubric
  `core-rc-remediation-v1`: the 2026-06-19 baseline composite risk score was
  82/100; after batch 1 and 2 local remediation the post-remediation evidence
  score is technical management 90, test management 82, framework architecture
  88, composite 87/100. This is separate from the supported release-gate score
  and may only change when executable evidence or scope changes.
- `@stratix/core` P1 registration-model convergence is implemented in a compatible first stage: application discovery and plugin AutoDI now emit a shared `RegistrationPlan` schema, DI graph nodes and missing-dependency diagnostics carry plan metadata, application DI tokens and plugin adapter root tokens use the plan token registrar, plugin internal tokens/routes/lifecycle are recorded into the plugin plan, and new `experimental` root namespace exposes plan helpers without adding stable root-level helper names.
- `@stratix/core` / `@stratix/forge` P2 production-manifest v2 baseline is implemented: forge `build-manifest` now emits schemaVersion 2 with generator/runtime metadata, app `RegistrationPlan` snapshot, source artifact hashes, optional compiled artifact hashes, and v1-compatible routes/DI projections; forge release gate verifies v2 artifact integrity; core loads v1/v2 manifests, validates v2 hashes in strict mode, and prefers v2 compiled files for manifest-driven registration so strict production startup does not fall back to implicit runtime glob discovery.
- P2+ production hardening is implemented locally: `@stratix/core` observability/security now supports metrics/tracing providers, health contributors, readiness/liveness split, and rate-limit provider decisions; `@stratix/forge doctor plugins` now statically compares manifest `provides` against discovered adapter tokens and reports stale or missing adapter declarations.
- Historical local production-grade score was `95/100` for the supported 1.1.x release scope after P0/P1/P2/P2+ fixes. That score is not the active development-stage score and must not be reused as a GA/release claim until the current hardening batch is fully verified and the remote Quality Gate is green. It is also not a claim that global core coverage is 95% or that remote CI/npm publish evidence already exists.
- `@stratix/core` now has minimum runtime stability coverage for concurrent request-scoped route execution, concurrent CLI app start/stop, and repeated lifecycle shutdown handlers; this is a CI-safe regression suite, not a hard latency benchmark.
- `ApplicationBootstrap` no longer owns the application discovery / production-manifest registration branch directly; `ApplicationDiscoveryRegistrar` owns that orchestration while bootstrap keeps lifecycle ordering.
- The toolchain split is implemented: `@stratix/create` owns app/plugin creation, `@stratix/forge` owns project-local generate/doctor/di/openapi/start/config workflows, and neither package depends on `@stratix/core`.
- The physical source directory for `@stratix/forge` is now `packages/forge`; `packages/cli` is not retained as a compatibility directory.
- `.stratix/project.json` is now the create/forge handoff contract at `schemaVersion: 2`; create writes the template contribution snapshot, allowed presets, and managed files mode, while forge reads the manifest/presets/resource templates instead of app/plugin creation templates.

## Verified Facts

- Root and preview-sample lockfiles were refreshed after the dependency upgrade.
- `pnpm-lock.yaml` uses the `packages/forge` importer for `@stratix/forge`.
- 2026-06-23 `@stratix/tasks` was physically removed:
  - `packages/tasks` source tree deleted
  - create/forge `templates/presets/tasks` deleted
  - root supported build/lint/test scripts no longer carry a tasks exclusion filter
  - `pnpm-lock.yaml` no longer contains a `packages/tasks` importer or `@stratix/tasks` dependency
  - `pnpm list --depth -1 --filter './packages/*'` reports 10 public workspace packages and no `@stratix/tasks`
- `CI=true pnpm install --frozen-lockfile --ignore-scripts` passes after removing `packages/utils` from the workspace lockfile.
- Root `CI=true pnpm install --frozen-lockfile` passes on pnpm `10.33.0`.
- Preview sample `CI=true pnpm install --ignore-workspace --frozen-lockfile` passes.
- Root `pnpm build` delegates to `build:supported` and now covers every remaining workspace package.
- Root `pnpm build:supported` passes across the 10 remaining workspace packages.
- Root `pnpm lint` delegates to `lint:supported` and passes:
  - 11 supported lint tasks
  - 2026-06-20 rerun passed after supported-package Prettier errors were fixed;
    remaining `no-console` findings are warnings and do not fail the lint gate
- Root `pnpm test` delegates to `test:supported` and passes for the remaining workspace packages.
- Root `pnpm test:supported` passes across supported packages:
  - 12 successful turbo tasks
- Root `pnpm run typecheck:supported` is the supported package typecheck gate:
  - explicitly enumerates the 10 public workspace packages
- Root `pnpm run docs:validate` is the docs validation gate:
  - delegates to `node scripts/docs-validate.mjs`
  - the wrapper runs `docs-stratego source validate --repo-path .` through existing `uvx`/`uv`, or through a temporary `/tmp` uv runtime when `uvx` is absent
- `@stratix/forge` project/workspace release gate docs checks now delegate to `pnpm run docs:validate` instead of invoking `uvx` directly, so release and development docs validation use the same entrypoint.
- Root `pnpm run quality:release` requires supported build/typecheck/lint/test, core coverage ratchet, packed core API smoke, docs validation, security audit, and release gate dry-run.
  - 2026-06-20 development-stage rerun passed after bootstrap/API/docs hardening.
  - Verified results: 10 supported build tasks, supported typecheck, 11 supported lint tasks, 12 supported test tasks, core coverage ratchet at 34 files / 261 tests, packed core API smoke, 87 docs pages / 0 contracts, no high production audit vulnerabilities, and workspace release gate dry-run passed.
  - This is local dry-run quality evidence; remote CI must be rerun after the 2026-06-26 P0 template tracking fix, while registry reconciliation release gate execution, npm publish, and release notes remain final release-stage work.
- Root `pnpm run release` requires `quality:release`, offline+registry workspace `release:gate`, and then `changeset publish`.
- Root `pnpm run release:gate` includes `--include-offline-install --include-registry`; registry reconciliation is no longer optional for the real local release gate.
- `.github/workflows/quality-gate.yml` defines PR and `main` / `1.1.0` push CI for install, supported build, supported typecheck, supported lint, supported test, core coverage ratchet, docs validation, security audit, and release gate dry-run; run `28231936087` failed before local remediation because untracked `.env.example.tpl` templates were absent from remote checkout.
- Root `pnpm run release:gate:dry-run` passes for the 10 remaining public workspace packages and planned build/test/docs/security/pack/api/release-surface checks.
- Root `pnpm run release:gate` passes with elevated local cache access:
  - offline install, supported build/test, docs, security audit, pack, API surface, release-surface, exact tag, and registry reconciliation checks passed
  - all 10 supported package tarball artifacts validated
  - public npmjs reports all 10 supported exact versions as unpublished and available
- 2026-06-23 post-`@stratix/tasks` removal gates pass:
  - `pnpm --filter @stratix/create test`: 5 tests, including removed tasks preset rejection
  - `pnpm --filter @stratix/forge test`: 54 tests
  - `pnpm --filter @stratix/create exec tsc -p tsconfig.json --noEmit`: passed
  - `pnpm --filter @stratix/forge exec tsc -p tsconfig.json --noEmit`: passed
  - `pnpm run quality:release`: passed; dry-run supported packages list contains the 10 remaining public packages and no tasks exclusion
  - `pnpm run release:gate`: passed; offline install, build/test/docs/security/pack/API/release-surface/registry all passed for 10 packages
- Root `CI=true pnpm install --frozen-lockfile --offline` passes on the current pnpm store:
  - Lockfile is up to date
  - Already up to date
- `pnpm --filter @stratix/core build` passes after the breaking application discovery refactor and unified error envelope work.
- `pnpm --filter @stratix/core exec tsc -p tsconfig.json --noEmit` passes.
- 2026-06-20 core remediation targeted tests pass:
  - `pnpm --filter @stratix/core exec vitest run src/__tests__/public-api-contract.test.ts`: 5 tests
  - `pnpm --filter @stratix/core exec vitest run src/bootstrap/__tests__/application-runtime-stability.test.ts`: 5 tests
  - `pnpm --filter @stratix/core exec vitest run src/plugin/__tests__/auto-di-plugin.test.ts`: 5 tests
  - `pnpm --filter @stratix/core exec vitest run src/contracts/__tests__/route-contract.test.ts`: 4 tests
  - `pnpm --filter @stratix/core exec vitest run src/diagnostics/__tests__/di.test.ts`: 1 test
  - `pnpm --filter @stratix/core exec vitest run src/discovery/__tests__/production-manifest.test.ts`: 7 tests
  - `pnpm --filter @stratix/core exec vitest run src/bootstrap/__tests__/application-discovery-bootstrap.test.ts`: 18 tests
  - `pnpm --filter @stratix/core exec vitest run src/bootstrap/__tests__/config-validation.test.ts`: 8 tests
- `CI=true pnpm --filter @stratix/core exec vitest run` passes after production manifest strict registration, late controller registration hardening, security default hardening, P1 RegistrationPlan convergence, P2 production-manifest v2 integrity/compiled-file registration, runtime stability coverage, and development-stage bootstrap decomposition:
  - 34 test files
  - 261 tests
- `pnpm run test:coverage:core` passes after the development-stage bootstrap decomposition:
  - 34 test files
  - 261 tests
  - global lines `47.14%`
  - global functions `41.36%`
  - global branches `38.87%`
  - global statements `46.32%`
  - `src/bootstrap/application-bootstrap.ts` lines `75.65%`, functions `96.07%`, branches `55.33%`, statements `75.73%`
  - bootstrap/discovery critical paths use higher targeted thresholds
  - these values are current executable ratchet facts, not 95+ global coverage
- `pnpm run smoke:core-api` passes:
  - builds `@stratix/core`
  - packs the tarball
  - installs it into a temporary consumer project
  - imports root, `./auth`, `./context`, `./contracts`, `./data`, `./diagnostics`, `./environment`, `./internal`, `./logger`, `./plugin`, and `./service`
  - starts and stops a minimal CLI Stratix application
  - this smoke found and fixed a real package defect: `pino-pretty` is now a runtime dependency because the default development logger transport loads it
- 2026-06-19 closed-door `@stratix/core` review completed with three-role
  subagent scoring: senior technical manager 87, senior test manager 72,
  senior framework architect 86, composite 83/100. Recommendation is RC /
  controlled release until release gates, production security defaults, coverage
  policy, public API boundaries, and production manifest integrity are hardened.
- 2026-06-19 current three-role `@stratix/core` subagent review completed after
  P2+ hardening evidence was rechecked: senior technical manager 87, senior test
  manager 74, senior framework architect 84, composite risk score 82/100. Main
  conclusion remains RC / controlled release, not high-confidence GA. Additional
  P1 risks identified: root `release:gate` does not force registry
  reconciliation, CI lacks lint/pack install smoke, root public API is too wide,
  `HttpError` is not exported as a public error API, plugin AutoDI registration
  errors do not fully fail fast, `close()` and `stop()` lifecycle semantics
  differ, and production manifest v2 still allows source fallback in strict
  mode.
- `@stratix/core` now exports `ERROR_ENVELOPE_SCHEMA` and `createErrorEnvelope()`; bootstrap error handling uses the shared envelope for `HttpError`, validation errors, 404, and response schema serialization failures.
- `@stratix/core` now accepts `discovery.productionManifest`; bootstrap can load/validate `.stratix/production-manifest.json`, expose the loaded artifact, fail fast on invalid strict manifests, skip application-level runtime glob discovery, and register DI/routes from v2 `compiledFile` manifest entries or v1 source-file entries when configured.
- `@stratix/core` now accepts `observability` and `security`; bootstrap can expose request/trace ids, health/readiness/liveness, metrics, traces, metrics/tracing providers, health contributors, CORS, security headers, body limit, in-memory rate limit, and provider-backed rate-limit decisions.
- `pnpm --filter @stratix/create test` passes:
  - 2026-06-20 targeted suite: 6 tests, including deprecated preset blocking and flat environment-variable mapping
- `pnpm --filter @stratix/create exec tsc -p tsconfig.json --noEmit` passes.
- `pnpm --filter @stratix/create run build` passes.
- `pnpm --filter @stratix/forge test` passes:
- `pnpm --filter @stratix/forge exec tsx --test tests/run-cli.test.ts` passes:
  - 2026-06-20 targeted suite: 54 tests, including generated resource overwrite protection with `--force` and release gate docs check delegation
- `pnpm --filter @stratix/forge exec tsc -p tsconfig.json --noEmit` passes.
- `pnpm --filter @stratix/forge run build` passes after advanced typed client generation support.
- `pnpm --filter @stratix/devtools test` passes:
  - 3 tests
- `pnpm --filter @stratix/devtools exec tsc -p tsconfig.json --noEmit` passes.
- `pnpm --filter @stratix/testing test` passes:
  - 3 test files
  - 12 tests
- `pnpm --filter @stratix/testing exec tsc -p tsconfig.json --noEmit` passes.
- `pnpm --filter @stratix/testing build` passes after Phase 4 testing platform helpers.
- `node packages/create/dist/bin/create-stratix.js --help` passes.
- `node packages/create/dist/bin/create-stratix.js list templates` passes.
- `node packages/forge/dist/bin/stratix.js --help` passes and no longer lists `init`.
- `node packages/forge/dist/bin/stratix.js init` fails with `Unknown command: init`, which is the expected forge behavior.
- `node packages/forge/dist/bin/stratix.js doctor di --help` passes.
- `node packages/forge/dist/bin/stratix.js di graph --help` passes.
- `node packages/forge/dist/bin/stratix.js doctor modules --help` passes.
- `node packages/forge/dist/bin/stratix.js graph modules --help` passes.
- `@stratix/forge` now exposes plugin manifest governance and production manifest artifact generation through source-tested commands:
  - `stratix doctor plugins`
  - `stratix graph plugins --format json|mermaid`
  - `stratix build-manifest --output <file>`
  - `stratix release gate --manifest <file>`
  - `stratix release gate --scope workspace`
- Built `@stratix/forge` CLI workspace release gate dry-runs pass:
  - `node packages/forge/dist/bin/stratix.js release gate --scope workspace --dry-run`
  - `node packages/forge/dist/bin/stratix.js release gate --scope workspace --dry-run --include-offline-install --include-registry`
- Built `@stratix/forge` CLI workspace release gate execution passes with offline install:
  - `node packages/forge/dist/bin/stratix.js release gate --scope workspace --include-offline-install`
  - passed offline install, supported build/test, docs, security audit, pack, API surface, package metadata release-surface, and exact tag presence checks
- Built `@stratix/forge` CLI full workspace release gate passes with registry reconciliation:
  - `node packages/forge/dist/bin/stratix.js release gate --scope workspace --include-offline-install --include-registry`
  - public npmjs reports all 10 supported exact versions as unpublished and available
- Workspace release gate `pack` now validates every supported tarball for package entry files and development-file leakage.
- Workspace release gate `release-surface` now validates every supported public package for description, keywords, license, `publishConfig.access: public`, and exact release tags.
- Workspace release gate `registry` checks public npmjs exact package versions with an isolated npm cache; 404 means a version is available for release, while an already published exact version fails the gate.
- `node packages/forge/dist/bin/stratix.js openapi generate --help` passes.
- `node packages/forge/dist/bin/stratix.js openapi client --help` passes.
- `rg -n "generateOpenApiDocument|from '@stratix/core'|from \"@stratix/core\"|@stratix/core" packages/forge/src/commands/openapi packages/forge/tests/stubs/stratix-core.stub.ts packages/forge/package.json` returns no matches; the OpenAPI forge command path is not coupled to core.
- `pnpm --filter @stratix/core pack --pack-destination /tmp` passes and produces `/tmp/stratix-core-1.1.0.tgz`.
- `rg -n "Executor|executor|EXECUTOR|@Executor|registerTaskExecutor|registerExecutorDomain|TaskExecutor|executorModules|executorConfigs" packages/core/src packages/forge/src packages/forge/templates packages/create/src packages/create/templates -g '!**/__tests__/**' -g '!**/*.test.ts' -g '!**/*.spec.ts'` returns no production matches.
- `rg --files packages/core/src packages/core/dist packages/forge/templates packages/create/templates | rg -i 'executor'` returns no path matches.
- `tar -tf /tmp/stratix-core-1.1.0.tgz | rg -i 'executor'` returns no path matches.
- `pnpm run docs:validate` passes:
  - 87 pages
  - 0 contracts
- `rg -n "@Executor|EXECUTOR_METADATA_KEY|registerTaskExecutor|registerExecutorDomain|processExecutorRegistration|Executor\\b|executors/|plugin-executor|performApplicationAutoDI|applicationAutoDI|discoverAndProcessApplicationModules|generate executor|createSafeExecutor|executor" docs/03-developer-guide -g '*.md'` returns no matches; developer guides no longer teach removed executor APIs or paths.
- `git diff --check` passes after Phase 2 docs synchronization.
- Core concept-model evolution docs record the startup/discovery/DI flow, breaking removal of `executor` from `@stratix/core` without compatibility adapters, `@stratix/tasks` removal, Module as a code-project governance boundary, `@stratix/testing` as a first-class independent testing platform, and the production-grade roadmap for Contract-first APIs, DI diagnostics, create/forge tooling, observability, security, plugin manifest, production manifest, DevTools, and 95+ quality gates.
- `@stratix/create` and `@stratix/forge` can build and run their help/list smoke paths on the Node 24 baseline.
- `pnpm --filter @stratix/forge pack --pack-destination /tmp` passes; forge now only retains `templates/resources` and `templates/presets`.
- `@stratix/devtools`, `@stratix/testing`, and `@stratix/was-v7` package manifests/build scripts now satisfy the Phase 6 pack artifact gate.
- `examples/web-admin-preview` can install independently, build, test, and preview on the upgraded frontend stack.
- `pnpm --filter @stratix/database build` passes after the database-only clean breaking refactor.
- `pnpm --filter @stratix/database exec vitest run` passes after the database quality-gate refactor:
  - 8 test files
  - 49 tests
- `pnpm --filter @stratix/database lint` passes after the workspace ESLint 10 flat-config parser wiring fix.
- `pnpm --filter @stratix/was-v7 test` passes:
  - 11 test files
  - 120 tests
- 2026-06-20 plugin credential validation targeted tests pass:
  - `pnpm --filter @stratix/ossp exec vitest run src/__tests__/plugin-validation.test.ts`: 5 tests
  - `pnpm --filter @stratix/was-v7 exec vitest run src/__tests__/plugin-validation.test.ts`: 21 tests
- `@stratix/devtools`, `@stratix/ossp`, `@stratix/queue`, and `@stratix/testing` now have smoke tests so the supported root test profile is not broken by no-test packages.
- The upgraded toolchain still emits peer warnings because `@typescript-eslint` does not yet declare TypeScript 6 support and `eslint-plugin-import` does not yet declare ESLint 10 support.

## Release Surface

- Public npmjs verification on 2026-06-19 found all 10 supported exact versions are not published and available:
  - `@stratix/core@1.1.0`
  - `@stratix/create@1.1.0`
  - `@stratix/database@1.1.0`
  - `@stratix/devtools@1.0.0-beta.1`
  - `@stratix/forge@1.1.0`
  - `@stratix/ossp@0.0.1-beta.3`
  - `@stratix/queue@1.0.0-beta.2`
  - `@stratix/redis@1.0.0-beta.2`
  - `@stratix/testing@1.0.0-beta.1`
  - `@stratix/was-v7@1.0.0-beta.36`
- Phase 6 exact release tags are present for the 10 supported packages.
- `@stratix/tasks` is physically removed from source, workspace discovery, presets, and release/publish gates.

## Immediate Priorities

1. Finish local development hardening and rerun the fixed three-role rubric with only changed executable evidence.
2. Remaining development-stage risk areas are public-subpath coverage depth, longer reliability/performance regression suites, and any further bootstrap decomposition beyond the new request/observability/security split.
3. Release-stage evidence is intentionally deferred until local development issues are closed: remote GitHub Actions quality-gate rerun on the remediation commit, npm publish with maintainer credentials, pushed exact release tags, and final release notes/GA wording.

## Canonical Detailed Report

- `docs/04-project-development/02-discovery/current-state-analysis.md`
- `docs/04-project-development/02-discovery/core-framework-review-report.md`
- `docs/04-project-development/02-discovery/core-closed-door-review-20260619.md`
- `docs/04-project-development/02-discovery/core-closed-door-review-20260619-subagent-current.md`
- `docs/04-project-development/02-discovery/database-plugin-review-report.md`
- `.factory/workitems/changes/CR-CORE-20260620-review-remediation-batches.md`
