# Environment 与 Auth API（v1.1.0）

版本切换：[函数 API 版本索引](../index.md) | [v1.1.0 概览](./index.md)  
主题切换：[Core 总览](./core.md) | [Service API](./service.md) | [Functional 总览](./functional.md)

这一页覆盖：

- `@stratix/core/environment`
- `@stratix/core/auth`

<a id="page-summary"></a>
## 页面摘要

- 这一页覆盖运行环境读取、平台检测，以及基于请求头的身份与权限判断。
- 配置读取先看 `environment`，接口身份校验再看 `auth`；它们经常一起出现，但职责不同。
- 如果你的应用已经有统一网关或认证层，先确认请求头契约，再决定是否直接采用这里的 `auth` API。

<a id="page-nav"></a>
## 页内导航

- [@stratix/core/environment](#environment-api)
- [环境变量函数](#environment-vars)
- [@stratix/core/auth](#auth-api)
- [核心类型](#auth-types)
- [权限判断函数](#auth-functions)
- [使用建议](#usage-notes)

<a id="environment-api"></a>
## `@stratix/core/environment`

<a id="environment-vars"></a>
## 环境变量函数

| API | 参数 | 返回值 | 说明 |
|---|---|---|---|
| `get(key, defaultValue?, transform?)` | 环境变量名、默认值、转换函数 | `string \| T \| undefined` | 通用读取入口 |
| `getBoolean(key, defaultValue?)` | 环境变量名、默认布尔值 | `boolean` | 把 `true/1/yes` 视为 `true` |
| `getNumber(key, defaultValue?)` | 环境变量名、默认数值 | `number` | 转数字，失败退默认值 |
| `getArray(key, defaultValue?, separator?)` | 环境变量名、默认数组、分隔符 | `string[]` | 按分隔符拆数组 |
| `getObject(key, defaultValue?)` | 环境变量名、默认对象 | `T` | 解析 JSON 字符串 |
| `required(key, message?)` | 环境变量名、自定义错误消息 | `string` | 必填读取，不存在则抛错 |
| `hasEnv(key)` | 环境变量名 | `boolean` | 检查环境变量是否存在 |
| `getAll()` | 无 | `Record<string, string>` | 获取当前环境变量副本 |
| `set(key, value)` | 环境变量名、值 | `void` | 只在当前进程运行时设置 |

### 环境状态函数

| API | 参数 | 返回值 | 说明 |
|---|---|---|---|
| `getNodeEnv()` | 无 | `string` | 获取 `NODE_ENV`，默认 `development` |
| `isDevelopment()` | 无 | `boolean` | 是否开发环境 |
| `isProduction()` | 无 | `boolean` | 是否生产环境 |
| `isTest()` | 无 | `boolean` | 是否测试环境 |

### 平台检测函数

| API | 参数 | 返回值 | 说明 |
|---|---|---|---|
| `isBrowser()` | 无 | `boolean` | 当前是否浏览器环境 |
| `isNode()` | 无 | `boolean` | 当前是否 Node.js 环境 |
| `isWebWorker()` | 无 | `boolean` | 当前是否 WebWorker |
| `supportsWebAPI(apiName)` | API 名称 | `boolean` | 检查某个 Web API 是否存在 |
| `supportsCSS(property)` | CSS 属性名 | `boolean` | 检查 CSS 属性是否被当前环境支持 |
| `getEnvironment()` | 无 | 环境摘要对象 | 返回更完整的环境信息 |
| `isSSR()` | 无 | `boolean` | 是否服务端渲染环境 |
| `getOSType()` | 无 | `'windows' \| 'macos' \| 'linux' \| 'unknown'` | 获取操作系统类型 |
| `getBrowserInfo()` | 无 | `{ name: string; version: string } \| null` | 获取浏览器名称与版本 |

### 使用示例

```ts
import {
  get,
  getBoolean,
  getNumber,
  required
} from '@stratix/core/environment';

const appName = get('APP_NAME', 'demo-app');
const port = getNumber('APP_PORT', 3000);
const debug = getBoolean('DEBUG', false);
const secret = required('APP_SECRET');
```

<a id="auth-api"></a>
## `@stratix/core/auth`

这组 API 假设身份信息来自网关透传请求头。

<a id="auth-types"></a>
## 核心类型

| 类型 | 说明 |
|---|---|
| `UserIdentity` | 用户身份对象，包含 `userId`、`roles`、`permissions` 等 |
| `IdentityHeaders` | 支持的请求头结构 |
| `IdentityErrorType` | 身份错误类型 |
| `IdentityError` | 身份错误对象 |
| `IdentityValidationResult` | 请求头解析结果 |
| `IdentityContext` | 请求中的身份上下文 |
| `OnRequestPermissionHookOptions` | 权限 Hook 选项 |

<a id="auth-functions"></a>
## 权限判断函数

| API | 参数 | 返回值 | 说明 |
|---|---|---|---|
| `hasPermission(identity, permission)` | 用户身份、权限名 | `boolean` | 判断是否包含某个权限 |
| `hasRole(identity, role)` | 用户身份、角色名 | `boolean` | 判断是否包含某个角色 |
| `hasUserType(identity, requiredType)` | 用户身份、用户类型 | `boolean` | 判断用户类型是否匹配 |

### `onRequestPermissionHook(handles, options?)`

生成 Fastify `onRequest` 权限校验钩子。

参数：

| 参数 | 类型 | 说明 |
|---|---|---|
| `handles` | `Array<(identity: UserIdentity) => boolean>` | 权限判断函数数组 |
| `options.skipPaths` | `string[]` | 需要跳过权限检查的路径，可精确匹配或前缀匹配 |
| `options.mode` | `'and' \| 'or'` | 多个判断函数之间的逻辑关系，默认 `or` |

返回值：

| 返回值 | 说明 |
|---|---|
| `Fastify onRequest hook` | 一个异步钩子函数，会在失败时返回 `401` 或 `403` |

行为说明：

- 先检查是否命中 `skipPaths`
- 再从请求头解析身份
- 如果身份缺失或解析失败，返回 `401`
- 如果权限检查失败，返回 `403`
- 校验通过后，会把 `userIdentity` 挂到 `request`

### 使用示例

```ts
import {
  hasPermission,
  hasRole,
  onRequestPermissionHook
} from '@stratix/core/auth';

fastify.addHook('onRequest', onRequestPermissionHook([
  (identity) => hasRole(identity, 'admin'),
  (identity) => hasPermission(identity, 'order:read')
], {
  mode: 'or',
  skipPaths: ['/health']
}));
```

<a id="usage-notes"></a>
## 使用建议

- 权限字符串命名尽量稳定，例如 `order:read`、`order:create`。
- 网关透传头字段要在团队内统一，避免应用自己猜测字段名。
- 如果接口允许匿名访问，用 `skipPaths` 或者在更上层拆开路由，不要在业务代码里到处写“没用户也放行”。
