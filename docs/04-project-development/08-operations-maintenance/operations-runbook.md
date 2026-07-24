# 运维手册

**项目名称：** stratix框架以及生态  
**文档状态：** 已发布  
**负责人：** 仓库维护者  
**主要读者：** 维护者 | 运维支持 | QA  
**上游输入：** 部署与运行说明 | 当前状态分析 | 发布检查清单  
**下游输出：** 巡检记录 | 故障处理记录 | 状态回写  
**关联 ID：** `OPS-001`, `OPS-002`, `TASK-001`  
**最后更新：** 2026-07-04

## 1. 日常巡检入口

在 `1.1.0` 分支上优先执行：

```bash
pnpm run docs:validate
pnpm run build:supported
pnpm run test:supported
pnpm run release:gate:dry-run
```

发布前或发布候选 commit 上执行：

```bash
pnpm run quality:release
pnpm run release:gate
```

## 2. CLI 烟测入口

构建后检查 create 与 forge：

```bash
node packages/create/dist/bin/create-stratix.js --help
node packages/create/dist/bin/create-stratix.js list templates
node packages/forge/dist/bin/stratix.js --help
node packages/forge/dist/bin/stratix.js doctor di --help
node packages/forge/dist/bin/stratix.js openapi generate --help
node packages/forge/dist/bin/stratix.js release gate --scope workspace --dry-run
```

`packages/cli` 不是保留目录；旧口径应改为 `packages/create` 与 `packages/forge`。

## 3. 常见故障处理

| 现象 | 优先检查 | 处理方式 |
|---|---|---|
| 远端 CI 缺少模板文件 | `.gitignore`、`git ls-files`、create/forge preset 模板 | 确认 `.env.example.tpl` 等模板文件没有被忽略，并进入 Git |
| `release:gate` 阻断 exact tag | tag 是否存在、是否指向当前 commit | 在最终发布 commit 上重建或移动 tag，并推送到 origin 后重跑门禁 |
| registry gate 失败 | exact package version 是否已存在 | 如果 public npmjs 已存在同版本，不得复用版本发布 |
| `pack` gate 失败 | tarball 是否缺少 `main`/`types` 或包含开发文件 | 修正 package `files`、构建产物或 pack 校验问题后重跑 |
| docs validation 失败 | `docs/index.md` 导航、页面路径、权限字段 | 修正根导航或缺失页面后运行 `pnpm run docs:validate` |

## 4. 证据回写规则

新的验证结论只能写入当前状态资产：

- `.factory/project.json`
- `.factory/memory/current-state.md`
- `docs/04-project-development/02-discovery/current-state-analysis.md`

稳定协作规则不要写入 `AGENTS.md` 或 `GEMINI.md`。

## 5. 升级与发布边界

- `@stratix/create` 创建 app/plugin/template 项目。
- `@stratix/forge` 负责项目内 generate、doctor、graph、openapi、build-manifest、release、start、config 和 list。
- `@stratix/tasks` 已从当前 1.1.x workspace 和发布面物理移除；恢复必须单独立项。
- npm publish 需要维护者凭证，不能由本地 dry-run 结果替代。

## 6. 变更记录

| 日期 | 变更内容 | 变更人 |
|---|---|---|
| 2026-07-04 | 建立运维手册，补齐巡检、CLI 烟测、故障处理与证据回写路径 | Codex |
