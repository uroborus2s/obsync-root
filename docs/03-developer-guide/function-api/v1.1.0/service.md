# Service API（v1.1.0）

版本切换：[函数 API 版本索引](../index.md) | [v1.1.0 概览](./index.md)  
主题切换：[Core 总览](./core.md) | 当前页：Service API | [Functional 总览](./functional.md)

这一页只讲 Service 层相关 API。  
它们虽然从 `@stratix/core` 根出口导出，但职责和使用方式与运行时 API 明显不同。

<a id="page-summary"></a>
## 页面摘要

- 这一页关注的是“如何写出符合 Stratix 约定的 Service”，重点是错误模型、标准包装器、装饰器和验证器。
- 如果你只想尽快写出一个能跑的 Service，先看 `createServiceFunction()`，再回来看装饰器怎么叠加横切能力。
- `Either` / `Maybe` 的语义细节不在这里展开，遇到返回值模型问题时跳到 [Functional 总览](./functional.md)。

<a id="page-nav"></a>
## 页内导航

- [Service 模型先理解什么](#service-model)
- [核心类型](#service-types)
- [createServiceFunction(operationName, logger, fn, options?)](#create-service-function)
- [composeDecorators(...decorators)](#compose-decorators)
- [高频装饰器](#service-decorators)
- [错误辅助函数](#service-errors)
- [验证器](#service-validators)
- [完整导出清单](#service-exports)

<a id="service-model"></a>
## Service 模型先理解什么

在 `1.1.0` 里，Service 层的核心约定是：

1. service 是一个函数，不是必须继承某个基类。
2. service 返回 `Promise<Either<ServiceError, R>>`。
3. 横切能力通过装饰器叠加，而不是写进业务逻辑本身。

这意味着你写一个 service 时，最好先分三步：

1. 写纯业务函数 `fn`
2. 用 `createServiceFunction()` 包装成标准 service
3. 再用 `composeDecorators()` 叠加日志、重试、超时、限流等能力

<a id="service-types"></a>
## 核心类型

### `ServiceError`

统一错误结构。

| 字段 | 类型 | 说明 |
|---|---|---|
| `code` | `string` | 错误代码 |
| `message` | `string` | 错误消息 |
| `details` | `any` | 详细上下文 |
| `stack` | `string` | 栈信息，通常只在开发期有意义 |

### `ServiceFunction<Args, R>`

标准 service 函数签名：

```ts
type ServiceFunction<Args extends any[], R> = (
  ...args: Args
) => Promise<Either<ServiceError, R>>;
```

### `BaseServiceErrorCode`

框架内置错误码枚举。  
高频值包括：

- `VALIDATION_ERROR`
- `DATABASE_ERROR`
- `UNAUTHORIZED`
- `FORBIDDEN`
- `RESOURCE_NOT_FOUND`
- `RESOURCE_ALREADY_EXISTS`
- `TIMEOUT_ERROR`
- `RATE_LIMIT_EXCEEDED`
- `CIRCUIT_BREAKER_OPEN`

建议做法：

- 通用错误直接复用内置值
- 业务专属错误在应用侧扩展你自己的枚举或常量

<a id="create-service-function"></a>
## `createServiceFunction(operationName, logger, fn, options?)`

这是真正的标准 service 构造器。  
这里要特别注意：它的真实签名是四参，不是“只传 handler”。

```ts
import {
  BaseServiceErrorCode,
  createServiceError,
  createServiceFunction,
  eitherLeft,
  eitherRight
} from '@stratix/core';

const getUser = createServiceFunction(
  'getUser',
  logger,
  async (id: string) => {
    if (!id) {
      return eitherLeft(
        createServiceError(
          BaseServiceErrorCode.VALIDATION_ERROR,
          'id is required'
        )
      );
    }

    return eitherRight({ id, name: 'Alice' });
  },
  {
    enableLogging: true,
    timeout: 3000
  }
);
```

参数：

| 参数 | 类型 | 说明 |
|---|---|---|
| `operationName` | `string` | 这个 service 的逻辑名称，会出现在日志和性能统计里 |
| `logger` | `any` | 日志器，通常传统一 logger |
| `fn` | `ServiceFunction<Args, R>` | 真实业务实现 |
| `options` | `CreateServiceFunctionOptions` | 用于自动拼装日志、性能、超时、重试、缓存、限流、熔断等能力 |

返回值：

| 返回值 | 说明 |
|---|---|
| `ServiceFunction<Args, R>` | 标准 service 函数 |

### `CreateServiceFunctionOptions`

| 字段 | 类型 | 说明 |
|---|---|---|
| `enableLogging` | `boolean` | 是否启用日志，默认 `true` |
| `enablePerformanceMonitoring` | `boolean` | 是否启用性能监控，默认 `true` |
| `slowThreshold` | `number` | 慢操作阈值，单位毫秒，默认 `1000` |
| `timeout` | `number` | 超时毫秒数 |
| `retry` | `RetryOptions` | 重试配置 |
| `cache` | `CacheOptions` | 缓存配置 |
| `rateLimit` | `RateLimitOptions` | 限流配置 |
| `circuitBreaker` | `CircuitBreakerOptions` | 熔断配置 |

行为说明：

- `createServiceFunction()` 会根据 `options` 自动组装装饰器。
- 默认会启用日志和性能监控。
- 它只是“标准拼装器”，不是必须用它；如果你想自己手动拼装装饰器，也可以直接用 `composeDecorators()`。

<a id="compose-decorators"></a>
## `composeDecorators(...decorators)`

按顺序组合多个 Service 装饰器。

```ts
import {
  composeDecorators,
  withLogging,
  withRetry,
  withTimeout
} from '@stratix/core';

const wrapped = composeDecorators(
  withLogging({ logger, operationName: 'getUser' }),
  withRetry({ retries: 2, delay: 300 }),
  withTimeout({ timeoutMs: 3000 })
)(serviceFn);
```

参数：`ServiceDecorator[]`

建议：

- 顺序要明确。外层与内层的行为会影响日志、错误和重试位置。
- 通常先日志，再性能，再限流/熔断，再缓存/超时/重试。

<a id="service-decorators"></a>
## 高频装饰器

### `withLogging(options)`

自动记录 service 输入、输出、错误和耗时。

`LoggingOptions`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `logger` | `any` | 日志器实例 |
| `operationName` | `string` | 操作名称 |
| `logInput` | `boolean` | 是否记录输入，默认 `true` |
| `logOutput` | `boolean` | 是否记录输出，默认 `true` |
| `logErrors` | `boolean` | 是否记录错误，默认 `true` |
| `maskSensitiveData` | `(data: any) => any` | 记录前的脱敏函数 |

适合：

- 对外接口 service
- 有审计要求的业务

### `withPerformanceMonitoring(options)`

监控执行时间和内存变化。

`PerformanceOptions`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `logger` | `any` | 日志器 |
| `operationName` | `string` | 操作名称 |
| `slowThreshold` | `number` | 慢调用阈值，默认 `1000` |
| `trackMemory` | `boolean` | 是否记录内存变化，默认 `true` |

### `withRetry(options)`

当 service 返回 `Left` 时自动重试。

```ts
const retried = withRetry({
  retries: 3,
  delay: 500,
  backoff: 'exponential'
})(serviceFn);
```

`RetryOptions`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `retries` | `number` | 最大重试次数 |
| `delay` | `number` | 初始等待毫秒数，默认 `1000` |
| `backoff` | `'linear' \| 'exponential'` | 退避策略 |
| `shouldRetry` | `(error: ServiceError) => boolean` | 是否允许对当前错误继续重试 |
| `onRetry` | `(attempt: number, error: ServiceError) => void` | 每次重试前回调 |

注意：

- 它针对的是 `Either.Left`，不是“抛异常即重试”的普通函数模型。
- 如果你的 service 内部还在直接抛异常，先把异常收口成 `ServiceError`。

### `withTimeout(options)`

给 service 增加执行超时。

`TimeoutOptions`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `timeoutMs` | `number` | 超时毫秒数 |
| `errorCode` | `string` | 自定义错误码，默认 `TIMEOUT_ERROR` |
| `errorMessage` | `string` | 自定义错误消息 |

### `withValidation(validator)`

在进入业务逻辑前先验证入参。

```ts
import {
  createServiceError,
  eitherLeft,
  eitherRight,
  withValidation
} from '@stratix/core';

const validateId = (id: string) =>
  id
    ? eitherRight([id] as [string])
    : eitherLeft(createServiceError('VALIDATION_ERROR', 'id is required'));

const guarded = withValidation(validateId)(serviceFn);
```

参数：

| 参数 | 类型 | 说明 |
|---|---|---|
| `validator` | `(...args: Args) => Promise<Either<ServiceError, Args>> \| Either<ServiceError, Args>` | 验证函数 |

返回值：

| 返回值 | 说明 |
|---|---|
| `ServiceFunction<Args, R>` | 一个先验证再执行业务逻辑的新 service |

### 其他装饰器

#### `withCache(options)`

给 service 结果做缓存。

`CacheOptions`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `keyGenerator` | `(...args: any[]) => string` | 生成缓存键 |
| `ttl` | `number` | 过期时间 |
| `cache` | `any` | 自定义缓存实例 |
| `cacheErrors` | `boolean` | 是否缓存错误结果 |

#### `withRateLimit(options)`

基于令牌桶限制请求频率。

`RateLimitOptions`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `maxRequests` | `number` | 时间窗口内最大请求数 |
| `windowMs` | `number` | 时间窗口 |
| `keyGenerator` | `(...args: any[]) => string` | 区分不同调用者 |
| `rateLimiter` | `any` | 自定义限流器 |

#### `withCircuitBreaker(options)`

失败率过高时自动熔断。

`CircuitBreakerOptions`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `failureThreshold` | `number` | 失败率阈值 |
| `resetTimeout` | `number` | 重置时间窗口 |
| `minimumRequests` | `number` | 至少达到多少请求后才开始判定 |
| `circuitBreaker` | `any` | 自定义熔断器实例 |

#### `withAuthorization(options)`

在执行前做权限校验。

`AuthorizationOptions<Args>`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `authorize` | `(...args: Args) => Promise<boolean> \| boolean` | 是否允许执行 |
| `errorCode` | `string` | 自定义错误码 |
| `errorMessage` | `string` | 自定义错误消息 |

#### `withDataMasking(options)`

输出结果或日志脱敏。

`DataMaskingOptions`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `rules` | `DataMaskingRule[]` | 脱敏规则 |
| `logOnly` | `boolean` | 是否只对日志脱敏 |

`DataMaskingRule`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `field` | `string` | 字段路径，支持点路径 |
| `type` | `'phone' \| 'email' \| 'idCard' \| 'custom'` | 脱敏类型 |
| `maskFn` | `(value: string) => string` | 自定义脱敏函数 |

<a id="service-errors"></a>
## 错误辅助函数

### `createServiceError(code, message, details?)`

创建一个标准 `ServiceError`。

```ts
const error = createServiceError(
  'VALIDATION_ERROR',
  'email is required',
  { field: 'email' }
);
```

### `toServiceError(code, defaultMessage?)`

把未知异常转换成 `ServiceError`。

```ts
const mapper = toServiceError('DATABASE_ERROR', 'query failed');

try {
  await repo.query();
} catch (error) {
  return eitherLeft(mapper(error));
}
```

<a id="service-validators"></a>
## 验证器

这些 API 都返回一个验证函数，执行后返回 `Either<ServiceError, T>`。  
它们最适合在 `withValidation()` 或显式参数校验中使用。

### 基础验证器

| API | 参数 | 作用 |
|---|---|---|
| `validateExists(errorMessage, errorCode?)` | 错误消息、可选错误码 | 校验值不是 `null` / `undefined` |
| `validateRequired(fieldName)` | 字段名 | 校验值不是 `undefined` / `null` / 空字符串 |
| `validateOptional(fieldName)` | 字段名 | 允许 `undefined`，不允许 `null` |

### 字符串验证器

| API | 参数 | 作用 |
|---|---|---|
| `validateStringLength(fieldName, minLength?, maxLength?)` | 字段名、最小长度、最大长度 | 校验字符串长度 |
| `validateStringPattern(fieldName, pattern, errorMessage?)` | 字段名、正则、自定义错误 | 校验字符串格式 |
| `validateEmail(fieldName?)` | 可选字段名 | 校验邮箱 |
| `validateUrl(fieldName?)` | 可选字段名 | 校验 URL |

### 数字验证器

| API | 参数 | 作用 |
|---|---|---|
| `validateNumberRange(fieldName, min?, max?)` | 字段名、最小值、最大值 | 校验数字范围 |
| `validateInteger(fieldName)` | 字段名 | 校验整数 |
| `validatePositive(fieldName, includeZero?)` | 字段名、是否允许 0 | 校验正数或非负数 |

### 日期与数组验证器

| API | 参数 | 作用 |
|---|---|---|
| `validateDateFormat(fieldName, format?)` | 字段名、`YYYY-MM-DD` 或 `ISO8601` | 把日期字符串转成 `Date` |
| `validateDateRange(startDate, endDate, fieldName?)` | 开始时间、结束时间、字段名 | 校验时间范围 |
| `validateArrayLength(fieldName, minLength?, maxLength?)` | 字段名、最小长度、最大长度 | 校验数组长度 |
| `validateArrayNotEmpty(fieldName)` | 字段名 | 校验数组非空 |
| `validateEnum(fieldName, allowedValues)` | 字段名、允许值列表 | 校验枚举值 |
| `composeValidators(...validators)` | 多个验证函数 | 全部通过才成功 |

<a id="service-exports"></a>
## 完整导出清单

### 类型与错误

- `AuthorizationOptions`
- `CacheOptions`
- `CircuitBreakerOptions`
- `CreateServiceFunctionOptions`
- `DataMaskingOptions`
- `DataMaskingRule`
- `LoggingOptions`
- `PaginatedResult`
- `PaginationParams`
- `PerformanceOptions`
- `RateLimitOptions`
- `RetryOptions`
- `ServiceDecorator`
- `ServiceError`
- `ServiceFunction`
- `SortParams`
- `TimeoutOptions`
- `TransactionOptions`
- `BaseServiceErrorCode`

### 装饰器与辅助函数

- `createServiceFunction`
- `composeDecorators`
- `createServiceError`
- `toServiceError`
- `withLogging`
- `withPerformanceMonitoring`
- `withRetry`
- `withTimeout`
- `withValidation`
- `withErrorMapping`
- `withCache`
- `withRateLimit`
- `withCircuitBreaker`
- `withAuthorization`
- `withDataMasking`

### 验证器

- `validateExists`
- `validateRequired`
- `validateOptional`
- `validateStringLength`
- `validateStringPattern`
- `validateEmail`
- `validateUrl`
- `validateNumberRange`
- `validateInteger`
- `validatePositive`
- `validateDateFormat`
- `validateDateRange`
- `validateArrayLength`
- `validateArrayNotEmpty`
- `validateEnum`
- `composeValidators`
