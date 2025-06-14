# Stratix 通用工具模块设计文档

## 1. 模块概述

`@stratix/utils` 模块为Stratix框架提供一系列通用的工具函数，遵循函数式编程理念，提供纯函数、无副作用的工具方法。这些工具函数可用于框架内部实现，也可供开发者在应用开发中使用。

### 1.1 设计原则

- **纯函数**：所有工具函数都应是纯函数，相同输入保证相同输出，无副作用
- **类型安全**：完全支持TypeScript类型定义，提供良好的类型推断
- **模块化**：按功能领域组织代码，便于使用和维护
- **可组合性**：函数设计应便于组合使用
- **简洁性**：API设计简洁明了，易于理解和使用
- **最小依赖**：尽量减少外部依赖

### 1.2 模块结构

`@stratix/utils`模块按功能领域将工具函数组织到不同的子模块中，优化后的模块结构如下：

```
@stratix/utils/
├── common/       - 通用基础工具函数
│   ├── id.ts     - ID生成相关函数
│   └── guards.ts - 基础检查类函数
├── async/        - 异步处理专用模块
│   ├── retry.ts  - 重试机制
│   ├── timeout.ts - 超时控制
│   └── delay.ts  - 延时函数
├── string/       - 字符串处理函数
├── object/       - 对象操作函数
├── function/     - 函数操作工具
├── number/       - 数字处理函数
├── file/         - 文件操作函数
├── time/         - 时间和日期处理
│   ├── format.ts - 时间格式化
│   ├── parse.ts  - 时间解析
│   └── duration.ts - 持续时间处理
├── validator/    - 数据验证
├── collection/   - 数据集合操作
├── format/       - 数据格式化
├── type/         - 类型检查和转换
├── environment/  - 环境变量工具
├── crypto/       - 加密和哈希相关
└── i18n/         - 国际化工具
```

## 2. 功能模块设计

### 2.1 通用工具函数 (common)

提供基础的通用工具函数。

#### 2.1.1 API设计

| 函数名 | 参数 | 返回值 | 描述 |
|-------|------|-------|------|
| `isNil` | `value: unknown` | `boolean` | 检查值是否为null或undefined |
| `generateNumberId` | `min?: number, max?: number` | `string` | 生成数字格式的唯一ID |
| `generateUUId` | - | `string` | 通过UUID生成唯一ID |
| `generateId` | - | `string` | 生成唯一ID |
| `delay` | `ms: number` | `Promise<void>` | 延迟指定时间后解析Promise |
| `retry` | `fn: () => Promise<T>, options?: RetryOptions` | `Promise<T>` | 重试执行异步函数 |
| `safeExecute` | `fn: () => T, defaultValue?: D` | `T \| D` | 安全执行函数，出错时返回默认值 |
| `safeExecuteAsync` | `fn: () => Promise<T>, defaultValue?: D` | `Promise<T \| D>` | 安全执行异步函数，出错时返回默认值 |

```typescript
interface RetryOptions {
  retries?: number;                     // 重试次数，默认3
  delay?: number;                       // 重试间隔(ms)，默认1000
  onRetry?: (error: Error, attempt: number) => void; // 重试回调
  shouldRetry?: (error: Error) => boolean; // 条件函数决定是否重试
}
```

#### 2.1.2 使用示例

```typescript
import { generateId, retry, delay } from '@stratix/utils/common';

// 生成唯一ID
const id = generateId();

// 延迟执行
await delay(1000); // 等待1秒

// 重试机制
const result = await retry(
  async () => {
    // 可能失败的异步操作
    return await api.fetchData();
  }, 
  {
    retries: 5,
    delay: 2000,
    onRetry: (err, attempt) => console.log(`重试 #${attempt}: ${err.message}`)
  }
);
```

### 2.2 字符串工具函数 (string)

提供字符串处理相关的工具函数。

#### 2.2.1 API设计

| 函数名 | 参数 | 返回值 | 描述 |
|-------|------|-------|------|
| `toCamelCase` | `str: string` | `string` | 转换为驼峰命名 |
| `toPascalCase` | `str: string` | `string` | 转换为帕斯卡命名 |
| `toSnakeCase` | `str: string` | `string` | 转换为蛇形命名 |
| `toKebabCase` | `str: string` | `string` | 转换为短横线命名 |
| `pluralize` | `str: string` | `string` | 转换为复数形式 |
| `singularize` | `str: string` | `string` | 转换为单数形式 |
| `truncate` | `str: string, length: number, suffix: string = '...'` | `string` | 截断字符串到指定长度 |
| `escape` | `str: string` | `string` | 转义HTML特殊字符 |
| `unescape` | `str: string` | `string` | 反转义HTML特殊字符 |
| `template` | `str: string, data: Record<string, any>` | `string` | 简单的模板字符串替换 |

#### 2.2.2 使用示例

```typescript
import { toCamelCase, pluralize, template } from '@stratix/utils/string';

// 命名转换
const camelCase = toCamelCase('user_profile'); // 'userProfile'

// 复数形式
const plural = pluralize('category'); // 'categories'

