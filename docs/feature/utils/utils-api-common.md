# Stratix 通用工具函数API (@stratix/utils/common)

本文档提供`@stratix/utils/common`模块的详细API参考。

## 目录

- [Stratix 通用工具函数API (@stratix/utils/common)](#stratix-通用工具函数api-stratixutilscommon)
  - [目录](#目录)
  - [ID生成相关函数](#id生成相关函数)
    - [isNil](#isnil)
    - [generateNumberId](#generatenumberid)
    - [generateUUId](#generateuuid)
    - [generateId](#generateid)
  - [安全执行函数](#安全执行函数)
    - [safeExecute](#safeexecute)
  - [类型守卫函数](#类型守卫函数)
    - [isNilOrEmpty](#isnilorempty)
    - [isPresent](#ispresent)
  - [状态检查函数](#状态检查函数)
    - [isProduction](#isproduction)
    - [isDevelopment](#isdevelopment)
    - [isTest](#istest)
  - [其他通用函数](#其他通用函数)
    - [noop](#noop)
    - [identity](#identity)

## ID生成相关函数

### isNil

检查值是否为null或undefined。

```typescript
function isNil(value: unknown): value is null | undefined
```

**参数：**
- `value: unknown` - 要检查的值

**返回值：**
- `boolean` - 如果值为null或undefined则返回true，否则返回false

**示例：**
```typescript
import { isNil } from '@stratix/utils/common';

isNil(null);      // true
isNil(undefined); // true
isNil(0);         // false
isNil('');        // false
```

### generateNumberId

生成数字格式的唯一ID。

```typescript
function generateNumberId(min?: number, max?: number): string
```

**参数：**
- `min?: number` - 最小长度，默认为4
- `max?: number` - 最大长度，默认为16

**返回值：**
- `string` - 生成的数字ID

**示例：**
```typescript
import { generateNumberId } from '@stratix/utils/common';

const id = generateNumberId(); // 例如: '38574291'
const shortId = generateNumberId(4, 6); // 长度在4-6之间的数字ID
```

### generateUUId

通过UUID生成唯一ID。

```typescript
function generateUUId(): string
```

**返回值：**
- `string` - 生成的UUID

**示例：**
```typescript
import { generateUUId } from '@stratix/utils/common';

const uuid = generateUUId(); // 例如: '550e8400-e29b-41d4-a716-446655440000'
```

### generateId

生成唯一ID。

```typescript
function generateId(): string
```

**返回值：**
- `string` - 生成的唯一ID

**示例：**
```typescript
import { generateId } from '@stratix/utils/common';

const id = generateId(); // 例如: 'f7ghs8j2k9'
```

## 安全执行函数

### safeExecute

安全执行函数，出错时返回默认值。

```typescript
function safeExecute<T, D = undefined>(
  fn: () => T,
  defaultValue?: D
): T | D
```

**参数：**
- `fn: () => T` - 要执行的函数
- `defaultValue?: D` - 默认值

**返回值：**
- `T | D` - 函数执行结果或默认值

**示例：**
```typescript
import { safeExecute } from '@stratix/utils/common';

// 安全解析JSON
const data = safeExecute(
  () => JSON.parse(jsonString),
  { error: true }
);

// 安全访问可能不存在的属性
const value = safeExecute(
  () => obj.nested.deeply.property,
  null
);
```

## 类型守卫函数

### isNilOrEmpty

检查值是否为null、undefined或空（空字符串、空数组、空对象）。

```typescript
function isNilOrEmpty(value: unknown): boolean
```

**参数：**
- `value: unknown` - 要检查的值

**返回值：**
- `boolean` - 如果值为null、undefined或空则返回true，否则返回false

**示例：**
```typescript
import { isNilOrEmpty } from '@stratix/utils/common';

isNilOrEmpty(null);       // true
isNilOrEmpty(undefined);  // true
isNilOrEmpty('');         // true
isNilOrEmpty([]);         // true
isNilOrEmpty({});         // true
isNilOrEmpty(0);          // false
isNilOrEmpty('text');     // false
```

### isPresent

检查值是否存在且非空。

```typescript
function isPresent(value: unknown): boolean
```

**参数：**
- `value: unknown` - 要检查的值

**返回值：**
- `boolean` - 如果值存在且非空则返回true，否则返回false

**示例：**
```typescript
import { isPresent } from '@stratix/utils/common';

isPresent('text');      // true
isPresent([1, 2, 3]);   // true
isPresent({ a: 1 });    // true
isPresent(null);        // false
isPresent(undefined);   // false
isPresent('');          // false
```

## 状态检查函数

### isProduction

检查当前是否为生产环境。

```typescript
function isProduction(): boolean
```

**返回值：**
- `boolean` - 如果当前是生产环境则返回true，否则返回false

**示例：**
```typescript
import { isProduction } from '@stratix/utils/common';

if (isProduction()) {
  // 生产环境逻辑
} else {
  // 开发环境逻辑
}
```

### isDevelopment

检查当前是否为开发环境。

```typescript
function isDevelopment(): boolean
```

**返回值：**
- `boolean` - 如果当前是开发环境则返回true，否则返回false

**示例：**
```typescript
import { isDevelopment } from '@stratix/utils/common';

if (isDevelopment()) {
  // 开发环境逻辑
  console.log('Debug info');
}
```

### isTest

检查当前是否为测试环境。

```typescript
function isTest(): boolean
```

**返回值：**
- `boolean` - 如果当前是测试环境则返回true，否则返回false

**示例：**
```typescript
import { isTest } from '@stratix/utils/common';

if (isTest()) {
  // 测试环境特定逻辑
}
```

## 其他通用函数

### noop

空函数，不执行任何操作。

```typescript
function noop(): void
```

**示例：**
```typescript
import { noop } from '@stratix/utils/common';

// 提供默认回调
function process(data, callback = noop) {
  // 处理数据
  callback();
}
```

### identity

返回输入值的函数。

```typescript
function identity<T>(value: T): T
```

**参数：**
- `value: T` - 输入值

**返回值：**
- `T` - 输入值

**示例：**
```typescript
import { identity } from '@stratix/utils/common';

const values = [0, '', false, null, undefined, 1, 'text'];
const filtered = values.filter(identity); // [1, 'text']
``` 