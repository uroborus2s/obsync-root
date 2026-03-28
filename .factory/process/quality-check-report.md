# Quality Check Report

- Checked at: 2026-03-29
- Overall status: `AMBER`

## Passing Signals

- Root `CI=true pnpm install --frozen-lockfile`
- Root `pnpm build`
- Root `pnpm build:all`
- Preview sample `CI=true pnpm install --ignore-workspace --frozen-lockfile`
- `@stratix/cli` build and runtime help output
- All 10 public workspace packages compile on the upgraded baseline
- `examples/web-admin-preview` install, build, test, and preview startup

## Failing Signals

- Frozen offline install reproducibility
- Root `pnpm test`
- `@stratix/ossp` / `@stratix/queue` currently fail root test because Vitest exits on packages without tests
- Remaining package tests still need individual triage on the upgraded stack
- Peer compatibility warnings around TypeScript 6 / ESLint 10

## Action Focus

1. Stabilize the workspace test profile.
2. Restore reproducible installation.
3. Reconcile release-surface reality and remaining package-test regressions.
