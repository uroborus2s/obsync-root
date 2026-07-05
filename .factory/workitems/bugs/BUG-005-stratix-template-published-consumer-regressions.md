# BUG-005 Stratix 模板与发布后消费路径回归

- 类型：BUG
- 状态：RESOLVED
- 优先级：P0
- 阶段：POST_RELEASE_CONSUMER_REMEDIATION
- 日期：2026-07-05

## 描述

官方 create/forge 模板和 forge 项目内命令在真实生成项目、Node 24、pnpm 11、`@stratix/core@1.1.0` ESM-only exports、`@stratix/forge@1.1.2` 升级组合下暴露发布后消费缺陷。

## 根因

之前验证覆盖了源码包构建、单包测试和 workspace release gate，但没有把“用 built create 生成全新项目 -> pnpm 11 初次安装 -> 生成项目 build/doctor/openapi/config help”作为回归门禁。

## 缺陷与修复

- API/resource 模板把 `operationId` 放进 `schema`，不满足 Fastify `FastifySchema` 类型；已改为 `route options.config.operationId`，core/forge 继续兼容旧 `schema.operationId`。
- `stratix start` 用 `createRequire().resolve('@stratix/core')` 解析 ESM-only exports；已改为读取目标项目 `@stratix/core/package.json` 的 import entry 后动态导入。
- `doctor` 对 `.stratix/project.json` 中旧的 `@stratix/forge` 版本快照做精确匹配；已允许 forge 工具链依赖升级，只要求项目仍声明 `@stratix/forge`。
- 官方模板缺少 release gate security 脚本；app/plugin/web-admin 模板已生成 `security:audit`。
- 官方模板仍读取普通业务 env；生成配置和开发指南已改为从 `sensitiveConfig` 读取 server/database/redis/ossp/was-v7 配置。
- `stratix config <subcommand> --help` 走错误分支；已补完整 help 输出并正常返回。
- pnpm 11 初次安装会因 `esbuild` build approval 阻断；根工作区和生成项目已使用 pnpm 11 `allowBuilds.esbuild: true`。

## 验证

- `pnpm --filter @stratix/create test`：5 tests passed。
- `pnpm --filter @stratix/core exec vitest run src/contracts/__tests__/route-contract.test.ts`：6 tests passed。
- `pnpm --filter @stratix/forge test`：67 tests passed。
- `pnpm --filter @stratix/create exec tsc -p tsconfig.json --noEmit`：passed。
- `pnpm --filter @stratix/forge exec tsc -p tsconfig.json --noEmit`：passed。
- `pnpm --filter @stratix/core exec tsc -p tsconfig.json --noEmit`：passed。
- `pnpm --filter @stratix/create build`、`pnpm --filter @stratix/forge build`、`pnpm --filter @stratix/core build`：passed。
- `env UV_CACHE_DIR=/private/tmp/stratix-uv-cache UV_TOOL_DIR=/private/tmp/stratix-uv-tools pnpm run docs:validate`：passed，89 pages / 0 contracts。
- `git diff --check`：passed。
- Built create 生成临时 API 项目后，`pnpm install` 在 pnpm 11.9.0 下执行 `esbuild postinstall` 并通过。
- 临时生成项目 `pnpm build`、`pnpm exec stratix doctor`、`pnpm exec stratix config encrypt --help`、`pnpm exec stratix openapi generate --output openapi.json --strict`：passed。
