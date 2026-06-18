# Current State

- Snapshot date: 2026-06-18
- Recommended software-factory stage: `ANALYSIS`
- Repository type: historical Stratix source monorepo
- Toolchain baseline:
  - Node `24.14.1`
  - pnpm `10.33.0`
  - TypeScript `6.0.2`
- Workspace reality:
  - 11 public `@stratix/*` packages
  - 0 workspace apps
  - 1 non-workspace preview sample at `examples/web-admin-preview`
  - `@stratix/utils` removed from the current workspace; shared utility APIs are owned by `@stratix/core/utils`
- Stable docs were missing before this baseline; `docs/`, `.factory/`, `AGENTS.md`, `GEMINI.md` are now present.
- Developer guides now include beginner-oriented paths for backend apps, plugins, and the create/forge scaffold model.
- `@stratix/database` has started a database-only clean breaking refactor: `DatabaseAPI` was removed from the package, module-level database manager/global connection helpers were removed, and `BaseRepository` now requires an explicit `DatabaseConnectionProvider`.
- `@stratix/core` has completed a package-level breaking discovery refactor: application discovery is now driven by `config.discovery` and `ApplicationDiscoveryPipeline`, while old application-level discovery entry points were removed from the root export surface.
- Phase 1 of the Core concept-model evolution is implemented: `executor` has been removed from `@stratix/core` decorators, metadata, discovery, plugin registration, public exports, and from create/forge generator/template surfaces without compatibility adapters.
- Phase 2 foundation is implemented: `@stratix/core` exposes route contract extraction, route contract validation, OpenAPI document generation, DI graph creation, DI diagnostics, and discovery-time DI metadata recording; `@stratix/forge` exposes `stratix doctor di` and `stratix di graph`.
- Phase 2 extended contract-first workflow is implemented: `@stratix/forge` exposes dependency-free `stratix openapi generate` and `stratix openapi client` with response types, path/query/body/header parameters, auth provider, and request/response hooks; generated controller templates include explicit route schema/operationId/response schema, `@stratix/testing` exposes runner-neutral `contractTest()`, and `@stratix/core` exposes plugin adapter token diagnostics, unified error envelope schema/factory, and strict response-schema failure normalization.
- Phase 3 module governance tooling is implemented: `stratix generate module` writes `module.yaml` plus standard module directories, `stratix doctor modules` validates module manifests/layers/boundaries/cycles, and `stratix graph modules` outputs module -> token -> route -> dependency graphs without changing application runtime startup behavior.
- Phase 4 testing platform baseline is implemented: `@stratix/testing` exposes `createTestApp()`, `createTestContainer()`, `overrideToken()`, `mockPlugin()`, `disablePlugin()`, `createDiscoveryFixture()`, `createRepositoryFixture()`, and `createModuleFixture()` alongside the existing `contractTest()` DSL.
- The toolchain split is implemented: `@stratix/create` owns app/plugin creation, `@stratix/forge` owns project-local generate/doctor/di/openapi/start/config workflows, and neither package depends on `@stratix/core`.
- The physical source directory for `@stratix/forge` is now `packages/forge`; `packages/cli` is not retained as a compatibility directory.
- `.stratix/project.json` is now the create/forge handoff contract at `schemaVersion: 2`; create writes the template contribution snapshot, allowed presets, and managed files mode, while forge reads the manifest/presets/resource templates instead of app/plugin creation templates.

## Verified Facts

- Root and preview-sample lockfiles were refreshed after the dependency upgrade.
- `pnpm-lock.yaml` uses the `packages/forge` importer for `@stratix/forge`.
- `CI=true pnpm install --frozen-lockfile --ignore-scripts` passes after removing `packages/utils` from the workspace lockfile.
- Root `CI=true pnpm install --frozen-lockfile` passes on pnpm `10.33.0`.
- Preview sample `CI=true pnpm install --ignore-workspace --frozen-lockfile` passes.
- Root `pnpm build` delegates to `build:supported` and passes for supported packages with `@stratix/tasks` excluded.
- Root `pnpm build:supported` passes:
  - 10 supported packages
  - `@stratix/tasks` explicitly excluded
- Explicit all-package `pnpm build:all` is still expected to fail at `@stratix/tasks` until that deprecated package is migrated or removed:
  - `@stratix/tasks` still imports the removed `DatabaseAPI`
  - `@stratix/tasks` still calls the old `BaseRepository` constructor shape
