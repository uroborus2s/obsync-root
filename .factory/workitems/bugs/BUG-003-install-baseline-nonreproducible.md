# BUG-003 离线安装基线不可重复

- 类型：BUG
- 状态：CLOSED
- 优先级：P1
- 阶段：PHASE_6_RELEASE_READINESS
- 预计工作量：1.0 人/天

## 描述

当前根工作区的联网 `frozen-lockfile` 安装已经恢复；Phase 6 复核后，离线 `frozen-lockfile` 安装也已在当前目标环境通过。

## 证据

- `CI=true pnpm install --frozen-lockfile` 通过
- `CI=true pnpm install --frozen-lockfile --offline` 通过：
  - `Scope: all 13 workspace projects`
  - `Lockfile is up to date, resolution step is skipped`
  - `Already up to date`

## 影响

- 无网环境无法稳定恢复依赖
- 离线 CI 或受限环境验证仍然不可靠

## 完成判定

- `pnpm install --frozen-lockfile --offline` 在目标环境下可通过，或明确标记“不支持离线安装”
- 离线策略与所需缓存边界有正式结论

## Phase 6 结论

- `stratix release gate --scope workspace --include-offline-install` 已可把 frozen offline install 纳入发布准备门禁。
- 当前 BUG 已关闭；离线安装在目标环境恢复为可重复发布前置检查。
