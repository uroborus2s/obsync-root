# Tech Stack Summary

- Runtime: Node.js 22+
- Language: TypeScript
- Workspace: pnpm + turbo
- Backend core: Fastify + Awilix-based Stratix runtime
- Testing: Vitest, Node test runner for CLI
- Frontend app: React 19 + Vite 8 + TanStack Router
- Release tooling: Changesets

## Stratix Version Anchors

- `@stratix/cli@1.1.0`
- `@stratix/core@1.1.0`
- `@stratix/database@1.1.0`

## Important Engineering Constraints

- Treat manifest/tag/registry as separate release signals until aligned.
- Prefer package-level verification when root scripts are known to drift.
- Repository-first database access is the intended 1.1.x model.
