# Stratix 95+ Quality Gate

**状态：** 2026-06-19 闭门复评 P0/P1/P2/P2+ 本地修复线已落地；supported 1.1.x 范围达到本地生产评分 `95/100`；当前发布等级仍为 controlled release，不能在远端 CI 首跑和 npm publish 前宣称高置信 GA。
**适用范围：** Stratix 1.1.x supported packages 与 `@stratix/core` 质量口径。
**排除范围：** `@stratix/tasks` 为 1.1.x 冻结/废弃包，不进入默认构建、测试、发布或 CI 门禁。
**关联工作项：** `TASK-003`

## 1. 口径定义

`95+` 在本文中指 supported release scope 的生产成熟度评分，不是当前全包覆盖率事实。评分来源必须是可执行门禁、关键路径测试、文档证据和复评记录，不能用主观描述替代命令结果。

当前可发布口径是 RC / controlled release：

- 可以声明 supported packages 已有可执行发布前置门禁。
- 可以声明 `@stratix/core` 当前使用 coverage ratchet 与关键路径定向阈值。
- 可以声明 P0/P1/P2/P2+ 本地修复线后，supported release scope 的生产评分达到 `95/100`。
- 不可以声明 `@stratix/core` 全包覆盖率已经达到 95+。
- 不可以声明当前状态是高置信 GA。

## 2. 当前评分事实

2026-06-19 P2+ 复验后的本地生产评分：

| 分项           | 当前分 | 证据 |
| -------------- | -----: | ---- |
| 架构一致性     | 95 | 应用 discovery 与插件 AutoDI 共享 `RegistrationPlan` metadata，production manifest v2 可按 compiled file 注册 |
| 运行时实现     | 95 | provider-backed observability/security、readiness/liveness、manifest strict mode 和 runtime stability 测试通过 |
| 测试质量       | 95 | core 31/224、forge 51 测试通过，覆盖 provider 故障隔离、rate-limit provider 回退、plugin provides 深校验 |
| 文档一致性     | 95 | `.factory`、discovery、review、quality gate 和 developer docs 同步 P2+ 事实 |
| 发布可控性     | 95 | `quality:release`、workspace release gate、manifest v2 integrity 和 registry reconciliation 本地门禁可执行 |
| QA 可追溯性    | 95 | CR 工作项、闭门复评报告、当前状态分析记录评分边界与外部剩余项 |

剩余外部证据：

- `.github/workflows/quality-gate.yml` 需要首次远端运行通过。
- npm publish 需要维护者凭证执行。
- core 全包覆盖率仍不是 95%，不能写成“95% 覆盖率达成”。

## 3. 当前 Coverage 事实

`pnpm run test:coverage:core` 在 2026-06-19 本地复验的全包覆盖率为：

| 指标       | 当前值 |
| ---------- | -----: |
| statements | 44.27% |
| branches   | 35.69% |
| functions  | 39.27% |
| lines      | 45.09% |

这些数值满足当前 executable ratchet；global ratchet 为 lines `43`、functions `38`、branches `34`、statements `42`。它们仍不满足 95% 全包覆盖率。后续如果要追求 95% 覆盖率，必须拆成可执行的包级/路径级阈值计划，不能用生产评分替代覆盖率事实。

## 4. 发布前置门禁

根级 `release` 必须先执行以下门禁，然后才能执行 `pnpm changeset publish`：

```bash
pnpm run build:supported
pnpm run typecheck:supported
pnpm run test:supported
pnpm run test:coverage:core
pnpm run docs:validate
pnpm run security:audit
pnpm run release:gate:dry-run
```

门禁范围说明：

- `build:supported` / `test:supported` 使用 Turbo supported scope，并显式排除 `@stratix/tasks`。
- `typecheck:supported` 显式枚举 10 个 supported 公共包，不通过 all-package scope 间接带入 `@stratix/tasks`。
- `test:coverage:core` 是当前 core coverage ratchet，不代表 95% 全包覆盖率已达成。
- `docs:validate` 使用 `docs-stratego` 校验文档导航与结构。
- `security:audit` 使用生产依赖高危审计。
- `release:gate:dry-run` 复用 `@stratix/forge` workspace release gate，覆盖 supported package 计划、pack/API/release-surface 等发布准备面。

2026-06-19 本地复验中，`pnpm run quality:release` 已完整通过。该命令确认 10 个 supported package build、显式 supported typecheck、12 个 supported test turbo tasks、core coverage ratchet、`86 pages / 0 contracts` 文档校验、production 高危安全审计和 workspace release gate dry-run 均通过。

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
4. `pnpm run test:supported`
5. `pnpm run test:coverage:core`
6. `pnpm run docs:validate`
7. `pnpm run security:audit`
8. `pnpm run release:gate:dry-run`

CI 的目标是让 release 前置门禁在合并前可重复执行。CI 通过只代表当前 RC 门禁通过，不等同于 GA 质量承诺。

## 6. Tasks 排除项

`@stratix/tasks` 保持冻结/废弃状态，本轮不迁移、不修复、不发布：

- 仍可能导入已移除的 `DatabaseAPI`。
- 仍可能使用旧 `BaseRepository` 构造方式。
- 显式 `build:all` 失败不阻塞 supported release gate。

如果未来恢复 `@stratix/tasks` 为 supported package，必须先单独完成 database API 迁移、测试补齐和发布门禁纳入。

## 7. 残余风险

- 当前 core 全包覆盖率仍明显低于 95% 目标，需要后续覆盖率提升计划；这不撤销 supported release scope 的本地 `95/100` 生产评分。
- CI workflow 是新增门禁，首次远端运行前只能通过本地脚本和 YAML 静态校验确认。
- `security:audit` 依赖 registry 响应；网络或 registry 策略变化可能导致 CI 结果波动。
- npm publish 仍需要维护者凭证，不能由本地门禁替代。
