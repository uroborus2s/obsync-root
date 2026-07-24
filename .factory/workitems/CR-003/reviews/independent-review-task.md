# CR-003 独立评审任务

## 评审范围

- `packages/database/package.json`
- `packages/database/README.md`
- `packages/database/src/__tests__/peer-dependencies.test.ts`
- `.changeset/database-optional-driver-peers.md`
- `.factory/workitems/CR-003/`
- `.factory/memory/current-state.md`
- `.factory/project.json`
- `docs/04-project-development/02-discovery/current-state-analysis.md`
- 当前未提交 diff

## 评审要求

- 只读，不修改文件、Git、ledger 或外部系统。
- 核对五个驱动 optional、Core required、版本范围和运行时行为不变。
- 核对 README、changeset、RED/GREEN、tarball、consumer smoke 和完整门禁证据。
- 分别给出 Spec Review、Quality Review、Critical / Important / Minor。
- 明确接受或拒绝 verification 中的 N/A。
- 给出 `approved` 或 `changes_requested` 及 100 分评分。
