# Phase 5 生产能力设计

## 1. 目标

Phase 5 的目标是把 Stratix 从“开发期动态发现可用”推进到“生产期可验证、可诊断、可发布”。核心能力分为五组：

- Plugin manifest：插件能力、对外 token、运行时依赖和健康检查声明可校验。
- Production manifest：CI 可生成 route、DI、module、plugin-lock 生产 artifact。
- Observability preset：request id、health、trace、metric 有标准入口。
- Security preset：CORS、headers、rate limit、body limit、secret redaction 有默认安全基线。
- DevTools：routes、DI、plugin、config、health、traces 可视化。

## 2. 当前已落地基线

截至 2026-06-18，本轮已落地 manifest 最小闭环：

| 能力 | 状态 | 入口 |
|---|---|---|
| 插件治理 manifest | 已完成基线 | `@stratix/create` 为 plugin 项目生成 `.stratix/plugin.json` |
| 插件 manifest 校验 | 已完成基线 | `stratix doctor plugins` |
| 插件拓扑输出 | 已完成基线 | `stratix graph plugins --format json\|mermaid` |
| 生产 manifest artifact | 已完成基线 | `stratix build-manifest --output .stratix/production-manifest.json` |

当前 production manifest 是构建期证据，不改变 runtime startup 行为。生产启动读取 manifest、跳过 runtime glob discovery 是后续 Phase 5 hardening。

## 3. Manifest 契约

### 3.1 Plugin manifest

文件路径：`.stratix/plugin.json`。

```json
{
  "schemaVersion": 1,
  "name": "@demo/cache-plugin",
  "version": "0.1.0",
  "capabilities": ["data"],
  "provides": ["cachePluginApi"],
  "requires": ["@stratix/database"],
  "health": true
}
```

字段规则：

- `name` 与 package name 对齐。
- `capabilities` 表示插件能力分类，可用于文档和生态目录。
- `provides` 表示插件向根容器暴露的 adapter token。
- `requires` 表示运行时插件依赖，必须在 `package.json` dependencies、devDependencies 或 peerDependencies 中可解析。
- `health` 表示插件是否应进入健康检查矩阵。

### 3.2 Production manifest

默认路径：`.stratix/production-manifest.json`。

```json
{
  "schemaVersion": 1,
  "project": {
    "kind": "app",
    "type": "api",
    "runtime": "web",
    "presets": ["testing", "redis"]
  },
  "discovery": {
    "rootDir": ".",
    "patterns": ["src/**/*.ts"],
    "routing": {
      "enabled": true
    }
  },
  "routes": [],
  "di": {
    "tokens": [],
    "issues": []
  },
  "modules": [],
  "moduleIssues": [],
  "plugins": []
}
```

字段规则：

- `routes` 来自源码 route schema 分析，包含 method、path、operationId、controller、handler 和 sourceFile。
- `di.tokens` 来自静态 DI token 分析，保留 token、依赖、className 和 sourceFile。
- `modules` 来自 `module.yaml` 治理图。
- `plugins` 是运行时 preset/package 的 plugin-lock 证据，不包含纯测试工具 preset。

## 4. 后续 Phase 5 实现顺序

1. Runtime manifest consumption：允许生产配置指定 production manifest，使启动路径优先读取 artifact，减少 runtime glob。
2. Observability preset：统一 request id、health/readiness/liveness、trace id、metric hook。
3. Security preset：默认 CORS、security headers、rate limit、body limit、secret redaction。
4. DevTools production views：展示 routes、DI、plugins、config redaction、health、traces。
5. Release gate：把 build/test/docs/security/pack/API surface 和 production manifest 校验纳入发布门禁。

## 5. 验收标准

- `stratix doctor plugins` 对缺失 capabilities、依赖未安装、重复 provides 给出非零退出。
- `stratix graph plugins --format json|mermaid` 可被文档和 DevTools 复用。
- `stratix build-manifest` 可在 CI 中生成可归档 artifact。
- 生产启动读取 manifest 后可选择不执行 runtime glob discovery。
- observability/security preset 有独立测试和示例应用证据。
- DevTools 面板能展示真实 route、DI、plugin、config、health、trace 数据。

## 6. 变更记录

| 日期 | 变更 | 作者 |
|---|---|---|
| 2026-06-18 | 新增 Phase 5 生产能力设计，并记录 Plugin/Production manifest artifact 基线 | Codex |
