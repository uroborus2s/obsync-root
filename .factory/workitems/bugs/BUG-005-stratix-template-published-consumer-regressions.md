# BUG-005 Stratix 模板与发布后消费路径回归

- 类型：BUG
- 状态：RESOLVED
- 优先级：P0
- 阶段：POST_RELEASE_CONSUMER_REMEDIATION
- 日期：2026-07-05

## 描述

官方 create/forge 模板和 forge 项目内命令在真实生成项目、Node 24、pnpm 11、`@stratix/core@1.1.0` ESM-only exports、`@stratix/forge@1.1.2` 升级组合下暴露发布后消费缺陷。

## 根因

之前验证覆盖了源码包构建、单包测试和 workspace release gate，但没有把“用 built create 生成全新项目 -> pnpm 11 初次安装 -> 生成项目 build/doctor/openapi/config help”作为回归门禁；首次修复后 QC 又发现 gateway/preset 普通业务 env 没有被同一门禁覆盖。

## 缺陷与修复

- API/resource 模板把 `operationId` 放进 `schema`，不满足 Fastify `FastifySchema` 类型；已改为 `route options.config.operationId`，core/forge 继续兼容旧 `schema.operationId`。
- `stratix start` 用 `createRequire().resolve('@stratix/core')` 解析 ESM-only exports；已改为读取目标项目 `@stratix/core/package.json` 的 import entry 后动态导入。
- `doctor` 对 `.stratix/project.json` 中旧的 `@stratix/forge` 版本快照做精确匹配；已允许 forge 工具链依赖升级，只要求项目仍声明 `@stratix/forge`。
- 官方模板缺少 release gate security 脚本；app/plugin/web-admin 模板已生成 `security:audit`。
- 官方模板仍读取普通业务 env；生成配置和开发指南已改为从 `sensitiveConfig` 读取 server/database/redis/ossp/was-v7 配置，gateway/preset 模板不再向 `.env.example` 写入 `UPSTREAM_URL`、`DB_*`、`REDIS_*`、`OSSP_*` 或 `WPS_*`，gateway service 不再读取 `process.env.UPSTREAM_URL`。
- `stratix config <subcommand> --help` 走错误分支；已补完整 help 输出并正常返回。
- pnpm 11 初次安装会因 `esbuild` build approval 阻断；根工作区和生成项目已使用 pnpm 11 `allowBuilds.esbuild: true`。
- 根 `quality:release` 与 GitHub Quality Gate 已加入 `pnpm run smoke:generated-api`，把 built create 生成项目的安装/build/doctor/config help/OpenAPI strict 冒烟固定为发布门禁。

## 验证

- `pnpm --filter @stratix/create test`：passed，覆盖 gateway/preset 普通业务 env 扫描。
- `pnpm --filter @stratix/core exec vitest run src/contracts/__tests__/route-contract.test.ts`：6 tests passed。
- `pnpm --filter @stratix/forge test`：68 tests passed。
- `pnpm --filter @stratix/create exec tsc -p tsconfig.json --noEmit`：passed。
- `pnpm --filter @stratix/forge exec tsc -p tsconfig.json --noEmit`：passed。
- `pnpm --filter @stratix/core exec tsc -p tsconfig.json --noEmit`：passed。
- `pnpm --filter @stratix/create build`、`pnpm --filter @stratix/forge build`、`pnpm --filter @stratix/core build`：passed。
- `env UV_CACHE_DIR=/private/tmp/stratix-uv-cache UV_TOOL_DIR=/private/tmp/stratix-uv-tools pnpm run docs:validate`：passed，89 pages / 0 contracts。
- `git diff --check`：passed。
- Built create 生成临时 API 项目后，`pnpm install` 在 pnpm 11.9.0 下执行 `esbuild postinstall` 并通过。
- 临时生成项目 `pnpm build`、`pnpm exec stratix doctor`、`pnpm exec stratix config encrypt --help`、`pnpm exec stratix openapi generate --output openapi.json --strict`：passed。
- `pnpm run smoke:generated-api`：passed，覆盖生成 API consumer smoke 和 gateway/preset env 扫描。
- `env UV_CACHE_DIR=/private/tmp/stratix-uv-cache-quality-final4 UV_TOOL_DIR=/private/tmp/stratix-uv-tools-quality-final4 pnpm run quality:release`：passed，覆盖 supported build/typecheck/lint/test、core coverage、packed core smoke、generated API consumer smoke、docs、安全审计和 release gate dry-run。
