# Stratix 95+ Quality Gate

**状态：** Phase 2 扩展工作流、Phase 3 Module governance 与 Phase 4 testing 平台基线已通过；总体演进继续执行
**适用范围：** Stratix 1.1.x 主线重构与 Core 概念模型演进
**排除范围：** `@stratix/tasks`  
**关联工作项：** `TASK-003`

## 1. 评分原则

每个维度满分 100 分。低于 95 分时继续重构，不进入完成态。

| 维度 | 当前基线 | 95+ 判定 |
| --- | ---: | --- |
| 架构边界 | 98 | core、database、create、forge、testing 职责清晰，executor 已从 core 概念面删除，create/forge 保持零运行时依赖，Contract-first、DI diagnostics、Module governance 和 testing platform 有独立 public surface |
| 代码实现 | 98 | P0/P1 缺陷关闭，route contract/OpenAPI helpers、DI graph/diagnostics、OpenAPI forge command、typed client、contractTest、testing fixtures、adapter diagnostics、module manifest/doctor/graph 均有实现，无 executor 兼容层 |
| 测试与回归 | 98 | 受影响模块有回归测试，database/create/forge/core/testing 定向验证通过，module governance 有 CLI 回归测试，testing platform 有 fixture 回归测试，supported build/test 通过，废弃 tasks 不计入 |
| 文档与使用路径 | 98 | README、开发指南、create/forge 模板说明与当前 1.1.x API 一致，Phase 2 扩展、Phase 3 module governance 与 Phase 4 testing platform 证据已同步，开发者指南不再暴露已删除 executor 使用路径 |
| 发布与验证面 | 97 | supported build/test 入口稳定，create/forge 包保持空 dependencies，tasks 从默认质量门排除，changeset 基线对齐 `1.1.0` |
| QA 风险控制 | 98 | 有明确的排除项、失败项解释、回归测试矩阵、负向 API 断言、create/forge 依赖边界扫描和无残留扫描命令 |

## 2. 本轮明确排除项

`@stratix/tasks` 即将废弃，当前不迁移、不修复、不作为根级构建或测试失败的扣分项。

因此以下现象不阻塞 `TASK-003`：

- `@stratix/tasks` 仍导入已移除的 `DatabaseAPI`
- `@stratix/tasks` 仍使用旧 `BaseRepository` 构造方式
- 显式 `build:all` 因 tasks 失败

但文档和验证报告必须显式说明这些失败已排除，不能把它们误判为主线健康。默认质量门使用 `build:supported` 与 `test:supported`。

## 3. 必须纳入评分的验证命令

基础命令：

```bash
pnpm --filter @stratix/core exec tsc --noEmit
pnpm --filter @stratix/database exec tsc --noEmit
pnpm --filter @stratix/database exec vitest run
pnpm --filter @stratix/create exec tsc --noEmit
pnpm --filter @stratix/create test
pnpm --filter @stratix/forge exec tsc --noEmit
pnpm --filter @stratix/forge test
pnpm --filter @stratix/testing exec tsc --noEmit
pnpm --filter @stratix/testing test
```

后续应补充的排除 tasks 验证：

```bash
pnpm run build:supported
pnpm run test:supported
```

如果 turbo 过滤语法或 workspace 配置导致命令不可用，必须记录替代包级命令矩阵。

## 4. 当前 P0/P1 门禁项

| 等级 | 项目 | 判定 |
| --- | --- | --- |
| P0 | forge `business-repository` 模板必须生成当前 `BaseRepository` 构造方式 | 已关闭；`@stratix/forge` 当前测试 33/33 通过 |
| P1 | `@stratix/database` 不能把未实现 MSSQL 当成稳定支持能力 | 已关闭；stable supported list 仅保留 PostgreSQL/MySQL/SQLite |
| P1 | database 读写分离配置必须真实生效，或文档降级为未实现 | 已关闭；读写连接使用显式配置连接名并补回归测试 |
| P1 | database 健康检查必须跨 SQLite/MySQL/PostgreSQL 成立 | 已关闭；健康检查改为原始 `SELECT 1 AS health` |
| P1 | 高风险自动清表行为必须改为显式 opt-in 或移出稳定 API | 已关闭；`clearExistingData` 显式 opt-in，默认追加数据 |

## 5. 第一轮已验证结果