// 模板替换
const text = template('Hello, ${name}!', { name: 'World' }); // 'Hello, World!'
```

### 2.3 对象工具函数 (object)

提供对象操作相关的工具函数。

#### 2.3.1 API设计

| 函数名 | 参数 | 返回值 | 描述 |
|-------|------|-------|------|
| `isEmpty` | `value: any` | `boolean` | 检查值是否为空 |
| `isNotEmpty` | `value: any` | `boolean` | 检查值是否为非空 |
| `deepMerge` | `target: T, ...sources: Record<string, any>[]` | `T` | 深度合并对象 |
| `isObject` | `item: any` | `boolean` | 检查值是否为对象 |
| `deepClone` | `obj: T` | `T` | 深度克隆对象 |
| `pick` | `obj: T, keys: K[]` | `Pick<T, K>` | 选择对象的部分属性 |
| `omit` | `obj: T, keys: K[]` | `Omit<T, K>` | 排除对象的部分属性 |
| `camelizeKeys` | `obj: T` | `Record<string, any>` | 将对象的键转换为驼峰命名 |
| `snakeizeKeys` | `obj: T` | `Record<string, any>` | 将对象的键转换为蛇形命名 |
| `flattenObject` | `obj: Record<string, any>, delimiter: string = '.'` | `Record<string, any>` | 扁平化嵌套对象 |
| `unflattenObject` | `obj: Record<string, any>, delimiter: string = '.'` | `Record<string, any>` | 将扁平对象转为嵌套对象 |

#### 2.3.2 使用示例

```typescript
import { deepMerge, pick, camelizeKeys } from '@stratix/utils/object';

// 深度合并对象
const merged = deepMerge(
  { a: 1, b: { c: 2 } },
  { b: { d: 3 }, e: 4 }
); // { a: 1, b: { c: 2, d: 3 }, e: 4 }

// 选择对象属性
const user = { id: 1, name: 'John', password: 'secret' };
const safeUser = pick(user, ['id', 'name']); // { id: 1, name: 'John' }

// 转换对象键为驼峰命名
const data = { user_id: 1, first_name: 'John' };
const camelized = camelizeKeys(data); // { userId: 1, firstName: 'John' }
```

### 2.4 函数工具 (function)

提供函数操作相关的工具函数。

#### 2.4.1 API设计

| 函数名 | 参数 | 返回值 | 描述 |
|-------|------|-------|------|
| `debounce` | `func: F, wait: number, options?: DebounceOptions` | `F & { cancel(): void }` | 创建防抖函数 |
| `throttle` | `func: F, wait: number, options?: ThrottleOptions` | `F & { cancel(): void }` | 创建节流函数 |
| `memoize` | `func: F, resolver?: (...args: any[]) => string` | `F & { cache: Map<string, any> }` | 创建带缓存的函数 |
| `once` | `func: F` | `F` | 创建只执行一次的函数 |
| `compose` | `...fns: Array<(arg: any) => any>` | `(arg: any) => any` | 从右到左组合函数 |
| `pipe` | `...fns: Array<(arg: any) => any>` | `(arg: any) => any` | 从左到右组合函数 |
| `curry` | `func: Function, arity?: number` | `Function` | 函数柯里化 |
| `waitUntil` | `condition: () => boolean, callback: () => void, timeout?: number, timeoutMessage?: string` | `void` | 等待条件满足后执行回调 |

```typescript
interface DebounceOptions {
  leading?: boolean;      // 是否在延迟开始前调用
  trailing?: boolean;     // 是否在延迟结束后调用
  maxWait?: number;       // 最大等待时间
}

interface ThrottleOptions {
  leading?: boolean;      // 是否在节流开始前调用
  trailing?: boolean;     // 是否在节流结束后调用
}
```

#### 2.4.2 使用示例

```typescript
import { debounce, throttle, memoize, compose } from '@stratix/utils/function';

// 防抖
const debouncedSave = debounce(() => {
  // 保存操作
}, 500);

// 节流
const throttledScroll = throttle((event) => {
  // 滚动处理
}, 200);

// 函数记忆化
const fibonacci = memoize((n) => {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
});

// 函数组合
const processUser = compose(
  formatUser,
  validateUser,
  normalizeUser
);

const result = processUser(inputData);
```

### 2.5 数字工具函数 (number)

提供数字处理相关的工具函数。

#### 2.5.1 API设计

| 函数名 | 参数 | 返回值 | 描述 |
|-------|------|-------|------|
| `resolveNumber` | `num: number \| string \| null \| undefined, defaultValue: number` | `number` | 解析数字，失败时返回默认值 |
| `resolvePositiveNumber` | `num: number \| string \| null \| undefined, defaultValue: number` | `number` | 解析正数，失败时返回默认值 |
| `hrtime` | - | `bigint` | 获取高精度时间戳 |
| `random` | `min: number, max: number, floating?: boolean` | `number` | 生成指定范围内的随机数 |
| `clamp` | `num: number, lower: number, upper: number` | `number` | 将数字限制在指定范围内 |
| `formatNumber` | `num: number, options?: FormatNumberOptions` | `string` | 格式化数字 |
| `parseNumber` | `str: string, defaultValue?: number` | `number` | 安全地解析数字字符串 |

```typescript
interface FormatNumberOptions {
  precision?: number;               // 精度
  thousandsSeparator?: string;      // 千位分隔符
  decimalSeparator?: string;        // 小数分隔符
  prefix?: string;                  // 前缀
  suffix?: string;                  // 后缀
}
```

#### 2.5.2 使用示例

```typescript
import { resolveNumber, random, formatNumber } from '@stratix/utils/number';

