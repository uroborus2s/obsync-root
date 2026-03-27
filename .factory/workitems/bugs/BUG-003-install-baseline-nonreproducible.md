# BUG-003 离线安装基线不可重复

- 类型：BUG
- 状态：OPEN
- 优先级：P1
- 阶段：ANALYSIS
- 预计工作量：1.0 人/天

## 描述

当前根工作区的联网 `frozen-lockfile` 安装已经恢复，但离线 `frozen-lockfile` 安装仍然失败，说明完整 tarball 尚未进入本地 store。

## 证据

- `CI=true pnpm install --frozen-lockfile` 通过
- `CI=true pnpm install --frozen-lockfile --offline` 报 `ERR_PNPM_NO_OFFLINE_TARBALL`

## 影响

- 无网环境无法稳定恢复依赖
- 离线 CI 或受限环境验证仍然不可靠

## 完成判定

- `pnpm install --frozen-lockfile --offline` 在目标环境下可通过，或明确标记“不支持离线安装”
- 离线策略与所需缓存边界有正式结论
