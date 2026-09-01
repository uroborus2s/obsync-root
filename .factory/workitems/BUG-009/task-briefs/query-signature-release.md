# BUG-009 查询参数签名修复与发布

## 目标

确保 KSO-1 签名使用与 Axios 实际发送一致、包含查询参数的 URI，并发布
`@stratix/was-v7@1.0.0-beta.37`。

## 验收标准

- `params` 序列化结果进入签名 URI。
- was-v7 测试、类型检查、lint、构建和 tarball 检查通过。
- 配置的 npm registry 可反查精确版本 `1.0.0-beta.37`。

## 允许范围

- `packages/was_v7` 的 HTTP 客户端、测试和版本。
- BUG-009、当前态和发布文档。

## 禁止

- 不修改各业务 Adapter 的参数传递方式。
- 不发布其他 workspace 包。