| 命令 | 结果 | 说明 |
| --- | --- | --- |
| `pnpm --filter @stratix/database exec tsc --noEmit` | 通过 | database 类型门禁 |
| `pnpm --filter @stratix/database exec vitest run` | 通过 | 8 files / 48 tests |
| `pnpm --filter @stratix/create exec tsc --noEmit` | 通过 | create 类型门禁 |
| `pnpm --filter @stratix/create test` | 通过 | 2 tests，覆盖 app/plugin 创建、create 模板清单和目标项目 `@stratix/forge` devDependency 写入 |
| `pnpm --filter @stratix/create run build` | 通过 | create 构建门禁 |
| `pnpm --filter @stratix/forge exec tsc --noEmit` | 通过 | forge 类型门禁 |
| `pnpm --filter @stratix/forge test` | 通过 | 33 tests，覆盖 `doctor di`、`di graph`、`doctor modules`、`graph modules`、`openapi generate`、`openapi client`、命令 help 和生成资源 DI/schema 检查 |
| project manifest v2 | 通过 | create 生成 `.stratix/project.json` `schemaVersion: 2` 与 template contribution 快照；forge `add/doctor` 只读项目 manifest/presets/resource templates |
| `pnpm --filter @stratix/core exec tsc --noEmit` | 通过 | core 类型门禁 |
| `pnpm --filter @stratix/core exec vitest run src/plugin/__tests__/adapter-registration.test.ts` | 通过 | adapter token 契约测试 4 tests |
| `pnpm --filter @stratix/core exec vitest run` | 通过 | 27 files / 188 tests，覆盖 route contract/OpenAPI、统一错误 envelope、response schema failure 归一化、DI diagnostics、plugin adapter diagnostics、discovery schema validation 和 DI graph |
| `pnpm --filter @stratix/testing test` | 通过 | 3 files / 12 tests，覆盖 smoke、`contractTest()`、共享错误 envelope schema、test app、DI override、plugin fixture、discovery fixture、repository fixture、module fixture |
| `pnpm --filter @stratix/testing exec tsc -p tsconfig.json --noEmit` | 通过 | testing 类型门禁 |
| `pnpm --filter @stratix/testing build` | 通过 | testing 构建门禁 |
| `CI=true pnpm --filter @stratix/core exec vitest run src/contracts/__tests__/route-contract.test.ts src/diagnostics/__tests__/di-diagnostics.test.ts src/discovery/__tests__/application-pipeline.test.ts src/__tests__/public-api-contract.test.ts` | 通过 | 4 files / 11 tests，Phase 2 定向门禁 |
| `CI=true pnpm --filter @stratix/core exec vitest run src/__tests__/public-api-contract.test.ts src/discovery/__tests__/application-pipeline.test.ts src/bootstrap/__tests__/application-discovery-bootstrap.test.ts src/plugin/__tests__/module-discovery.test.ts src/plugin/__tests__/unified-module-processor.test.ts src/plugin/__tests__/auto-di-plugin.test.ts` | 通过 | 6 files / 21 tests，覆盖 public API 负向断言、默认不扫描 `executors/`、插件无 executor 结果 |
| `pnpm --filter @stratix/core run build` | 通过 | executor 删除后 core 构建通过 |
| `pnpm --filter @stratix/core pack --pack-destination /tmp` | 通过 | `/tmp/stratix-core-1.1.0.tgz`，tarball 无 executor 路径 |
| `pnpm --filter @stratix/forge run build` | 通过 | forge 删除 executor 模板和旧 init 入口后构建通过 |
| `pnpm run build:supported` | 通过 | 10 supported packages，排除 `@stratix/tasks` |
| `pnpm run test:supported` | 通过 | 12 turbo tasks；supported packages 全部通过 |
| `pnpm --filter @stratix/was-v7 test` | 通过 | 11 files / 120 tests |
| `node packages/create/dist/bin/create-stratix.js --help` | 通过 | create 暴露 app/plugin 创建帮助 |
| `node packages/create/dist/bin/create-stratix.js list templates` | 通过 | create 只列出 app/plugin 创建模板 |
| `node packages/forge/dist/bin/stratix.js list templates` | 通过 | 模板清单无 executor / plugin-executor |
| `node packages/forge/dist/bin/stratix.js list presets` | 通过 | `tasks` preset 显示 deprecated |
| `node packages/forge/dist/bin/stratix.js init` | 预期失败 | forge 拒绝旧创建入口，输出 `Unknown command: init` |
| `node packages/forge/dist/bin/stratix.js doctor di --help` | 通过 | 构建产物暴露 DI doctor 子命令 |
| `node packages/forge/dist/bin/stratix.js di graph --help` | 通过 | 构建产物暴露 DI graph 子命令 |
| `node packages/forge/dist/bin/stratix.js doctor modules --help` | 通过 | 构建产物暴露 Module doctor 子命令 |
| `node packages/forge/dist/bin/stratix.js graph modules --help` | 通过 | 构建产物暴露 Module graph 子命令 |
| `node packages/forge/dist/bin/stratix.js openapi generate --help` | 通过 | 构建产物暴露 OpenAPI 生成命令 |
| `node packages/forge/dist/bin/stratix.js openapi client --help` | 通过 | 构建产物暴露 typed client 生成命令 |
| `rg -n "generateOpenApiDocument\|from '@stratix/core'\|from \"@stratix/core\"\|@stratix/core" packages/forge/src/commands/openapi packages/forge/tests/stubs/stratix-core.stub.ts packages/forge/package.json` | 通过 | OpenAPI forge 命令路径和 forge 包清单不依赖 core |
| `pnpm --filter @stratix/forge pack --pack-destination /tmp` | 通过 | `/tmp/stratix-forge-1.1.0.tgz`，发布包只携带 resource/preset 模板 |
| `tar -tf /tmp/stratix-forge-1.1.0.tgz \| rg 'templates/(apps\|plugins)'` | 通过 | 发布包无 app/plugin 创建模板 |
| `rg -n "loadTemplateManifest\\('apps'\|loadTemplateManifest\\('plugins'\|listTemplateManifests\\('apps'\|listTemplateManifests\\('plugins'\|templates/apps\|templates/plugins" packages/forge/src packages/forge/package.json` | 通过 | forge 源码与包清单不依赖 create-owned 模板 |
| `rg -n "Executor|executor|EXECUTOR|@Executor|registerTaskExecutor|registerExecutorDomain|TaskExecutor|executorModules|executorConfigs" packages/core/src packages/forge/src packages/forge/templates packages/create/src packages/create/templates -g '!**/__tests__/**' -g '!**/*.test.ts' -g '!**/*.spec.ts'` | 通过 | 无生产命中 |
| `rg --files packages/core/src packages/core/dist packages/forge/templates packages/create/templates \| rg -i 'executor'` | 通过 | 无路径命中 |
| `tar -tf /tmp/stratix-core-1.1.0.tgz \| rg -i 'executor'` | 通过 | 发布包无 executor 路径 |
| `rg -n "@Executor\|EXECUTOR_METADATA_KEY\|registerTaskExecutor\|registerExecutorDomain\|processExecutorRegistration\|Executor\\b\|executors/\|plugin-executor\|performApplicationAutoDI\|applicationAutoDI\|discoverAndProcessApplicationModules\|generate executor\|createSafeExecutor\|executor" docs/03-developer-guide -g '*.md'` | 通过 | 开发者指南无旧 executor/API 教程残留 |
| `uvx --from docs-stratego docs-stratego source validate --repo-path .` | 通过 | 84 pages / 0 contracts |
| `git diff --check` | 通过 | 本阶段代码与文档补丁无 whitespace 错误 |

