---
sidebar_position: 13
---

# 类型工具

:::note 模块说明
本模块已合并至common模块，所有类型检查函数请从@stratix/utils/common/guards导入，
所有类型转换函数请从@stratix/utils/common/type导入。
:::

## 类型检查函数

这些函数用于检查值的类型，帮助你在代码中进行类型安全判断。

### isNull

判断值是否为null。

```typescript
import { isNull } from '@stratix/utils/common/guards';

isNull(null);       // true
isNull(undefined);  // false
isNull(0);          // false
isNull('');         // false
```

### isUndefined

判断值是否为undefined。

```typescript
import { isUndefined } from '@stratix/utils/common/guards';

isUndefined(undefined);  // true
isUndefined(null);       // false
isUndefined(0);          // false
isUndefined('');         // false
```

### isNil

判断值是否为null或undefined。

```typescript
import { isNil } from '@stratix/utils/common/guards';

isNil(null);        // true
isNil(undefined);   // true
isNil(0);           // false
isNil('');          // false
```

### isString

判断值是否为字符串类型。

```typescript
import { isString } from '@stratix/utils/common/guards';

isString('hello');  // true
isString(123);      // false
isString(null);     // false
```

### isNumber

判断值是否为数字类型。

```typescript
import { isNumber } from '@stratix/utils/common/guards';

isNumber(123);      // true
isNumber(NaN);      // false (NaN不被视为有效数字)
isNumber('123');    // false
isNumber(null);     // false
```

### isBoolean

判断值是否为布尔类型。

```typescript
import { isBoolean } from '@stratix/utils/common/guards';

isBoolean(true);     // true
isBoolean(false);    // true
isBoolean(1);        // false
isBoolean('true');   // false
```

### isArray

判断值是否为数组。

```typescript
import { isArray } from '@stratix/utils/common/guards';

isArray([1, 2, 3]);  // true
isArray('array');    // false
isArray({});         // false
```

### isObject

判断值是否为对象。

```typescript
import { isObject } from '@stratix/utils/common/guards';

isObject({});            // true
isObject(new Date());    // true
isObject([]);            // false (数组在此函数中不视为对象)
isObject(null);          // false
```

### isPlainObject

判断值是否为纯对象（通过对象字面量或Object构造函数创建的对象）。

```typescript
import { isPlainObject } from '@stratix/utils/common/guards';

isPlainObject({});         // true
isPlainObject(new Object()); // true
isPlainObject([]);         // false
isPlainObject(new Date()); // false
```

### isFunction

判断值是否为函数。

```typescript
import { isFunction } from '@stratix/utils/common/guards';

isFunction(() => {});      // true
isFunction(function() {}); // true
isFunction(class Test {});  // true
isFunction({});            // false
```

### isDate

判断值是否为Date对象。

```typescript
import { isDate } from '@stratix/utils/common/guards';

isDate(new Date());   // true
isDate('2021-01-01'); // false
isDate(1609459200000); // false
```

### isRegExp

判断值是否为正则表达式对象。

```typescript
import { isRegExp } from '@stratix/utils/common/guards';

isRegExp(/hello/);         // true
isRegExp(new RegExp('hello')); // true
isRegExp('hello');         // false
```

### isError

判断值是否为Error对象。

```typescript
import { isError } from '@stratix/utils/common/guards';

isError(new Error('test'));       // true
isError(new TypeError('test'));   // true
isError({message: 'test'});       // false
```

### isPromise

判断值是否为Promise对象。

```typescript
import { isPromise } from '@stratix/utils/common/guards';

isPromise(Promise.resolve());             // true
isPromise(new Promise(resolve => resolve())); // true
isPromise({then: () => {}, catch: () => {}}); // true
isPromise({});                            // false
```

### getType

获取值的类型名称。

```typescript
import { getType } from '@stratix/utils/common/guards';

getType(null);           // 'null'
getType(undefined);      // 'undefined'
getType('hello');        // 'string'
getType(123);            // 'number'
getType(true);           // 'boolean'
getType([]);             // 'array'
getType({});             // 'object'
getType(() => {});       // 'function'
getType(new Date());     // 'date'
getType(/regex/);        // 'regexp'
```

