# Evolution Baseline

## Long-Term Collaboration Rules Learned From This Baseline

- Keep stable collaboration rules in `AGENTS.md` / `GEMINI.md`.
- Keep transient install/build/test/runtime facts in current-state artifacts, not in README.
- For historical monorepos, verify root commands and package commands separately before drawing conclusions.
- Keep preview or dogfooding samples outside the formal workspace unless they are real deliverables.
- For public packages, do not assume local `package.json` versions equal released versions.
- Treat `manifest`, `git tag`, and `registry` as three independent release signals until explicitly reconciled.

## Current Phase Baseline

- Phase: `ANALYSIS`
- Entry satisfied:
  - real workspace mapped
  - current-state evidence written
  - workitems created
- Exit blocked by:
  - `BUG-001`
  - `BUG-002`
  - `BUG-003`
  - `BUG-004`
  - `CR-001`