// 解析数字
const num = resolveNumber('123', 0); // 123
const invalid = resolveNumber('abc', 0); // 0

// 随机数
const rand = random(1, 10); // 1-10之间的随机整数
const randFloat = random(1, 10, true); // 1-10之间的随机浮点数

// 格式化数字
const formatted = formatNumber(1234.56, {
  precision: 2,
  thousandsSeparator: ',',
  prefix: '$'
}); // '$1,234.56'
```

### 2.6 文件工具函数 (file)

提供文件操作相关的工具函数。

#### 2.6.1 API设计

| 函数名 | 参数 | 返回值 | 描述 |
|-------|------|-------|------|
| `getFileExtension` | `filename: string` | `string` | 获取文件扩展名 |
| `getFileName` | `path: string, withoutExtension?: boolean` | `string` | 获取文件名 |
| `getFilePath` | `path: string` | `string` | 获取文件路径 |
| `getMimeType` | `filename: string` | `string` | 根据文件名获取MIME类型 |
| `formatFileSize` | `bytes: number, precision?: number` | `string` | 格式化文件大小 |
| `isValidFileName` | `filename: string` | `boolean` | 检查文件名是否有效 |
| `sanitizeFileName` | `filename: string` | `string` | 清理文件名 |
| `normalizeFilePath` | `path: string` | `string` | 标准化文件路径 |

#### 2.6.2 使用示例

```typescript
import { getFileExtension, formatFileSize, sanitizeFileName } from '@stratix/utils/file';

// 获取文件扩展名
const ext = getFileExtension('document.pdf'); // 'pdf'

// 格式化文件大小
const size = formatFileSize(1024 * 1024); // '1.00 MB'

// 清理文件名
const safeName = sanitizeFileName('file/with\\invalid:chars?.txt'); // 'file_with_invalid_chars_.txt'
```

### 2.7 时间和持续时间工具 (duration)

提供时间和持续时间处理相关的工具函数。

#### 2.7.1 API设计

| 函数名 | 参数 | 返回值 | 描述 |
|-------|------|-------|------|
| `formatDuration` | `ms: number, options?: FormatDurationOptions` | `string` | 格式化持续时间 |
| `parseDuration` | `str: string` | `number` | 解析持续时间字符串为毫秒数 |
| `sleep` | `ms: number` | `Promise<void>` | 延迟指定时间 |
| `timeout` | `ms: number, message?: string` | `Promise<never>` | 创建超时Promise |
| `withTimeout` | `promise: Promise<T>, ms: number, message?: string` | `Promise<T>` | 为Promise添加超时控制 |
| `measureTime` | `fn: () => Promise<T>` | `Promise<[T, number]>` | 测量异步函数执行时间 |
| `throttleTime` | `fn: () => Promise<T>, ms: number` | `Promise<T>` | 确保函数至少运行指定时间 |

```typescript
interface FormatDurationOptions {
  format?: 'long' | 'short' | 'micro';      // 格式类型
  largest?: number;                         // 最大单位数
  delimiter?: string;                       // 分隔符
  round?: boolean;                          // 是否四舍五入
}
```

#### 2.7.2 使用示例

```typescript
import { formatDuration, parseDuration, withTimeout } from '@stratix/utils/duration';

// 格式化持续时间
const time = formatDuration(1000 * 60 * 60 * 2 + 1000 * 60 * 30); // '2 hours 30 minutes'
const shortTime = formatDuration(1000 * 60 * 60 * 2 + 1000 * 60 * 30, { format: 'short' }); // '2h 30m'

// 解析持续时间
const ms = parseDuration('2h 30m'); // 9000000 (毫秒)

// 超时控制
try {
  const result = await withTimeout(fetchData(), 5000, '请求超时');
  // 处理结果
} catch (error) {
  // 处理超时或其他错误
}
```

### 2.8 类型工具函数 (type)

提供类型检查和转换相关的工具函数。

#### 2.8.1 API设计

| 函数名 | 参数 | 返回值 | 描述 |
|-------|------|-------|------|
| `isString` | `value: unknown` | `boolean` | 检查值是否为字符串 |
| `isNumber` | `value: unknown` | `boolean` | 检查值是否为数字 |
| `isBoolean` | `value: unknown` | `boolean` | 检查值是否为布尔值 |
| `isArray` | `value: unknown` | `boolean` | 检查值是否为数组 |
| `isObject` | `value: unknown` | `boolean` | 检查值是否为对象 |
| `isFunction` | `value: unknown` | `boolean` | 检查值是否为函数 |
| `isDate` | `value: unknown` | `boolean` | 检查值是否为日期 |
| `isPromise` | `value: unknown` | `boolean` | 检查值是否为Promise |
| `isRegExp` | `value: unknown` | `boolean` | 检查值是否为正则表达式 |
| `isError` | `value: unknown` | `boolean` | 检查值是否为Error对象 |
| `toNumber` | `value: any, defaultValue?: number` | `number` | 将值转换为数字 |
| `toBoolean` | `value: any` | `boolean` | 将值转换为布尔值 |
| `toArray` | `value: any` | `any[]` | 将值转换为数组 |
| `toString` | `value: any` | `string` | 将值转换为字符串 |
| `getType` | `value: any` | `string` | 获取值的类型名称 |

#### 2.8.2 使用示例

```typescript
import { isString, isNumber, getType } from '@stratix/utils/common/guards';
import { toNumber } from '@stratix/utils/common/type';