### isInstanceOf

检查值是否为指定构造函数的实例。

```typescript
import { isInstanceOf } from '@stratix/utils/common/guards';

class Test {}
const test = new Test();

isInstanceOf(test, Test);       // true
isInstanceOf([1, 2, 3], Array); // true
isInstanceOf(new Date(), Date); // true
isInstanceOf({}, Object);       // true
```

### typeGuard

创建类型守卫函数，用于TypeScript类型推断。

```typescript
import { typeGuard } from '@stratix/utils/common/guards';

// 创建一个检查字符串类型的守卫
const isStringGuard = typeGuard<string>('string');

function processValue(value: unknown) {
  if (isStringGuard(value)) {
    // 此处value的类型已被推断为string
    return value.toUpperCase();
  }
  return String(value);
}
```

## 类型转换函数

这些函数用于将一个值转换为特定类型。

### toString

将值转换为字符串。

```typescript
import { toString } from '@stratix/utils/common/type';

toString(null);         // ''
toString(undefined);    // ''
toString(123);          // '123'
toString(true);         // 'true'
toString([1, 2, 3]);    // '1,2,3'
toString({});           // '[object Object]'
```

### toNumber

将值转换为数字。

```typescript
import { toNumber } from '@stratix/utils/common/type';

toNumber(null);           // 0
toNumber(undefined);      // NaN
toNumber('123');          // 123
toNumber('123.45');       // 123.45
toNumber('  123  ');      // 123 (会去除前后空格)
toNumber('abc');          // NaN
toNumber(true);           // 1
toNumber(false);          // 0
toNumber([]);             // 0
toNumber(['123']);        // 123
toNumber([1, 2]);         // NaN
```

### toInteger

将值转换为整数。

```typescript
import { toInteger } from '@stratix/utils/common/type';

toInteger(123.45);      // 123
toInteger('123.45');    // 123
toInteger(null);        // 0
toInteger(undefined);   // 0
toInteger('abc');       // 0
toInteger(true);        // 1
toInteger([123.45]);    // 123
```

### toBoolean

将值转换为布尔值。

```typescript
import { toBoolean } from '@stratix/utils/common/type';

toBoolean(1);           // true
toBoolean(0);           // false
toBoolean('');          // false
toBoolean('true');      // true
toBoolean('false');     // false (字符串'false'被特殊处理为false)
toBoolean([]);          // true
toBoolean({});          // true
toBoolean(null);        // false
toBoolean(undefined);   // false
```

### toArray

将值转换为数组。

```typescript
import { toArray } from '@stratix/utils/common/type';

toArray(null);            // []
toArray(undefined);       // []
toArray(123);             // [123]
toArray('hello');         // ['hello']
toArray([1, 2, 3]);       // [1, 2, 3] (保持原数组)
toArray(new Set([1, 2, 3])); // [1, 2, 3] (可迭代对象转为数组)
```

### toObject

将值转换为对象。

```typescript
import { toObject } from '@stratix/utils/common/type';

toObject(null);                    // {}
toObject({a: 1, b: 2});            // {a: 1, b: 2}
toObject([['a', 1], ['b', 2]]);    // {a: 1, b: 2}
toObject(new Map([['a', 1], ['b', 2]])); // {a: 1, b: 2}
toObject('abc');                   // {'0': 'a', '1': 'b', '2': 'c'}
toObject(123);                     // {value: 123}
```

### toDate

将值转换为Date对象。

```typescript
import { toDate } from '@stratix/utils/common/type';

toDate(new Date());                  // Date对象的副本
toDate('2021-01-01');                // Date(2021-01-01)
toDate(1609459200000);               // Date(2021-01-01)
toDate([2021, 0, 1]);                // Date(2021-01-01)
toDate([2021, 0, 1, 12, 30, 0, 0]);  // Date(2021-01-01T12:30:00)
toDate(null);                        // Invalid Date
``` 