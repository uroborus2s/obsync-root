# BUG-009 独立评审

- 日期：2026-09-01
- Reviewer：`/root/bug009_review`
- 结论：APPROVED

## 首轮问题

- P2：签名 URI 的完整 query 被 debug 日志输出，新增潜在敏感参数泄露面。
- P2：测试使用手写 `URLSearchParams` mock，没有覆盖真实 Axios 的 `baseURL`、
  数组编码和 `paramsSerializer` 行为。

## 修正与复审

- 签名继续使用 `getUri(config)`，日志改回只记录 `config.url`。
- 测试改用真实 Axios `getUri`，覆盖
  `baseURL + params + paramsSerializer` 和绝对最终 URI。
- 定向测试 14/14、全包测试 123/123、TypeScript、lint 和
  `git diff --check` 通过。

复审确认两项 P2 均关闭，无新增阻塞问题。

## beta.38 Core beta.9 兼容复审

- 源码、声明和 tarball 仅从 `@stratix/core` 根入口导入，不再引用
  `@stratix/core/plugin` 或 `@stratix/core/async`。
- Core peer/dev 依赖均固定为 `1.0.0-beta.9`；`sleep` 使用发布依赖
  `@stratix/utils@1.0.0-beta.4/async`。
- beta.37 的 Axios 最终 URI 签名修复和只记录路径的日志处理均保留。
- Core beta.9 下测试、TypeScript、lint、tarball 与隔离 consumer 验证通过。

无 Critical、Important 或阻塞发布问题，
`@stratix/was-v7@1.0.0-beta.38` 可发布。
