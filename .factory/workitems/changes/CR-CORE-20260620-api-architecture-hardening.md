# CR-CORE-20260620 API Architecture Hardening

## Status

Implemented and locally verified.

## Scope

This change request closes the public API layering gap and several low-risk
architecture-debt items from the post-review path toward a `95/100` closed-door
risk score.

## Fixed Issues

- Root `@stratix/core` runtime exports are narrowed to stable application APIs.
- Plugin-author APIs are published through `@stratix/core/plugin`.
- Contract APIs are published through `@stratix/core/contracts`.
- Diagnostics APIs are published through `@stratix/core/diagnostics`.
- Experimental and internal APIs are published through explicit
  `@stratix/core/experimental` and `@stratix/core/internal` subpaths.
- Supported ecosystem packages now import plugin/DI contracts from the explicit
  plugin subpath instead of the root API.
- Generated plugin templates and the frozen `@stratix/tasks` source no longer
  import plugin/DI runtime APIs from the root entrypoint.
- `ApplicationBootstrap` request identity handling is extracted into a dedicated
  request identity module.
- Observability request id, response header request id, and request-scope
  injected `requestId` now use the same source.
- AutoDI strict mode rejects anonymous plugins to avoid `unknownPlugin` token
  prefix collisions.
- DI graph nodes now expose `confidence: explicit | inferred | unknown`.
- Route contract extraction supports runtime prefixes so OpenAPI paths can match
  prefixed routes.

## Score Impact

This closes the main framework-architecture gap in problem 3 and part of problem
4. It does not by itself justify a composite `95/100` closed-door risk score.
The remaining blockers are remote CI evidence, maintainer npm publish evidence,
coverage/public-subpath test uplift, and deeper bootstrap/config-schema
decomposition.

## Local Verification

- `pnpm --filter @stratix/core exec vitest run src/__tests__/public-api-contract.test.ts src/bootstrap/__tests__/application-runtime-stability.test.ts src/plugin/__tests__/auto-di-plugin.test.ts src/contracts/__tests__/route-contract.test.ts src/diagnostics/__tests__/di.test.ts`:
  5 files / 20 tests passed.
- `pnpm --filter @stratix/core exec tsc -p tsconfig.json --noEmit`: passed.
- `pnpm --filter @stratix/core run build`: passed.
- `pnpm run typecheck:supported`: passed.
- `pnpm lint`: 11 supported lint tasks passed.
- `pnpm run build:supported`: 10 supported packages passed.
- `pnpm run test:supported`: 12 supported test tasks passed; `@stratix/core`
  32 files / 237 tests passed.
- `pnpm --filter @stratix/core pack --pack-destination /tmp`: passed and
  produced `/tmp/stratix-core-1.1.0.tgz` with new subpath dist/type artifacts.
- `/opt/homebrew/Cellar/uv/0.9.18/bin/uvx --from docs-stratego docs-stratego source validate --repo-path .`:
  87 pages / 0 contracts passed.
- `git diff --check`: passed.
