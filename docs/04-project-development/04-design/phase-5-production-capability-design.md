# Phase 5 生产能力设计

## 1. 目标

Phase 5 的目标是把 Stratix 从“开发期动态发现可用”推进到“生产期可验证、可诊断、可发布”。核心能力分为五组：

- Plugin manifest：插件能力、对外 token、运行时依赖和健康检查声明可校验。
- Production manifest：CI 可生成 route、DI、module、plugin-lock 生产 artifact。
- Observability preset：request id、health、trace、metric 有标准入口。
- Security preset：CORS、headers、rate limit、body limit、secret redaction 有默认安全基线。
- DevTools：routes、DI、plugin、config、health、traces 可视化。

## 2. 当前已落地基线

截至 2026-06-18，Phase 5 生产能力已完成可发布最小闭环：

| 能力                         | 状态   | 入口                                                                              |
| ---------------------------- | ------ | --------------------------------------------------------------------------------- |
| 插件治理 manifest            | 已完成 | `@stratix/create` 为 plugin 项目生成 `.stratix/plugin.json`                       |
| 插件 manifest 校验           | 已完成 | `stratix doctor plugins`                                                          |
| 插件拓扑输出                 | 已完成 | `stratix graph plugins --format json\|mermaid`                                    |
| 生产 manifest artifact       | 已完成 | `stratix build-manifest --output .stratix/production-manifest.json`               |
| Runtime manifest consumption | 已完成 | `discovery.productionManifest` 启动读取并校验 artifact                            |
| Manifest-driven registration | 已完成 | `registerFromManifest: true` 时优先注册 v2 `compiledFile`，v1 继续兼容 source files |
| Observability preset         | 已完成 | `config.observability` 提供 request id、trace id、health、metrics、trace snapshot |
| Security preset              | 已完成 | `config.security` 提供 body limit、CORS、headers、rate limit                      |
| DevTools production views    | 已完成 | `@stratix/devtools` 暴露 routes、DI、plugins、config、health、traces              |
| Release gate                 | 已完成 | `stratix release gate --manifest .stratix/production-manifest.json`               |

