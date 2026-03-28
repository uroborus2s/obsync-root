# Logger 与 Utils API（v1.1.0）

版本切换：[函数 API 版本索引](../index.md) | [v1.1.0 概览](./index.md)  
主题切换：[Core 总览](./core.md) | [Service API](./service.md) | [Functional 总览](./functional.md)

这一页覆盖：

- `@stratix/core/logger`
- `@stratix/core/utils`
- `@stratix/core` 根出口里的加密、错误处理、文件扫描相关函数

<a id="page-summary"></a>
## 页面摘要

- 这一页覆盖日志、加密配置、错误处理和文件扫描等偏基础设施的 API。
- 如果你在写应用入口、配置工具、诊断脚本或 CLI，通常会比业务模块更频繁地用到这里的能力。
- `@stratix/core/utils` 只是聚合出口；真正按职责理解时，应优先按 logger、crypto、error、scanner 这些主题来查。

<a id="page-nav"></a>
## 页内导航

- [Logger](#logger-api)
- [加密与配置函数](#crypto-config)
- [错误处理函数](#error-utils)
- [文件扫描器](#file-scanner)
- [@stratix/core/utils 聚合出口](#utils-aggregate)

<a id="logger-api"></a>
## Logger

### `createLogger(options?, destination?)`

这是 `pino` 的直接导出别名。

| 项 | 说明 |
|---|---|
| 作用 | 创建独立 Pino logger |
| 参数 | Pino 原生 `options` 与 `destination` |
| 返回值 | Pino logger |
| 适合 | 独立工具、测试、简单脚本 |

### `LoggerFactory.createUnifiedLogger(options?, extraStream?)`

框架推荐的统一 logger 入口。

| 参数 | 类型 | 说明 |
|---|---|---|
| `options` | `StratixRunOptions` | 启动参数，里面可带 logger 配置 |
| `extraStream` | `any` | 额外日志流 |

返回值：统一的 Pino 实例

特点：

- 复用单例 logger
- 开发态默认走美化输出
- 生产态默认 JSON 输出
- 会自动做敏感字段脱敏

### `getLogger()`

| 项 | 说明 |
|---|---|
| 作用 | 获取当前统一 logger |
| 返回值 | 当前 logger；若未初始化则回退 `console` |

<a id="crypto-config"></a>
## 加密与配置函数

### `encrypt(data, options?)`

| 参数 | 类型 | 说明 |
|---|---|---|
| `data` | `string \| Buffer` | 待加密内容 |
| `options.algorithm` | `EncryptionAlgorithm` | 默认 `AES_256_GCM` |
| `options.key` | `string \| Buffer` | 自定义密钥 |
| `options.iv` | `Buffer` | 初始化向量 |
| `options.outputFormat` | `'base64' \| 'hex' \| 'buffer'` | 输出格式 |
| `options.useDefaultKey` | `boolean` | 是否使用内置默认密钥 |
| `options.verbose` | `boolean` | 是否输出详细日志 |

返回值：`EncryptResult`

| 字段 | 说明 |
|---|---|
| `encrypted` | 加密后的内容 |
| `iv` | 初始化向量 |
| `authTag` | GCM 模式认证标签 |

### `decrypt(encrypted, iv, authTag, options?)`

| 参数 | 类型 | 说明 |
|---|---|---|
| `encrypted` | `string \| Buffer` | 加密内容 |
| `iv` | `Buffer` | 初始化向量 |
| `authTag` | `Buffer \| undefined` | GCM 标签 |
| `options` | `DecryptOptions` | 解密配置 |

返回值：`string`

### `encryptConfig(config, options?)`
### `decryptConfig(encryptedConfig, options?)`

| API | 作用 | 返回值 |
|---|---|---|
| `encryptConfig()` | 把 JSON 配置对象加密为字符串 | `string` |
| `decryptConfig()` | 把加密字符串解回配置对象 | `Record<string, any>` |

注意：

- `config` 必须是可序列化 JSON 对象
- `encryptConfig()` 输出格式是 `iv.authTag.encrypted`

### `validateConfig(config, options?)`

| 项 | 说明 |
|---|---|
| 作用 | 校验配置对象结构 |
| 参数 | 配置对象与 `ConfigValidationOptions` |
| 返回值 | `ConfigValidationResult` |

`ConfigValidationOptions`：

| 字段 | 说明 |
|---|---|
| `requiredKeys` | 必需的顶级键 |
| `customValidator` | 自定义校验器 |
| `strict` | 严格模式，未知键会产生警告 |

### `generateSecureKey(length?, format?)`

| 参数 | 类型 | 说明 |
|---|---|---|
| `length` | `number` | 字节长度，默认 `32` |
| `format` | `'hex' \| 'base64' \| 'buffer'` | 输出格式 |

返回值：`string | Buffer`

### `loadConfigFromFile(filePath)`
### `saveConfigToFile(config, filePath, format?)`

| API | 作用 |
|---|---|
| `loadConfigFromFile(filePath)` | 从 JSON 文件读取配置 |
| `saveConfigToFile(config, filePath, format?)` | 保存为 `json` 或 `env` 形式 |

<a id="error-utils"></a>
## 错误处理函数

### `StratixError`

框架统一错误类型。

| 构造参数 | 说明 |
|---|---|
| `type` | `StratixErrorType` |
| `message` | 错误消息 |
| `code` | 自定义错误码 |
| `context` | 上下文 |
| `cause` | 原始错误 |

### `HandleErrors(errorType?)`

方法装饰器。  
用于把方法异常统一包装后交给全局错误处理器。

### `safeExecute(fn, errorType, context?)`

| 项 | 说明 |
|---|---|
| 作用 | 安全执行函数，失败时返回 `null` 并记录错误 |
| 返回值 | `Promise<T | null>` |

### 错误工厂

| API | 作用 |
|---|---|
| `createErrorFactory(type)` | 创建指定错误类型的工厂函数 |
| `createPluginError` | 插件注册错误工厂 |
| `createDIError` | 依赖注入错误工厂 |
| `createRouteError` | 路由注册错误工厂 |
| `createContainerError` | 容器管理错误工厂 |

### `ErrorUtils`

`ErrorUtils` 是更底层的函数式错误处理工具集。

| API | 作用 |
|---|---|
| `extractMessage(error)` | 提取错误消息 |
| `wrapError(error, options)` | 包装错误并补上下文 |
| `safeExecute(fn, options)` | 异步安全执行，失败回默认值 |
| `safeExecuteSync(fn, options)` | 同步安全执行 |
| `createErrorWrapper(context, logger?)` | 生成预绑定上下文的包装器 |
| `createSafeExecutor(component, logger?, defaultLogLevel?)` | 生成预绑定组件名的安全执行器 |
| `isError(value)` | 判断是否 `Error` |
| `isErrorOfType(error, errorClass)` | 判断指定错误类型 |
| `extractErrorCode(error)` | 提取错误码 |
| `isSystemError(error)` | 判断是否 Node 系统错误 |
| `formatForLogging(error, context?)` | 生成结构化日志对象 |

### `withErrorHandling(fn, context, logger?)`

把普通函数或异步函数包成“发生异常时自动补上下文”的版本。

### `withRetry(fn, options)`

错误工具层的 Promise 重试器。

| 参数 | 说明 |
|---|---|
| `fn` | 要重试执行的异步函数 |
| `options.maxRetries` | 最大重试次数 |
| `options.delay` | 初始延迟 |
| `options.backoff` | `'linear'` 或 `'exponential'` |
| `options.logger` | 可选 logger |
| `options.context` | 可选上下文 |

<a id="file-scanner"></a>
## 文件扫描器

### `FileScanner.scanFiles(pattern, options?)`

| 项 | 说明 |
|---|---|
| 作用 | 按 glob 模式扫描文件 |
| 参数 | 模式串与 `ScanOptions` |
| 返回值 | `Promise<string[]>` |

`ScanOptions`：

| 字段 | 说明 |
|---|---|
| `cwd` | 工作目录 |
| `recursive` | 是否递归 |
| `exclude` | 排除模式列表 |
| `includeHidden` | 是否包含隐藏文件 |
| `maxDepth` | 最大深度 |

适合：

- 自动发现模块文件
- 批量扫描配置文件、模板文件
- 工具脚本中的文件选择

<a id="utils-aggregate"></a>
## `@stratix/core/utils` 聚合出口

这个出口统一转出：

- `async`
- `auth`
- `context`
- `data`
- `environment`
- `functional`
- 加密工具
- 错误处理工具
- 文件扫描器

适合：

- 老代码迁移
- 调试期快速验证

不适合：

- 强调模块边界的新业务代码
- 需要一眼看懂依赖来源的正式导入