// 类型检查
if (isString(value)) {
  // 处理字符串
}

// 类型转换
const num = toNumber('123', 0); // 123
const invalidNum = toNumber('abc', 0); // 0

// 获取类型
const typeName = getType([]); // 'Array'
```

### 2.9 环境变量工具 (environment)

提供环境变量处理相关的工具函数。

#### 2.9.1 API设计

| 函数名 | 参数 | 返回值 | 描述 |
|-------|------|-------|------|
| `getEnv` | `name: string, defaultValue?: string` | `string` | 获取环境变量 |
| `getEnvNumber` | `name: string, defaultValue?: number` | `number` | 获取数字类型环境变量 |
| `getEnvBoolean` | `name: string, defaultValue?: boolean` | `boolean` | 获取布尔类型环境变量 |
| `getEnvArray` | `name: string, separator?: string, defaultValue?: string[]` | `string[]` | 获取数组类型环境变量 |
| `isProduction` | - | `boolean` | 检查是否为生产环境 |
| `isDevelopment` | - | `boolean` | 检查是否为开发环境 |
| `isTest` | - | `boolean` | 检查是否为测试环境 |

#### 2.9.2 使用示例

```typescript
import { getEnv, getEnvNumber, isProduction } from '@stratix/utils/environment';

// 获取环境变量
const apiKey = getEnv('API_KEY', '');
const port = getEnvNumber('PORT', 3000);

// 环境检查
if (isProduction()) {
  // 生产环境逻辑
} else {
  // 开发环境逻辑
}
```

### 2.10 加密和哈希工具 (crypto)

提供加密和哈希处理相关的工具函数。

#### 2.10.1 API设计

| 函数名 | 参数 | 返回值 | 描述 |
|-------|------|-------|------|
| `md5` | `str: string` | `string` | 计算字符串的MD5哈希值 |
| `sha256` | `str: string` | `string` | 计算字符串的SHA-256哈希值 |
| `aesEncrypt` | `data: string, key: string, iv?: string` | `string` | 使用AES加密数据 |
| `aesDecrypt` | `encryptedData: string, key: string, iv?: string` | `string` | 使用AES解密数据 |
| `generateRandomKey` | `length: number` | `string` | 生成随机密钥 |
| `hashPassword` | `password: string, salt?: string` | `Promise<string>` | 安全地哈希密码 |
| `verifyPassword` | `password: string, hashedPassword: string` | `Promise<boolean>` | 验证密码是否匹配哈希值 |
| `generateJWT` | `payload: Record<string, any>, secret: string, options?: JWTOptions` | `string` | 生成JWT令牌 |
| `verifyJWT` | `token: string, secret: string` | `Record<string, any>` | 验证并解码JWT令牌 |

```typescript
interface JWTOptions {
  expiresIn?: string | number;  // 过期时间
  algorithm?: string;           // 签名算法
  issuer?: string;              // 签发者
  audience?: string;            // 接收者
}
```

#### 2.10.2 使用示例

```typescript
import { md5, sha256, aesEncrypt, aesDecrypt, generateJWT } from '@stratix/utils/crypto';

// 计算哈希值
const hash = md5('password123'); // '482c811da5d5b4bc6d497ffa98491e38'
const shaHash = sha256('password123'); // '... sha256 hash ...'

// AES加密/解密
const key = 'secret-key-12345';
const encrypted = aesEncrypt('sensitive data', key);
const decrypted = aesDecrypt(encrypted, key); // 'sensitive data'

// JWT认证
const token = generateJWT({ userId: 123 }, 'secret', { expiresIn: '1h' });
try {
  const payload = verifyJWT(token, 'secret');
  console.log(payload.userId); // 123
} catch (error) {
  // 令牌无效或已过期
}
```

### 2.11 数据验证工具 (validator)

提供数据验证相关的工具函数。

#### 2.11.1 API设计

| 函数名 | 参数 | 返回值 | 描述 |
|-------|------|-------|------|
| `isEmail` | `email: string` | `boolean` | 验证电子邮件格式 |
| `isUrl` | `url: string, options?: UrlOptions` | `boolean` | 验证URL格式 |
| `isIp` | `ip: string, version?: 4 \| 6` | `boolean` | 验证IP地址格式 |
| `isPhone` | `phone: string, locale?: string` | `boolean` | 验证手机号码 |
| `isPassport` | `passport: string, countryCode?: string` | `boolean` | 验证护照号码 |
| `isCreditCard` | `cardNumber: string` | `boolean` | 验证信用卡号码 |
| `isDate` | `date: string, format?: string` | `boolean` | 验证日期格式 |
| `isPostalCode` | `postalCode: string, countryCode?: string` | `boolean` | 验证邮政编码 |
| `isStrongPassword` | `password: string, options?: PasswordOptions` | `boolean` | 验证密码强度 |
| `isJSON` | `str: string` | `boolean` | 验证字符串是否为有效JSON |
| `isUUID` | `str: string, version?: number` | `boolean` | 验证UUID格式 |

```typescript
interface UrlOptions {
  requireProtocol?: boolean;    // 是否要求协议
  allowRelative?: boolean;      // 是否允许相对URL
  allowIps?: boolean;           // 是否允许IP地址形式的URL
}