## 6. 复评记录

| 日期 | 参与角色 | 架构 | 代码 | 测试 | 文档 | 发布 | QA | 结论 |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| 2026-06-17 | 技术总监/架构/开发/测试/QA/文档 | 96 | 96 | 96 | 96 | 96 | 96 | 全部达到 95+，`TASK-003` 可进入完成态 |
| 2026-06-18 | 技术总监/架构/开发/测试/QA/文档 | 97 | 97 | 96 | 96 | 96 | 97 | Phase 1 executor 删除达到 95+；Phase 2 进入 Contract-first 与 DI doctor |
| 2026-06-18 | 技术总监/架构/开发/测试/QA/文档 | 97 | 97 | 97 | 97 | 96 | 97 | Phase 2 基础能力达到 95+；开发者指南已清理旧概念；随后进入 OpenAPI forge command、typed client、contractTest 和 plugin diagnostics 扩展工作流 |
| 2026-06-18 | 技术总监/架构/开发/测试/QA/文档 | 98 | 98 | 98 | 98 | 97 | 98 | Phase 2 扩展工作流达到 95+；OpenAPI forge command/typed client/contractTest/plugin diagnostics 已落地，forge 零运行时依赖边界已锁定 |
| 2026-06-18 | 技术总监/架构/开发/测试/QA/文档 | 98 | 98 | 98 | 98 | 97 | 98 | create/forge 工具边界达到 95+；create 只负责 app/plugin 创建，forge 负责项目内工程命令，supported build 10/10、test 12 tasks 通过 |
| 2026-06-18 | 技术总监/架构/开发/测试/QA/文档 | 98 | 98 | 98 | 98 | 97 | 98 | Phase 3 Module governance 达到 95+；generate module 写入 module.yaml，doctor/graph modules 可验证，runtime 不读取 module manifest |
| 2026-06-18 | 技术总监/架构/开发/测试/QA/文档 | 98 | 98 | 98 | 98 | 97 | 98 | Phase 4 testing 平台基线达到 95+；createTestApp/override/plugin/discovery/repository/module fixture 已落地，testing 3 files / 12 tests、typecheck/build 通过 |

## 7. 残余风险

- `@stratix/tasks` 仍是显式排除项；若未来恢复为 supported package，必须单独迁移旧 database API。
- `build:all` 仍代表全包构建，不等同默认质量门。
- 离线安装和 npm/tag 发布口径仍属于独立 release governance 工作，不阻塞本轮 database/core/create/forge 质量门。
- advanced typed client path params/auth/interceptors、Plugin manifest、Production manifest 仍是后续阶段，不应被 Phase 2/Phase 3/Phase 4 已落地能力替代。
- forge 源码树中物理删除旧 app/plugin 模板目录需要明确删除批准；当前 forge 代码路径和发布包已与这些目录解耦。
