# BUG-009 验证证据

- 日期：2026-09-01
- Actor：Codex
- 候选版本：`@stratix/was-v7@1.0.0-beta.38`
- 当前结论：review_approved_ready_for_release

## RED / GREEN

- RED：签名服务收到
  `/v7/calendars/148219054/permissions`，缺少 `?page_size=20`；1 failed / 13 passed。
- GREEN：拦截器改用 Axios `getUri(config)` 后，定向测试 14/14 passed。

## 包级验证

- 全量测试：11 个文件，123/123 passed。
- TypeScript：`tsc -p tsconfig.json --noEmit`，exit 0。
- Oxlint：exit 0；仅 10 个既有 `plugin.ts` `no-console` warning。
- Build：exit 0。
- Pack：`@stratix/was-v7@1.0.0-beta.37` tarball 生成成功，包含 dist、类型声明、README 和 package.json。
- Tarball 代码包含 `axiosInstance.getUri(config)`；peer workspace 协议已由 pnpm 改写为发布版本。
- 发布前反查：配置的 Aliyun registry 和禁用用户 scope 配置后的 public npmjs 均不存在精确版本 `1.0.0-beta.37`。
- Aliyun publish dry-run：exit 0，仅包含 `@stratix/was-v7@1.0.0-beta.37`。
- 将 tarball 安装到隔离 consumer、忽略 workspace peer 后执行生产依赖审计：0 vulnerabilities。

## Workspace 门禁

`pnpm run quality:release` 的 build、typecheck、lint、tests、Core coverage、
packed Core smoke、generated consumer smoke 和 89 页 docs validation 均通过；
随后全仓 `pnpm audit --prod --audit-level high` 因既有 Core/DevTools 依赖中的
`brace-expansion`、`fast-uri`、`js-yaml` 新公告而 exit 1，release dry-run 未执行。
这些路径不来自 was-v7 tarball 的直接生产依赖，本任务不扩大为全仓依赖升级。

## 独立评审

首轮发现完整 query 进入 debug 日志、测试未使用真实 Axios URI 行为两项 P2。
修正后复审通过：日志只记录 `config.url`，测试通过真实 Axios `getUri` 覆盖
`baseURL + params + paramsSerializer`；无剩余阻塞问题。

## beta.38 Core beta.9 消费兼容

- `1.0.0-beta.37` 已发布到 Aliyun，但消费端加载时报
  `Cannot find module '@stratix/core/plugin'`；它误带入了新版 Core 子路径迁移。
- 用户确认 beta.38 只兼容 `@stratix/core@1.0.0-beta.9`，不适配新版 Core。
- was-v7 的 Core peer/dev 依赖均固定为 `1.0.0-beta.9`，所有运行时 Core 导入恢复为根入口；`sleep` 恢复使用 `@stratix/utils@1.0.0-beta.4`。
- Core beta.9 下 was-v7 全量测试 123/123、lint、build 通过。
- beta.38 tarball 与 Core beta.9、Redis beta.2 安装到隔离 consumer 后，默认插件与 `WpsError` 成功加载。

## 待完成

- beta.38 真实发布和精确版本反查。