interface PasswordOptions {
  minLength?: number;           // 最小长度
  minLowercase?: number;        // 最少小写字母数
  minUppercase?: number;        // 最少大写字母数
  minNumbers?: number;          // 最少数字数
  minSymbols?: number;          // 最少符号数
}
```

#### 2.11.2 使用示例

```typescript
import { isEmail, isUrl, isStrongPassword } from '@stratix/utils/validator';

// 邮箱验证
const validEmail = isEmail('user@example.com'); // true
const invalidEmail = isEmail('not-an-email'); // false

// URL验证
const validUrl = isUrl('https://example.com/path?query=1'); // true
const invalidUrl = isUrl('not-a-url'); // false

// 密码强度验证
const strongPassword = isStrongPassword('P@ssw0rd123', {
  minLength: 8,
  minLowercase: 1,
  minUppercase: 1,
  minNumbers: 1,
  minSymbols: 1
}); // true
```

### 2.12 数据集合工具 (collection)

提供数据集合操作相关的工具函数。

#### 2.12.1 API设计

| 函数名 | 参数 | 返回值 | 描述 |
|-------|------|-------|------|
| `createMap` | `entries: [K, V][] \| Record<string, V>` | `Map<K, V>` | 创建Map的快捷方式 |
| `createSet` | `items: T[]` | `Set<T>` | 创建Set的快捷方式 |
| `getOrDefault` | `map: Map<K, V>, key: K, defaultValue: D` | `V \| D` | 安全地获取Map中的值 |
| `groupBy` | `array: T[], keyFn: (item: T) => K` | `Record<K, T[]>` | 分组对象数组 |
| `findDuplicates` | `array: T[], keyFn?: (item: T) => K` | `T[]` | 查找数组中的重复项 |
| `chunk` | `array: T[], size: number` | `T[][]` | 将数组分割为指定大小的块 |
| `unique` | `array: T[], keyFn?: (item: T) => K` | `T[]` | 获取数组的唯一值 |
| `intersection` | `array1: T[], array2: T[], keyFn?: (item: T) => K` | `T[]` | 获取两个数组的交集 |
| `difference` | `array1: T[], array2: T[], keyFn?: (item: T) => K` | `T[]` | 获取两个数组的差集 |
| `partition` | `array: T[], predicate: (item: T) => boolean` | `[T[], T[]]` | 根据条件将数组分割为两部分 |

#### 2.12.2 使用示例

```typescript
import { groupBy, findDuplicates, unique, partition } from '@stratix/utils/collection';

// 分组数据
const users = [
  { id: 1, role: 'admin' },
  { id: 2, role: 'user' },
  { id: 3, role: 'user' }
];
const usersByRole = groupBy(users, user => user.role);
// { 'admin': [{ id: 1, role: 'admin' }], 'user': [{ id: 2, role: 'user' }, { id: 3, role: 'user' }] }

// 查找重复项
const items = [1, 2, 3, 2, 1, 4];
const duplicates = findDuplicates(items); // [1, 2]

// 唯一值
const uniqueItems = unique(items); // [1, 2, 3, 4]

// 数据分区
const numbers = [1, 2, 3, 4, 5, 6];
const [even, odd] = partition(numbers, n => n % 2 === 0);
// even: [2, 4, 6], odd: [1, 3, 5]
```

### 2.13 性能工具 (performance)

提供性能相关的工具函数。

#### 2.13.1 API设计

| 函数名 | 参数 | 返回值 | 描述 |
|-------|------|-------|------|
| `measure` | `fn: (...args: A) => T, ...args: A` | `[T, number]` | 测量函数执行时间 |
| `asyncCache` | `fn: (...args: A) => Promise<T>, options?: CacheOptions` | `(...args: A) => Promise<T>` | 创建带有缓存的异步函数 |
| `batch` | `fn: (items: T[]) => Promise<R[]>, options?: BatchOptions` | `(item: T) => Promise<R>` | 创建批处理函数 |
| `limitConcurrency` | `fn: (...args: A) => Promise<T>, maxConcurrent: number` | `(...args: A) => Promise<T>` | 限制并发的异步函数 |
| `profile` | `fn: () => any, label?: string` | `any` | 分析函数性能并输出结果 |

```typescript
interface CacheOptions {
  ttl?: number;               // 缓存生存时间(ms)
  maxSize?: number;           // 最大缓存项数量
  keyFn?: (...args: any[]) => string; // 自定义缓存键函数
}

interface BatchOptions {
  maxBatchSize?: number;      // 每批最大项数
  maxDelay?: number;          // 最大延迟时间(ms)
}
```

#### 2.13.2 使用示例

```typescript
import { measure, asyncCache, batch, limitConcurrency } from '@stratix/utils/performance';

// 测量执行时间
const [result, duration] = measure(
  (a, b) => a + b,
  5, 10
); // result: 15, duration: 执行时间(ms)

// 缓存异步结果
const cachedFetch = asyncCache(
  async (url) => {
    const response = await fetch(url);
    return response.json();
  },
  { ttl: 60000, maxSize: 100 } // 缓存1分钟，最多100项
);

