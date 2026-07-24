# BUG-008 独立评审任务

## 评审范围

- `scripts/smoke-generated-api.mjs`
- `.factory/workitems/BUG-008/task-briefs/generated-smoke-registry-isolation.md`
- `.factory/workitems/BUG-008/evidence/root-cause.md`
- `.factory/workitems/BUG-008/evidence/verification.md`
- `.factory/workitems/BUG-008/reports/root-cause-investigation.md`
- `.factory/workitems/BUG-008/reports/implementer-report.md`
- `.factory/workitems/bugs/BUG-008-generated-smoke-registry-assumption.md`
- 当前未提交 diff

## 评审要求

- 只读，不修改文件、Git、ledger 或外部系统。
- 核对修复是否消除用户 registry 隐式依赖。
- 核对模板 Core 版本契约、Doctor 检查和 pnpm 11 行为是否保持。
- 核对 RED/GREEN 与完整门禁证据。
- 分别给出 Spec Review、Quality Review、Critical / Important / Minor。
- 明确接受或拒绝 verification 中的 N/A。
- 给出 `approved` 或 `changes_requested` 及 100 分评分。