- Root `pnpm test` delegates to `test:supported` and passes for supported packages with `@stratix/tasks` excluded.
- Root `pnpm test:supported` passes across supported packages:
  - 12 successful turbo tasks
- `pnpm --filter @stratix/core build` passes after the breaking application discovery refactor and unified error envelope work.
- `pnpm --filter @stratix/core exec tsc -p tsconfig.json --noEmit` passes.
- `CI=true pnpm --filter @stratix/core exec vitest run` passes after Phase 2 extended work:
  - 27 test files
  - 188 tests
- `@stratix/core` now exports `ERROR_ENVELOPE_SCHEMA` and `createErrorEnvelope()`; bootstrap error handling uses the shared envelope for `HttpError`, validation errors, 404, and response schema serialization failures.
- `pnpm --filter @stratix/create test` passes:
  - 2 tests
- `pnpm --filter @stratix/create exec tsc -p tsconfig.json --noEmit` passes.
- `pnpm --filter @stratix/create run build` passes.
- `pnpm --filter @stratix/forge test` passes:
  - 34 tests
- `pnpm --filter @stratix/forge exec tsc -p tsconfig.json --noEmit` passes.
- `pnpm --filter @stratix/forge run build` passes after advanced typed client generation support.
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
- `node packages/forge/dist/bin/stratix.js openapi generate --help` passes.
- `node packages/forge/dist/bin/stratix.js openapi client --help` passes.
- `rg -n "generateOpenApiDocument|from '@stratix/core'|from \"@stratix/core\"|@stratix/core" packages/forge/src/commands/openapi packages/forge/tests/stubs/stratix-core.stub.ts packages/forge/package.json` returns no matches; the OpenAPI forge command path is not coupled to core.
- `pnpm --filter @stratix/core pack --pack-destination /tmp` passes and produces `/tmp/stratix-core-1.1.0.tgz`.
- `rg -n "Executor|executor|EXECUTOR|@Executor|registerTaskExecutor|registerExecutorDomain|TaskExecutor|executorModules|executorConfigs" packages/core/src packages/forge/src packages/forge/templates packages/create/src packages/create/templates -g '!**/__tests__/**' -g '!**/*.test.ts' -g '!**/*.spec.ts'` returns no production matches.
- `rg --files packages/core/src packages/core/dist packages/forge/templates packages/create/templates | rg -i 'executor'` returns no path matches.
- `tar -tf /tmp/stratix-core-1.1.0.tgz | rg -i 'executor'` returns no path matches.
- `uvx --from docs-stratego docs-stratego source validate --repo-path .` passes:
  - 84 pages
  - 0 contracts
- `rg -n "@Executor|EXECUTOR_METADATA_KEY|registerTaskExecutor|registerExecutorDomain|processExecutorRegistration|Executor\\b|executors/|plugin-executor|performApplicationAutoDI|applicationAutoDI|discoverAndProcessApplicationModules|generate executor|createSafeExecutor|executor" docs/03-developer-guide -g '*.md'` returns no matches; developer guides no longer teach removed executor APIs or paths.
- `git diff --check` passes after Phase 2 docs synchronization.
- Core concept-model evolution docs now record the complete evolution plan: current startup/discovery/DI flow, breaking removal of `executor` from `@stratix/core` without compatibility adapters, frozen/deprecated `@stratix/tasks` status, Module as a code-project governance boundary, `@stratix/testing` as a first-class independent testing platform, and the production-grade roadmap for Contract-first APIs, DI diagnostics, create/forge tooling, observability, security, plugin manifest, production manifest, DevTools, and 95+ quality gates.
- `@stratix/create` and `@stratix/forge` can build and run their help/list smoke paths on the Node 24 baseline.
- `pnpm --filter @stratix/forge pack --pack-destination /tmp` passes and the tarball excludes `templates/apps` and `templates/plugins`.
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

1. Continue with Plugin manifest, Production manifest, and Phase 5 production capability design.
2. Restore reproducible offline installation.
3. Reconcile manifest versions, git tags, and npm registry reality.
4. Decide whether `@stratix/tasks` remains permanently deprecated or is removed from the workspace surface.
5. Explicitly approve or defer physical deletion of obsolete create-only template directories still present under `packages/forge/templates/apps` and `packages/forge/templates/plugins`; they are no longer read by forge code or shipped in the forge package.

## Canonical Detailed Report

- `docs/04-project-development/02-discovery/current-state-analysis.md`
- `docs/04-project-development/02-discovery/core-framework-review-report.md`
- `docs/04-project-development/02-discovery/database-plugin-review-report.md`
