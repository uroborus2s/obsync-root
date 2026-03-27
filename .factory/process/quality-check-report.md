# Quality Check Report

- Checked at: 2026-03-28
- Overall status: `AMBER`

## Passing Signals

- Root `CI=true pnpm install --frozen-lockfile`
- `@stratix/cli` build and runtime help output
- `examples/web-admin-preview` install, build, test, and preview startup

## Failing Signals

- Frozen offline install reproducibility
- Root `pnpm build`
- Root `pnpm build:all`
- Root `pnpm test`
- Workspace package graph build/test health

## Action Focus

1. Restore reproducible installation.
2. Repair root validation entrypoints.
3. Repair workspace package graph build/test regressions.
