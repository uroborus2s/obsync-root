# BUG-008 实施报告

## 实施

`smoke-generated-api.mjs` 在生成项目的 `pnpm-workspace.yaml` 中追加临时
`@stratix/core` override，指向当前 workspace Core。现有 Forge `file:`
注入保持不变。

## 影响

- CI 不再依赖开发机用户级 Aliyun registry 配置。
- 模板面对真实消费者时仍输出 `@stratix/core: ^1.1.0`。
- smoke 继续验证安装、build、doctor、config help 和 strict OpenAPI。
- 没有发布 npmjs 或 Aliyun 包。

## 验证

- 原 CI 条件稳定 RED 后转 GREEN。
- 禁用用户 npm 配置的完整 `quality:release` exit 0。
