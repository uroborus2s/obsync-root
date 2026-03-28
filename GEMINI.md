# Stratix Collaboration Guide

## Purpose

This file is the stable collaboration contract for Gemini-class agents in this repository.
Do not write transient install, build, test, release, or runtime conclusions here.

## Read Order

1. `GEMINI.md`
2. `.factory/project.json`
3. `.factory/memory/current-state.md`
4. `.factory/memory/project-index.md`
5. Current-stage documents under `docs/`
6. Only then broader human documents as needed

## Source Of Truth

- `docs/` is the formal human-readable project documentation.
- `.factory/memory/` is the compressed AI memory layer.
- `.factory/workitems/` is the change-control layer for `BUG/CR/TASK`.
- `README.md` is a stable repository entry only.
- Current verification results belong in:
  - `.factory/project.json`
  - `.factory/memory/current-state.md`
  - `docs/04-project-development/02-discovery/current-state-analysis.md`

## Responsibilities

- Keep stable collaboration rules in `AGENTS.md` / `GEMINI.md`.
- Keep current-state evidence in discovery and memory documents.
- Keep implementation facts in code and tests.
- Keep change control in `BUG-*`, `CR-*`, and `TASK-*` workitems.

## Long-Term Constraints

- This repository is a `pnpm` + `turbo` Node.js monorepo.
- Public framework and ecosystem packages live under `packages/*`.
- Private application surfaces live under `apps/*`.
- Use traceable IDs: `REQ`, `NFR`, `MOD`, `API`, `DATA`, `TASK`, `BUG`, `CR`, `REL`, `OPS`.
- Accepted changes must sync:
  - code
  - `docs/`
  - tests
  - `.factory/`

## Collaboration Boundaries

- Do not overwrite user changes outside the task scope.
- Do not treat declared scripts or old documents as verified fact.
- When command validity matters, re-verify and record the result in the current-state artifacts.
- Do not put phase-specific status, temporary findings, or release snapshots into this file.
