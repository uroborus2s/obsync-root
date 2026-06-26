# Stratix 95+ Quality Gate

**状态：** 本文件记录 2026-06-19 闭门复评后的历史 release-scope `95/100` 口径。2026-06-20 起当前工作模式调整为开发硬化优先、发布工作最后处理；该历史分数不能直接复用为本轮开发硬化后的最终复评分，也不能在远端 CI 首跑和 npm publish 前宣称高置信 GA。
**适用范围：** Stratix 1.1.x supported packages 与 `@stratix/core` 质量口径。
**排除范围：** 无；`@stratix/tasks` 已从 workspace、preset 模板和发布面物理移除。
**关联工作项：** `TASK-003`

## 1. 口径定义

`95+` 在本文中指 supported release scope 的生产成熟度评分，不是当前全包覆盖率事实。评分来源必须是可执行门禁、关键路径测试、文档证据和复评记录，不能用主观描述替代命令结果。

历史 release-scope 口径是 RC / controlled release：

- 可以声明 supported packages 已有可执行发布前置门禁。
- 可以声明 `@stratix/core` 当前使用 coverage ratchet 与关键路径定向阈值。
- 可以声明 P0/P1/P2/P2+ 本地修复线后，supported release scope 曾在 2026-06-19 达到本地生产评分 `95/100`。
- 不可以把该历史分数直接当作本轮开发硬化后的最终复评分。
- 不可以声明 `@stratix/core` 全包覆盖率已经达到 95+。
- 不可以声明当前状态是高置信 GA。

## 2. 历史评分事实

2026-06-19 P2+ 复验后的本地 release-scope 生产评分：

| 分项        | 当前分 | 证据                                                                                                                               |
| ----------- | -----: | ---------------------------------------------------------------------------------------------------------------------------------- |
| 架构一致性  |     95 | 应用 discovery 与插件 AutoDI 共享 `RegistrationPlan` metadata，production manifest v2 可按 compiled file 注册                      |
| 运行时实现  |     95 | provider-backed observability/security、readiness/liveness、manifest strict mode 和 runtime stability 测试通过                     |
| 测试质量    |     95 | 2026-06-19 历史证据为 core 31/224、forge 51 测试通过；2026-06-20 开发硬化后 core 34/261、coverage ratchet 和 packed API smoke 通过 |
| 文档一致性  |     95 | `.factory`、discovery、review、quality gate 和 developer docs 同步 P2+ 事实                                                        |
| 发布可控性  |     95 | `quality:release`、workspace release gate、manifest v2 integrity 和 registry reconciliation 本地门禁可执行                         |
| QA 可追溯性 |     95 | CR 工作项、闭门复评报告、当前状态分析记录评分边界与外部剩余项                                                                      |

剩余外部证据：

- `.github/workflows/quality-gate.yml` 需要首次远端运行通过。
- npm publish 需要维护者凭证执行。
- core 全包覆盖率仍不是 95%，不能写成“95% 覆盖率达成”。

## 3. 当前 Coverage 事实

`pnpm run test:coverage:core` 在 2026-06-20 开发硬化后的全包覆盖率为：

| 指标       | 当前值 |
| ---------- | -----: |
| statements | 46.32% |
| branches   | 38.87% |
| functions  | 41.36% |
| lines      | 47.14% |

本轮还对 `src/bootstrap/application-bootstrap.ts` 设置并通过更高的路径级阈值：lines `75.65%`、functions `96.07%`、branches `55.33%`、statements `75.73%`。

这些数值满足当前 executable ratchet；global ratchet 为 lines `43`、functions `38`、branches `34`、statements `42`。它们仍不满足 95% 全包覆盖率。后续如果要追求 95% 覆盖率，必须拆成可执行的包级/路径级阈值计划，不能用生产评分替代覆盖率事实。

