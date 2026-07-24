# CR-003 Review Feedback Triage

## CR-003-RF-001

- 来源：task review
- 文件：`packages/database/src/__tests__/peer-dependencies.test.ts`
- severity：Important
- 要求：精确保护 Core required、全部 peer ranges 和驱动 devDependencies。
- 清楚：yes
- 技术核实：正确。当前测试在 Core peer 被删除时仍可能通过，也没有锁定版本
  范围或驱动开发依赖。
- 决定：Fixed；增加最小精确对象断言。
- 风险：无运行时代码变化。

## CR-003-RF-002

- 来源：task review
- 文件：`packages/database/README.md`
- severity：Minor
- 要求：消除 README 当前包版本与 manifest 不一致。
- 清楚：yes
- 技术核实：正确。首行写死 `1.1.0`，而当前 manifest 是 `1.1.1`。
- 决定：Fixed；移除首行易过期的版本号，保留历史“1.1.0 的变化”章节。
- 风险：无。
