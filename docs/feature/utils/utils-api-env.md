# @stratix/utils/env 环境变量工具函数文档

该模块提供了一系列用于处理环境变量的实用工具函数，帮助开发者安全地读取、验证和管理应用程序的环境配置。

## 目录

- [@stratix/utils/env 环境变量工具函数文档](#stratixutilsenv-环境变量工具函数文档)
  - [目录](#目录)
  - [函数](#函数)
    - [get](#get)
    - [getBoolean](#getboolean)
    - [getNumber](#getnumber)
    - [getArray](#getarray)
    - [getObject](#getobject)
    - [isDevelopment](#isdevelopment)
    - [isProduction](#isproduction)
    - [isTest](#istest)
    - [getNodeEnv](#getnodeenv)
    - [hasEnv](#hasenv)
    - [required](#required)
    - [load](#load)
    - [getAll](#getall)
    - [set](#set)

## 函数

### get

获取指定环境变量的值，支持默认值和自定义转换。

```typescript
function get(key: string, defaultValue?: string, transform?: (value: string) => any): string | any
```

**参数:**
- `key`: 环境变量名称
- `defaultValue`: 如果环境变量不存在时的默认值（可选）
- `transform`: 自定义转换函数，用于处理环境变量值（可选）

**返回值:**
- 环境变量的值（字符串或转换后的值）
- 如果环境变量不存在且未提供默认值，则返回`undefined`

**示例:**

```javascript
import { get } from '@stratix/utils/env';

// 基本使用
const apiUrl = get('API_URL'); // 返回 API_URL 环境变量的值或 undefined

// 使用默认值
const port = get('PORT', '3000'); // 如果 PORT 环境变量不存在，则返回 '3000'

// 使用转换函数
const apiTimeout = get('API_TIMEOUT', '5000', val => parseInt(val, 10));
// 返回 API_TIMEOUT 的整数值，如果不存在则返回 5000
```

### getBoolean

获取环境变量的布尔值。

```typescript
function getBoolean(key: string, defaultValue?: boolean): boolean
```

**参数:**
- `key`: 环境变量名称
- `defaultValue`: 如果环境变量不存在时的默认布尔值（可选）

**返回值:**
- 环境变量的布尔值
  - 'true', '1', 'yes' 被视为 `true`
  - 'false', '0', 'no' 被视为 `false`
- 如果环境变量不存在且未提供默认值，则返回`false`

**示例:**

```javascript
import { getBoolean } from '@stratix/utils/env';

// 假设 DEBUG=true
const isDebug = getBoolean('DEBUG'); // true

// 假设 CACHE_ENABLED 未设置
const isCacheEnabled = getBoolean('CACHE_ENABLED', true); // true (使用默认值)

// 假设 FEATURE_FLAG=0
const isFeatureFlagEnabled = getBoolean('FEATURE_FLAG'); // false
```

### getNumber

获取环境变量的数值。

```typescript
function getNumber(key: string, defaultValue?: number): number
```

**参数:**
- `key`: 环境变量名称
- `defaultValue`: 如果环境变量不存在或无法解析为数字时的默认值（可选）

**返回值:**
- 环境变量的数值
- 如果环境变量不存在或无法解析为数字，且未提供默认值，则返回`0`

**示例:**

```javascript
import { getNumber } from '@stratix/utils/env';

// 假设 PORT=3000
const port = getNumber('PORT'); // 3000

// 假设 MAX_CONNECTIONS 未设置
const maxConnections = getNumber('MAX_CONNECTIONS', 100); // 100 (使用默认值)

// 假设 TIMEOUT=invalid
const timeout = getNumber('TIMEOUT', 5000); // 5000 (因为无法解析，使用默认值)
```

### getArray

获取环境变量的数组值，通过分隔符分割字符串。

```typescript
function getArray(key: string, defaultValue?: string[], separator: string = ','): string[]
```

**参数:**
- `key`: 环境变量名称
- `defaultValue`: 如果环境变量不存在时的默认数组（可选）
- `separator`: 用于分割字符串的分隔符（默认为','）

**返回值:**
- 由环境变量值分割而成的字符串数组
- 如果环境变量不存在且未提供默认值，则返回空数组`[]`

**示例:**

```javascript
import { getArray } from '@stratix/utils/env';

// 假设 ALLOWED_ORIGINS=http://localhost:3000,https://example.com
const allowedOrigins = getArray('ALLOWED_ORIGINS');
// ['http://localhost:3000', 'https://example.com']

// 假设 TAGS 未设置
const tags = getArray('TAGS', ['default', 'fallback']);
// ['default', 'fallback'] (使用默认值)

// 使用不同的分隔符
// 假设 PATHS=/usr/local/bin:/usr/bin:/bin
const paths = getArray('PATHS', [], ':');
// ['/usr/local/bin', '/usr/bin', '/bin']
```

### getObject

获取环境变量的对象值，解析JSON字符串。

```typescript
function getObject<T>(key: string, defaultValue?: T): T
```

**参数:**
- `key`: 环境变量名称
- `defaultValue`: 如果环境变量不存在或无法解析为对象时的默认对象（可选）

**返回值:**
- 由环境变量JSON字符串解析而成的对象
- 如果环境变量不存在或无法解析，且提供了默认值，则返回默认值
- 如果环境变量不存在或无法解析，且未提供默认值，则返回空对象`{}`

**示例:**

```javascript
import { getObject } from '@stratix/utils/env';

// 假设 DATABASE_CONFIG={"host":"localhost","port":5432,"user":"admin"}
const dbConfig = getObject('DATABASE_CONFIG');
// { host: 'localhost', port: 5432, user: 'admin' }

// 假设 APP_SETTINGS 未设置
const appSettings = getObject('APP_SETTINGS', { theme: 'light', language: 'en' });
// { theme: 'light', language: 'en' } (使用默认值)

// 假设 INVALID_JSON=not-a-json
const invalidJsonValue = getObject('INVALID_JSON', { fallback: true });
// { fallback: true } (因为无法解析，使用默认值)
```

### isDevelopment

检查当前环境是否为开发环境。

```typescript
function isDevelopment(): boolean
```

**返回值:**
- 如果`NODE_ENV`为`'development'`则返回`true`，否则返回`false`

**示例:**

```javascript
import { isDevelopment } from '@stratix/utils/env';

// 假设 NODE_ENV=development
if (isDevelopment()) {
  console.log('正在开发环境中运行');
  // 执行开发环境特定的代码
}
```

### isProduction

检查当前环境是否为生产环境。

```typescript
function isProduction(): boolean
```

**返回值:**
- 如果`NODE_ENV`为`'production'`则返回`true`，否则返回`false`

**示例:**

```javascript
import { isProduction } from '@stratix/utils/env';

// 假设 NODE_ENV=production
if (isProduction()) {
  console.log('正在生产环境中运行');
  // 执行生产环境特定的代码
}
```

### isTest

检查当前环境是否为测试环境。

```typescript
function isTest(): boolean
```

**返回值:**
- 如果`NODE_ENV`为`'test'`则返回`true`，否则返回`false`

**示例:**

```javascript
import { isTest } from '@stratix/utils/env';

// 假设 NODE_ENV=test
if (isTest()) {
  console.log('正在测试环境中运行');
  // 执行测试环境特定的代码
}
```

### getNodeEnv

获取当前的NODE_ENV值。

```typescript
function getNodeEnv(): string
```

**返回值:**
- `NODE_ENV`环境变量的值
- 如果未设置，则返回`'development'`

**示例:**

```javascript
import { getNodeEnv } from '@stratix/utils/env';

const env = getNodeEnv();
console.log(`当前环境: ${env}`); // 例如: 当前环境: production
```

### hasEnv

检查是否存在指定的环境变量。

```typescript
function hasEnv(key: string): boolean
```

**参数:**
- `key`: 环境变量名称

**返回值:**
- 如果环境变量存在且不为空则返回`true`，否则返回`false`

**示例:**

```javascript
import { hasEnv } from '@stratix/utils/env';

// 检查是否存在必要的配置
if (!hasEnv('DATABASE_URL')) {
  throw new Error('缺少必要的环境变量：DATABASE_URL');
}
```

### required

获取必要的环境变量值，如果不存在则抛出错误。

```typescript
function required(key: string, message?: string): string
```

**参数:**
- `key`: 环境变量名称
- `message`: 自定义错误消息（可选）

**返回值:**
- 环境变量的值
- 如果环境变量不存在或为空，则抛出错误

**示例:**

```javascript
import { required } from '@stratix/utils/env';

try {
  // 获取必要的API密钥
  const apiKey = required('API_KEY', 'API密钥是必需的，请在.env文件中设置');
  
  // 继续使用apiKey
  initializeApi(apiKey);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
```

### load

从指定的.env文件加载环境变量。

```typescript
function load(options?: LoadOptions): void
```

**参数:**
- `options`: 加载选项（可选）
  - `path`: .env文件的路径（默认为项目根目录下的.env）
  - `override`: 是否覆盖已存在的环境变量（默认为false）
  - `silent`: 是否在出错时静默处理（默认为false）

**返回值:**
- 无返回值

**示例:**

```javascript
import { load } from '@stratix/utils/env';

// 基本使用，加载默认的.env文件
load();

// 加载指定路径的.env文件
load({ path: './config/.env.local' });

// 加载并覆盖已存在的环境变量
load({ override: true });

// 静默模式，不抛出错误
load({ silent: true });
```

### getAll

获取所有环境变量的副本。

```typescript
function getAll(): Record<string, string>
```

**返回值:**
- 包含所有环境变量的对象

**示例:**

```javascript
import { getAll } from '@stratix/utils/env';

// 获取所有环境变量
const allEnvVars = getAll();
console.log('所有环境变量:', allEnvVars);

// 过滤特定前缀的环境变量
const appEnvVars = Object.entries(allEnvVars)
  .filter(([key]) => key.startsWith('APP_'))
  .reduce((acc, [key, value]) => {
    acc[key] = value;
    return acc;
  }, {});

console.log('应用相关环境变量:', appEnvVars);
```

### set

临时设置环境变量（仅在运行时有效）。

```typescript
function set(key: string, value: string): void
```

**参数:**
- `key`: 环境变量名称
- `value`: 环境变量值

**返回值:**
- 无返回值

**示例:**

```javascript
import { set, get } from '@stratix/utils/env';

// 设置临时环境变量
set('TEMP_API_URL', 'https://api.example.com/v2');

// 验证设置是否成功
console.log(get('TEMP_API_URL')); // https://api.example.com/v2

// 注意: 这些更改只在当前进程中有效，不会影响实际的环境变量文件
``` 