// 批处理请求
const batchSaveItems = batch(
  async (items) => {
    // 批量保存多个项目
    const response = await api.bulkSave(items);
    return response.ids;
  },
  { maxBatchSize: 50, maxDelay: 100 }
);

// 限制并发
const limitedDownload = limitConcurrency(
  async (url) => {
    // 下载文件
    return await downloadFile(url);
  },
  5 // 最多5个并发下载
);
```

### 2.14 国际化工具 (i18n)

提供国际化相关的工具函数。

#### 2.14.1 API设计

| 函数名 | 参数 | 返回值 | 描述 |
|-------|------|-------|------|
| `formatNumber` | `num: number, locale?: string, options?: Intl.NumberFormatOptions` | `string` | 格式化数字为不同区域格式 |
| `formatDate` | `date: Date \| number, locale?: string, options?: Intl.DateTimeFormatOptions` | `string` | 格式化日期为不同区域格式 |
| `formatCurrency` | `amount: number, currency: string, locale?: string` | `string` | 格式化货币 |
| `formatRelativeTime` | `date: Date \| number, locale?: string` | `string` | 格式化相对时间 |
| `formatList` | `items: string[], locale?: string, options?: Intl.ListFormatOptions` | `string` | 格式化列表 |
| `formatPlural` | `count: number, forms: PluralForms, locale?: string` | `string` | 格式化复数形式 |
| `getCanonicalLocale` | `locale: string` | `string` | 获取规范化的区域设置 |
| `isRTL` | `locale: string` | `boolean` | 检查是否为从右到左的语言 |

```typescript
interface PluralForms {
  one: string;        // 单数形式
  other: string;      // 复数形式
  zero?: string;      // 零形式
  few?: string;       // 少数形式
  many?: string;      // 多数形式
}
```

#### 2.14.2 使用示例

```typescript
import { formatNumber, formatDate, formatCurrency, formatRelativeTime } from '@stratix/utils/i18n';

// 数字格式化
const formattedNumber = formatNumber(1234567.89, 'zh-CN'); // '1,234,567.89'
const formattedPercent = formatNumber(0.3456, 'zh-CN', { style: 'percent' }); // '34.56%'

// 日期格式化
const date = new Date('2023-05-20T15:30:00Z');
const formattedDate = formatDate(date, 'zh-CN', { dateStyle: 'full' }); // '2023年5月20日星期六'
const formattedTime = formatDate(date, 'zh-CN', { timeStyle: 'short' }); // '15:30'

// 货币格式化
const price = formatCurrency(1234.56, 'CNY', 'zh-CN'); // '¥1,234.56'
const usdPrice = formatCurrency(1234.56, 'USD', 'en-US'); // '$1,234.56'

// 相对时间
const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
const relativeTime = formatRelativeTime(yesterday, 'zh-CN'); // '昨天'
```

### 2.15 不可变数据工具 (immutable)

提供不可变数据操作相关的工具函数。

#### 2.15.1 API设计

| 函数名 | 参数 | 返回值 | 描述 |
|-------|------|-------|------|
| `immutableUpdate` | `obj: T, path: string \| (string \| number)[], value: any` | `T` | 不可变更新对象 |
| `immutableDelete` | `obj: T, path: string \| (string \| number)[]` | `T` | 不可变删除对象属性 |
| `immutableArrayUpdate` | `array: T[], index: number, value: T` | `T[]` | 不可变更新数组 |
| `immutableArrayInsert` | `array: T[], index: number, value: T` | `T[]` | 不可变插入数组项 |
| `immutableArrayRemove` | `array: T[], index: number` | `T[]` | 不可变移除数组项 |
| `immutableArrayMove` | `array: T[], fromIndex: number, toIndex: number` | `T[]` | 不可变移动数组项 |
| `immutableSet` | `obj: T, key: keyof T, value: any` | `T` | 不可变设置对象属性 |
| `immutableMerge` | `obj: T, patch: Partial<T>` | `T` | 不可变合并对象 |
| `createReducer` | `initialState: S, handlers: ReducerHandlers<S>` | `Reducer<S>` | 创建不可变reducer |

```typescript
interface ReducerHandlers<S> {
  [actionType: string]: (state: S, action: any) => S;
}

type Reducer<S> = (state: S | undefined, action: { type: string; [key: string]: any }) => S;
```

#### 2.15.2 使用示例

```typescript
import { 
  immutableUpdate, 
  immutableDelete, 
  immutableArrayInsert,
  createReducer
} from '@stratix/utils/immutable';

// 不可变更新嵌套对象
const user = { id: 1, profile: { name: 'John', age: 30 } };
const updatedUser = immutableUpdate(user, 'profile.age', 31);
// { id: 1, profile: { name: 'John', age: 31 } }

// 不可变删除属性
const userWithoutProfile = immutableDelete(user, 'profile');
// { id: 1 }

// 不可变数组操作
const numbers = [1, 2, 3, 4];
const newNumbers = immutableArrayInsert(numbers, 2, 2.5);
// [1, 2, 2.5, 3, 4]

// 创建不可变reducer
const initialState = { counter: 0, user: null };
const counterReducer = createReducer(initialState, {
  INCREMENT: (state, action) => ({
    ...state,
    counter: state.counter + (action.payload || 1)
  }),
  DECREMENT: (state, action) => ({
    ...state,
    counter: state.counter - (action.payload || 1)
  }),
  SET_USER: (state, action) => ({
    ...state,
    user: action.payload
  })
});