当前 production manifest 可作为启动期证据被 `@stratix/core` 读取。P2 后 forge 默认生成 `schemaVersion: 2`：manifest 包含 app `RegistrationPlan` 快照、generator/runtime metadata、source hash 和可选 compiled file/hash。配置 `discovery.productionManifest.skipRuntimeDiscovery: true` 时，启动会加载并校验 artifact，然后跳过应用级 runtime glob discovery。配置 `registerFromManifest: true` 时，core 会优先从 v2 manifest 的 `compiledFile` 列表注册 DI 和路由；v1 manifest 仍按 `sourceFile` 兼容读取。

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
  "schemaVersion": 2,
  "generator": {
    "name": "@stratix/forge",
    "version": "1.1.0",
    "command": "build-manifest"
  },
  "runtime": {
    "packageName": "@stratix/core",
    "compatibleVersions": ["1.1.x"],
    "node": ">=24.0.0"
  },
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
  "registrationPlan": {
    "id": "production-manifest:demo-api",
    "source": "production-manifest",
    "owner": {
      "type": "manifest",
      "name": "demo-api"
    },
    "tokens": [],
    "routes": [],
    "adapters": [],
    "lifecycle": [],
    "diagnostics": []
  },
  "artifacts": {
    "algorithm": "sha256",
    "files": [
      {
        "sourceFile": "src/controllers/HealthController.ts",
        "sourceHash": "sha256-...",
        "compiledFile": "dist/controllers/HealthController.js",
        "compiledHash": "sha256-..."
      }
    ]
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

- `schemaVersion: 2` 是 P2 后 `stratix build-manifest` 默认输出；core runtime 仍兼容读取 v1。
- `generator` 与 `runtime` 记录生成器版本、核心 runtime 名称和兼容范围。
- `registrationPlan` 是基于 P1 `RegistrationPlan` 的可序列化 app plan 快照，生产注册优先使用其中的 token/route selector。
- `artifacts.files` 使用 `sha256` 校验 source file；存在 compiled file 时同时校验 compiled hash。
- `routes` 来自源码 route schema 分析，包含 method、path、operationId、controller、handler 和 sourceFile。
- `di.tokens` 来自静态 DI token 分析，保留 token、依赖、className 和 sourceFile。
- `modules` 来自 `module.yaml` 治理图。
- `plugins` 是运行时 preset/package 的 plugin-lock 证据，不包含纯测试工具 preset。

### 3.3 Runtime consumption 配置

```ts
export default {
  server: {},
  plugins: [],
  autoLoad: {},
  discovery: {
    enabled: true,
    productionManifest: {
      enabled: true,
      path: '.stratix/production-manifest.json',
      skipRuntimeDiscovery: true,
      registerFromManifest: true,
      strict: true
    }
  }
};
```

字段规则：

- `enabled` 为 `true` 时，启动期读取并校验 production manifest。
- `path` 省略时默认读取 `.stratix/production-manifest.json`。
- `skipRuntimeDiscovery` 为 `true` 时，加载 manifest 后跳过应用级 glob discovery。
- `registerFromManifest` 为 `true` 时，runtime 只导入 manifest 中记录的 route/DI 文件并完成注册；v2 优先导入 `compiledFile`，v1 使用 `sourceFile`。
- `strict` 默认为严格模式；manifest 不存在或 schema 不合法时启动失败。设置为 `false` 时，manifest 加载失败会退回普通启动路径。
- 顶层 `discovery.enabled: false` 仍是总开关，此时不会读取 production manifest。

### 3.4 Observability 配置

```ts
export default {
  observability: {
    enabled: true,
    requestIdHeader: 'x-request-id',
    traceIdHeader: 'x-trace-id',
    health: {
      enabled: true,
      basePath: '/health'
    },
    metrics: {
      enabled: true,
      path: '/metrics'
    },
    traces: {
      enabled: true,
      maxEntries: 100
    }
  }
};
```

运行时行为：

- 为每个请求生成或继承 request id / trace id，并写回响应头。
- 暴露 `/health`、`/health/ready`、`/health/live`。
- 暴露 `/metrics`，返回请求计数、状态码分布、trace snapshot 和 uptime。

### 3.5 Security 配置

```ts
export default {
  security: {
    enabled: true,
    bodyLimit: 1048576,
    cors: {
      enabled: true,
      origins: ['https://console.example.com']
    },
    headers: {
      enabled: true,
      contentSecurityPolicy: "default-src 'self'"
    },
    rateLimit: {
      enabled: true,
      max: 100,
      windowMs: 60000
    }
  }
};
```

运行时行为：

- `bodyLimit` 进入 Fastify server options。
- CORS 会处理 preflight，并在响应中写入允许的 origin/method/header。
- 默认安全响应头包含 `x-content-type-options`、`x-frame-options`、`referrer-policy` 和 CSP。
- rate limit 使用统一错误 envelope 返回 `RATE_LIMITED`。

### 3.6 DevTools production views

`@stratix/devtools` 在传入或从 Fastify decorator 读取 production manifest 后，可提供以下只读生产视图：

| 路径                    | 内容                                                  |
| ----------------------- | ----------------------------------------------------- |
| `/_stratix/api/routes`  | manifest routes 或 runtime routes                     |
| `/_stratix/api/di`      | manifest DI tokens/issues 或 runtime container tokens |
| `/_stratix/api/plugins` | manifest plugin-lock 或 runtime plugin config         |
| `/_stratix/api/config`  | redacted runtime config                               |
| `/_stratix/api/health`  | health check 结果                                     |
| `/_stratix/api/traces`  | observability trace snapshot                          |

### 3.7 Release gate

```bash
stratix release gate --manifest .stratix/production-manifest.json
stratix release gate --dry-run --manifest .stratix/production-manifest.json
```

Release gate 当前纳入以下生产检查项：

- build
- test
- docs
- security
- pack
- api
- manifest

`--dry-run` 用于 CI 预检 release plan、manifest 存在性、schemaVersion、project、routes、DI token 结构；v2 manifest 还会校验 generator/runtime metadata、registration plan、artifact hash 和 compiled artifact 证据。

## 4. Phase 5 实现状态

| 顺序 | 能力                         | 状态   |
| ---: | ---------------------------- | ------ |
|    1 | Runtime manifest consumption | 已完成 |
|    2 | Manifest-driven registration | 已完成 |
|    3 | Observability preset         | 已完成 |
|    4 | Security preset              | 已完成 |
|    5 | DevTools production views    | 已完成 |
|    6 | Release gate                 | 已完成 |

## 5. 验收标准

| 验收项                                                                                               | 状态 | 证据                    |
| ---------------------------------------------------------------------------------------------------- | ---- | ----------------------- |
| `stratix doctor plugins` 对缺失 capabilities、依赖未安装、重复 provides 给出非零退出                 | 通过 | forge CLI 回归测试      |
| `stratix graph plugins --format json\|mermaid` 可被文档和 DevTools 复用                              | 通过 | forge CLI 回归测试      |
| `stratix build-manifest` 可在 CI 中生成 schemaVersion 2 可归档 artifact                              | 通过 | forge CLI 回归测试      |
| 生产启动可读取 manifest，并在 `skipRuntimeDiscovery` 为 `true` 时不执行应用级 runtime glob discovery | 通过 | core bootstrap 回归测试 |
| `registerFromManifest: true` 只导入 manifest 文件并完成 DI/路由注册；v2 优先 compiled files          | 通过 | core bootstrap 回归测试 |
| production manifest v2 可校验 source/compiled hash 并在 release gate 中拒绝 stale artifact           | 通过 | core / forge 回归测试   |
| observability/security preset 有独立测试证据                                                         | 通过 | core bootstrap 回归测试 |
| DevTools 能展示 route、DI、plugin、config、health、trace 数据                                        | 通过 | devtools 回归测试       |
| Release gate 能校验 production manifest 并输出发布检查计划                                           | 通过 | forge CLI 回归测试      |

## 6. 变更记录

| 日期       | 变更                                                                                                                 | 作者  |
| ---------- | -------------------------------------------------------------------------------------------------------------------- | ----- |
| 2026-06-18 | 新增 Phase 5 生产能力设计，并记录 Plugin/Production manifest artifact 基线                                           | Codex |
| 2026-06-18 | 记录 runtime production-manifest consumption 最小基线：启动期读取 artifact，并可跳过 runtime glob discovery          | Codex |
| 2026-06-18 | 完成 Phase 5：manifest-driven registration、observability/security preset、DevTools production views 与 release gate | Codex |
| 2026-06-19 | 完成 P2 production manifest v2 兼容式基线：RegistrationPlan 快照、artifact hash 校验、compiled-file registration 与 release gate v2 校验 | Codex |
