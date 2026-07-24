# CR-CORE-20260620 Review Remediation Batches

## Status

Implemented locally; full local quality and release gates passed. Awaiting remote CI
and maintainer publish evidence.

## Scope

This change request closes the first two remediation batches from the
2026-06-19 `@stratix/core` closed-door review follow-up.

## Fixed Issues

- Real local `release:gate` now includes registry reconciliation.
- `quality:release` and GitHub Actions quality gate now include lint.
- Deprecated `tasks` preset is blocked by default and requires
  `--allow-deprecated`.
- Generated create/forge config maps flat `.env.example` keys and no longer
  emits public OSSP/WAS placeholder secrets.
- OSSP/WAS runtime validators reject public placeholder credentials.
- `stratix generate` refuses to overwrite generated files unless `--force` is
  passed.
- Production manifest default `.stratix` path resolves relative to project root
  during loading and registration.
- `HttpError` is exported from the root public API and `@stratix/core/errors`.
- AutoDI module processing errors fail fast by default, with `log` and `ignore`
  compatibility modes.
- `StratixApplication.close()` now uses the same shutdown lifecycle as
  `stop()`.
- Strict `compiledOnly` production-manifest mode requires schema v2 compiled
  artifacts and registration entries, and registration uses compiled files only.

## Scoring Rule

Review scoring uses rubric `core-rc-remediation-v1`.

- Baseline before remediation: composite risk score `82/100` on 2026-06-19.
- Post batch 1/2 local evidence score: technical management `90`, test
  management `82`, framework architecture `88`, composite `87/100`.
- The local release-gate `95/100` score remains a separate supported-release
  scope score.
- Future scores may only change when executable evidence, source code, release
  gates, CI evidence, tests, or documented scope changes.

## Local Verification

- `pnpm --filter @stratix/create test`: 6 tests passed.
- `pnpm --filter @stratix/forge exec tsx --test tests/run-cli.test.ts`: 52
  tests passed.
- `pnpm --filter @stratix/core exec vitest run src/__tests__/public-api-contract.test.ts`:
  4 tests passed.
- `pnpm --filter @stratix/core exec vitest run src/bootstrap/__tests__/application-runtime-stability.test.ts`:
  4 tests passed.
- `pnpm --filter @stratix/core exec vitest run src/plugin/__tests__/auto-di-plugin.test.ts`:
  4 tests passed.
- `pnpm --filter @stratix/core exec vitest run src/discovery/__tests__/production-manifest.test.ts`:
  7 tests passed.
- `pnpm --filter @stratix/core exec vitest run src/bootstrap/__tests__/application-discovery-bootstrap.test.ts`:
  18 tests passed.
- `pnpm --filter @stratix/core exec vitest run src/bootstrap/__tests__/config-validation.test.ts`:
  8 tests passed.
- `pnpm --filter @stratix/ossp exec vitest run src/__tests__/plugin-validation.test.ts`:
  5 tests passed.
- `pnpm --filter @stratix/was-v7 exec vitest run src/__tests__/plugin-validation.test.ts`:
  21 tests passed.
- `pnpm lint`: 11 supported lint tasks passed.
- `pnpm run quality:release`: supported build/typecheck/lint/test, core coverage,
  docs validation, security audit, and release gate dry-run passed.
- `pnpm run release:gate`: offline install, supported build/test, docs,
  security audit, pack, API surface, release-surface, exact tag, and registry
  reconciliation checks passed.

## Remaining Evidence

- First remote GitHub Actions quality-gate run.
- Maintainer npm publish evidence.
- Optional future global coverage uplift beyond the current executable ratchet.