// 使用reducer
const nextState = counterReducer(initialState, { type: 'INCREMENT', payload: 5 });
// { counter: 5, user: null }
```

### 2.16 上下文工具 (context)

提供上下文感知的工具函数。

#### 2.16.1 API设计

| 函数名 | 参数 | 返回值 | 描述 |
|-------|------|-------|------|
| `createContext` | `initialValue?: T` | `Context<T>` | 创建上下文对象 |
| `withContext` | `context: T, fn: (ctx: T) => R` | `R` | 在上下文中执行函数 |
| `createContextUtils` | `context: T` | `ContextUtils<T>` | 创建上下文工具集 |
| `bindToContext` | `fn: (...args: A) => R, context: any` | `(...args: A) => R` | 将函数绑定到上下文 |
| `chainContext` | `...contextFactories: Array<(prevContext: any) => any>` | `any` | 链式组合多个上下文 |

```typescript
interface Context<T> {
  get(): T;
  set(value: T): void;
  update(updater: (value: T) => T): void;
  reset(): void;
}

interface ContextUtils<T> {
  withContext<R>(fn: (ctx: T) => R): R;
  getValue<K extends keyof T>(key: K): T[K];
  setValue<K extends keyof T>(key: K, value: T[K]): void;
  safeExecute<R, D = undefined>(fn: (ctx: T) => R, defaultValue?: D): R | D;
}
```

#### 2.16.2 使用示例

```typescript
import { createContext, withContext, createContextUtils } from '@stratix/utils/context';

// 创建上下文
const userContext = createContext({ id: null, name: null, isAdmin: false });

// 使用上下文
userContext.set({ id: 123, name: 'John', isAdmin: true });
const userData = userContext.get();

// 上下文中执行函数
const result = withContext(
  { logger: console, config: { debug: true } },
  (ctx) => {
    ctx.logger.log('Using context with config:', ctx.config);
    return ctx.config.debug;
  }
);

// 创建上下文工具集
const appContext = { 
  config: { apiUrl: 'https://api.example.com' },
  user: { id: 123, name: 'John' },
  services: {
    fetchData: async (endpoint) => { /* ... */ }
  }
};

const utils = createContextUtils(appContext);

// 使用上下文工具
const apiUrl = utils.getValue('config').apiUrl;
utils.withContext(ctx => {
  ctx.services.fetchData('/users');
});
```

## 3. 扩展设计和最佳实践

### 3.1 增强的类型定义和类型安全

为了提供更好的类型安全和开发体验，工具函数应该使用更精确的TypeScript类型定义：

```typescript
// 改进类型定义示例
function pick<T extends Record<string, any>, K extends keyof T>(
  obj: T, 
  keys: ReadonlyArray<K>
): Pick<T, K>;

function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
  options?: DebounceOptions
): (this: ThisParameterType<T>, ...args: Parameters<T>) => ReturnType<T> & { cancel(): void };
```

### 3.2 函数组合的增强实现

```typescript
// 支持异步函数的函数组合
function composeAsync<T>(...fns: Array<(arg: any) => any | Promise<any>>): (arg: T) => Promise<any> {
  return async (arg: T) => {
    let result = arg;
    for (let i = fns.length - 1; i >= 0; i--) {
      result = await fns[i](result);
    }
    return result;
  };
}

// 支持异步函数的管道
function pipeAsync<T>(...fns: Array<(arg: any) => any | Promise<any>>): (arg: T) => Promise<any> {
  return async (arg: T) => {
    let result = arg;
    for (const fn of fns) {
      result = await fn(result);
    }
    return result;
  };
}
```

### 3.3 引入的优质第三方库建议

虽然尽量减少外部依赖，但某些成熟的库在特定功能上有明显优势，建议考虑：

1. **日期处理**：`date-fns` - 模块化、不可变和函数式，体积小且无副作用
2. **校验**：`zod` - TypeScript友好的数据验证库
3. **不可变数据**：`immer` - 以可变方式编写不可变更新
4. **函数式工具**：`fp-ts` - 函数式编程工具集
5. **国际化**：`i18next` - 全面的国际化解决方案

### 3.4 依赖关系优化

1. **减少外部依赖**：尽量用原生API实现功能，减少对外部库的依赖
2. **模块独立性**：确保各模块相互独立，可单独引用
3. **按需加载**：支持Tree-shaking，便于用户只引入需要的函数
4. **依赖安全管理**：针对必要的外部依赖，设置版本限制和安全检查

## 4. 使用示例

### 4.1 基础使用

```typescript
import { generateId } from '@stratix/utils/common';
import { toCamelCase } from '@stratix/utils/string';
import { deepMerge } from '@stratix/utils/object';

// 生成唯一ID
const id = generateId();

// 转换命名风格
const camelCased = toCamelCase('api_response');

// 深度合并对象
const config = deepMerge(
  { base: true, settings: { debug: true } },
  { settings: { timeout: 5000 } }
);
```

### 4.2 插件开发中使用

```typescript
import { StratixPlugin } from 'stratix';
import { deepMerge, pick } from '@stratix/utils/object';
import { memoize, debounce } from '@stratix/utils/function';
import { retry, withTimeout } from '@stratix/utils/async';

