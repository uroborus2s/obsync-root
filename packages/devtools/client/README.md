# Stratix DevTools Client

React + TypeScript 7 + Vite client for `@stratix/devtools`.

## Commands

```bash
pnpm dev
pnpm build
pnpm lint
```

`pnpm lint` runs Oxlint with type information. The repository root
`.oxlintrc.json` owns the shared TypeScript, import, React Hooks, and Fast
Refresh rules; TypeScript 7 remains the separate build and typecheck authority.

Vite and Vitest keep their existing build and test responsibilities and do not
load the lint configuration.
