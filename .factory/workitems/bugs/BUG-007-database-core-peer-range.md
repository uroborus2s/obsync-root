# BUG-007 Database Core Peer 版本范围

- 类型：BUG
- 状态：CLOSED
- 优先级：P1
- 阶段：POST_RELEASE_CONSUMER_REMEDIATION
- 日期：2026-07-24

## 现象

已发布的 `@stratix/database@1.1.0` 把 `@stratix/core` peer 声明为精确
`1.1.0`。当 Core 在不影响 Database 的情况下升级到 `1.1.1` 或 `1.1.2`
时，包管理器仍会报告 peer 版本冲突。

## 独立复现

1. 配置的 Aliyun registry 返回 `@stratix/database@1.1.0` 的
   `@stratix/core` peer 为 `1.1.0`。禁用用户级 scope registry 后，真实
   public npmjs 查询返回 404。
2. 当前 workspace 的 Core 版本为 `1.1.2`。
3. 对当前 Database 执行 `pnpm pack`，tarball 中的 `workspace:*` 被改写为
   精确 `1.1.2`。
4. 断言 tarball peer 为 `^1.1.0` 时稳定失败，实际值为 `1.1.2`。

## 根因

直接原因：`packages/database/package.json` 使用 `workspace:*` 声明 Core
peer；pnpm 打包时会把该协议改写为打包时 workspace Core 的精确版本。

根源原因：源码中的 workspace 链接约束被同时当作发布兼容契约使用，发布门禁
没有验证 tarball 中插件对 Core 的 peer 是否保留兼容范围。

## 已确认修复边界

- Core peer 改为 `workspace:^1.1.0`，tarball 必须输出 `^1.1.0`。
- Database devDependency 继续使用 `workspace:*`，测试仍绑定当前 workspace Core。
- 只发布 `@stratix/database@1.1.1`，不消费现有 Create/Forge Changeset。
- 发布到仓库当前配置的 Aliyun `@stratix` registry。
- public npmjs 不在本次写入范围。

## 人工确认

用户先确认已发布的 `1.1.0` 需要通过 `1.1.1` 修复，随后明确要求“修改并发布
`@stratix/database@1.1.1`”。该指令确认了根因、修复方案和私库发布动作。

## 发布结果

- 发布候选提交：`d5ecd76`。
- Aliyun registry 已发布 `@stratix/database@1.1.1`。
- 精确版本查询返回 `1.1.1`。
- `latest` dist-tag 返回 `1.1.1`。
- 发布后的 Core peer 返回 `^1.1.0`。
- 禁用用户级 npm scope 配置后，public npmjs 查询返回 404；本次没有写入
  public npmjs。