`pnpm run smoke:core-api` 在 2026-06-20 通过：构建并打包 `@stratix/core`，在临时消费者项目安装 tarball，导入 root 与 `./auth`、`./context`、`./contracts`、`./data`、`./diagnostics`、`./environment`、`./internal`、`./logger`、`./plugin`、`./service` 子路径，并启动/停止最小 CLI 应用。该冒烟捕捉并修复了 `pino-pretty` 运行时依赖缺失问题。

## 4. 发布前置门禁

根级 `release` 必须先执行以下门禁，然后才能执行 `pnpm changeset publish`：

```bash
pnpm run build:supported
pnpm run typecheck:supported
pnpm lint
pnpm run test:supported
pnpm run test:coverage:core
pnpm run smoke:core-api
pnpm run docs:validate
pnpm run security:audit
pnpm run release:gate:dry-run
```

门禁范围说明：

- `build:supported` / `test:supported` 使用 Turbo supported scope，覆盖剩余 10 个公共包。
- `typecheck:supported` 显式枚举 10 个 supported 公共包。
- `pnpm lint` 使用 supported lint scope。
- `test:coverage:core` 是当前 core coverage ratchet，不代表 95% 全包覆盖率已达成。
- `smoke:core-api` 验证 packed tarball 在真实消费者项目中的公开 subpath 和默认运行时依赖。
- `docs:validate` 使用 `scripts/docs-validate.mjs` 调用 `docs-stratego` 校验文档导航与结构；开发机缺少全局 `uvx` 时会使用临时 uv 运行环境。
- `security:audit` 使用生产依赖高危审计。
- `release:gate:dry-run` 复用 `@stratix/forge` workspace release gate，覆盖 supported package 计划、pack/API/release-surface 等发布准备面。

2026-06-20 开发硬化后，`pnpm run quality:release` 已重新通过：supported build/typecheck/lint/test、core coverage、packed core API smoke、docs validation、security audit 和 workspace release gate dry-run 均通过。该结果仍是本地 dry-run 质量证据，不等同于远端 CI、registry reconciliation release gate 执行或 npm publish。

真实 `pnpm run release` 会在 `quality:release` 之后继续执行：

```bash
pnpm run release:gate
pnpm changeset publish
```

其中 `release:gate` 会启用 offline install，并重新执行 workspace release gate；只有该门禁通过后才允许进入 npm publish。

## 5. CI 门禁

`.github/workflows/quality-gate.yml` 是 PR 与 `main` / `1.1.0` push 的 CI 入口，按以下顺序执行：

1. `CI=true pnpm install --frozen-lockfile`
2. `pnpm run build:supported`
3. `pnpm run typecheck:supported`
4. `pnpm lint`
5. `pnpm run test:supported`
6. `pnpm run test:coverage:core`
7. `pnpm run smoke:core-api`
8. `pnpm run docs:validate`
9. `pnpm run security:audit`
10. `pnpm run release:gate:dry-run`

CI 的目标是让 release 前置门禁在合并前可重复执行。CI 通过只代表当前 RC 门禁通过，不等同于 GA 质量承诺。

## 6. Tasks 删除项

`@stratix/tasks` 已硬删除：

- `packages/tasks` 源码目录已移除。
- create/forge 的 `tasks` preset 模板已移除。
- workspace release gate 不再需要 tasks 排除分支。

如果未来恢复 `@stratix/tasks`，必须以新包方式重新立项，补齐 database API 迁移、测试和发布门禁。

## 7. 残余风险

- 当前 core 全包覆盖率仍明显低于 95% 目标，需要后续覆盖率提升计划；这不撤销 2026-06-19 supported release scope 的历史 `95/100` 生产评分，但也不能把历史分数直接复用为本轮开发硬化后的最终复评分。
- CI workflow 是新增门禁，首次远端运行前只能通过本地脚本和 YAML 静态校验确认。
- `security:audit` 依赖 registry 响应；网络或 registry 策略变化可能导致 CI 结果波动。
- npm publish 仍需要维护者凭证，不能由本地门禁替代。