const myPlugin: StratixPlugin = {
  name: 'myPlugin',
  register: async (app, options) => {
    const defaultOptions = {
      timeout: 5000,
      retries: 3
    };
    
    // 合并选项
    const mergedOptions = deepMerge(defaultOptions, options);
    
    // 创建API客户端
    const apiClient = {
      fetchData: async (endpoint) => {
        return await retry(
          async () => {
            return await withTimeout(
              fetch(`${mergedOptions.apiUrl}/${endpoint}`).then(r => r.json()),
              mergedOptions.timeout,
              '请求超时'
            );
          },
          { 
            retries: mergedOptions.retries,
            onRetry: (err, attempt) => {
              app.logger.warn(`API请求重试 #${attempt}: ${err.message}`);
            }
          }
        );
      }
    };
    
    // 添加带缓存的方法
    const cachedComputation = memoize((id) => {
      // 复杂计算
      return computeData(id);
    });
    
    // 创建防抖函数
    const debouncedUpdate = debounce((data) => {
      updateData(data);
    }, 500);
    
    // 装饰应用
    app.decorate('myFeature', {
      getData: cachedComputation,
      updateData: debouncedUpdate,
      api: apiClient
    });
  }
};
```

### 4.3 函数式数据处理

```typescript
import { pipeAsync } from '@stratix/utils/function';
import { pick, camelizeKeys } from '@stratix/utils/object';
import { isNotEmpty } from '@stratix/utils/object';
import { formatDate } from '@stratix/utils/i18n';
import { withTimeout } from '@stratix/utils/async';

// 创建异步数据处理管道
const processUserData = pipeAsync(
  // 获取远程数据
  async (userId) => {
    const response = await withTimeout(
      fetch(`https://api.example.com/users/${userId}`),
      5000,
      '获取用户数据超时'
    );
    return await response.json();
  },
  
  // 选择需要的字段
  (data) => pick(data, ['id', 'name', 'email', 'role', 'createdAt']),
  
  // 转换为驼峰命名
  camelizeKeys,
  
  // 数据转换
  (user) => ({
    ...user,
    createdAt: formatDate(new Date(user.createdAt), 'zh-CN'),
    permissions: user.permissions?.filter(isNotEmpty) || [],
    isAdmin: user.role === 'admin'
  })
);

// 使用处理管道
const userData = await processUserData(123);
```

### 4.4 结合多个工具模块

```typescript
import { immutableUpdate } from '@stratix/utils/immutable';
import { asyncCache } from '@stratix/utils/performance';
import { isEmail, isStrongPassword } from '@stratix/utils/validator';
import { md5, generateRandomKey } from '@stratix/utils/crypto';
import { createContextUtils } from '@stratix/utils/context';

// 创建应用上下文
const appContext = {
  config: {
    apiUrl: 'https://api.example.com',
    defaultLocale: 'zh-CN'
  },
  state: {
    user: null,
    settings: {
      theme: 'light',
      notifications: true
    }
  }
};

// 创建上下文工具
const ctx = createContextUtils(appContext);

// 验证用户输入
function validateUserInput(data) {
  const errors = {};
  
  if (!isEmail(data.email)) {
    errors.email = '请输入有效的电子邮件地址';
  }
  
  if (!isStrongPassword(data.password, { minLength: 8 })) {
    errors.password = '密码必须至少8个字符，包含大小写字母、数字和特殊字符';
  }
  
  return { isValid: Object.keys(errors).length === 0, errors };
}

// 创建带缓存的API请求
const fetchUserData = asyncCache(
  async (userId) => {
    const response = await fetch(`${ctx.getValue('config').apiUrl}/users/${userId}`);
    if (!response.ok) throw new Error('Failed to fetch user data');
    return await response.json();
  },
  { ttl: 60000, maxSize: 100 }
);

// 更新应用状态
function updateUserTheme(theme) {
  // 不可变更新嵌套状态
  appContext.state = immutableUpdate(appContext.state, 'settings.theme', theme);
  
  // 使用md5哈希主题设置
  const themeHash = md5(`${theme}-${generateRandomKey(8)}`);
  console.log('Theme updated with hash:', themeHash);
  
  return appContext.state.settings.theme;
}
```

## 5. 总结

`@stratix/utils`模块为Stratix框架提供了丰富的工具函数，遵循函数式编程思想，为开发者提供高质量、易用的工具集。这些工具函数相互独立、无副作用，便于测试和组合使用，可显著提高开发效率和代码质量。

优化后的模块设计具有以下特点：

1. **更细粒度的模块划分**：通过更专业的领域划分，使工具函数更容易查找和使用
2. **增强的类型定义**：提供更精确的TypeScript类型定义，改善开发体验和类型安全
3. **丰富的功能覆盖**：从基础工具到高级功能，满足各种应用场景的需求
4. **不可变数据操作**：遵循函数式编程原则，提供安全的数据操作工具
5. **高性能考虑**：通过缓存、批处理等技术优化性能
6. **跨平台支持**：工具函数同时支持Node.js和浏览器环境
7. **国际化友好**：提供完善的国际化工具，支持多语言应用开发
8. **安全性增强**：提供加密、哈希等安全相关工具

通过合理使用这些工具函数，开发者可以编写更加简洁、健壮和易维护的代码。同时，模块化的设计使得工具函数可以独立使用，也可以集成到其他项目中，提高代码复用性和开发效率。 